/**
 * Utility functions for managing sustainability data, validating inputs, and executing formulas securely.
 */

import configJson from '../../indicatorsConfig.json'; // Ensure this path matches your project structure

// Cache to store pre-compiled math functions to avoid huge CPU overhead during real-time IoT updates.
const formulaCache = new Map();

/**
 * Retrieves the global configuration for sustainability indicators.
 * 
 * @returns {Object} The parsed indicators configuration.
 */
export function getConfig() {
  return configJson;
}

/**
 * Retrieves the SustainabilityData extension element from a given business object.
 * 
 * @param {Object} businessObject - The Moddle business object of the element.
 * @returns {Object|null} The SustainabilityData element or null if not found.
 */
export function getSustData(businessObject) {
  const extElements = businessObject.get('extensionElements');
  return extElements?.get('values')?.find(el => el.$type === 'sust:SustainabilityData') || null;
}

/**
 * A centralized helper to safely update Moddle properties.
 */
export function updateModdleProp(modeling, element, node, properties) {
  modeling.updateModdleProperties(element, node, properties);
}

/**
 * Creates and attaches a new indicator node, ensuring the required Moddle hierarchy exists.
 */
export function createIndicatorNode(element, bpmnFactory, modeling) {
  const businessObject = element.businessObject;
  let extensionElements = businessObject.get('extensionElements');

  if (!extensionElements) {
    extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
    modeling.updateModdleProperties(element, businessObject, { extensionElements });
  }

  let sustData = getSustData(businessObject);
  if (!sustData) {
    sustData = bpmnFactory.create('sust:SustainabilityData', { indicators: [] });
    modeling.updateModdleProperties(element, extensionElements, {
      values: [...(extensionElements.get('values') || []), sustData]
    });
  }

  const newIndicator = bpmnFactory.create('sust:Indicator', {
    name: '', type: '', formulaId: '', formula: '', measurements: []
  });

  modeling.updateModdleProperties(element, sustData, { 
    indicators: [...(sustData.get('indicators') || []), newIndicator] 
  });
}

/**
 * Removes a specific indicator node from the element.
 */
export function removeIndicatorNode(element, indicator, modeling) {
  const sustData = getSustData(element.businessObject);
  if (!sustData) return;

  const updatedIndicators = (sustData.get('indicators') || []).filter(ind => ind !== indicator);
  modeling.updateModdleProperties(element, sustData, { indicators: updatedIndicators });
}

/**
 * Validates that a sensor ID (data source) does not contain spaces.
 * 
 * @param {Object} measurement - The Moddle measurement node.
 * @param {string} value - The entered sensor ID.
 * @returns {string|null} An error message string, or null if valid.
 */
export function validateSensorId(measurement, value) {
  if (!value || value.trim() === '') return null; // Postpone validation to canvas rendering
  if (/\s/.test(value)) return 'Sensor ID cannot contain spaces.';
  return null;
}

/**
 * Checks if a measurement or any of its child aggregations are missing a sensor ID.
 * 
 * @param {Object} measurement - The measurement node to inspect.
 * @returns {boolean} True if a sensor ID is missing, false otherwise.
 */
export function hasMissingSensorId(measurement) {
  if (!measurement) return true;
  
  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    if (children.length === 0) return true;
    return children.some(child => !child.get('dataSource')?.trim());
  }
  
  return !measurement.get('dataSource')?.trim();
}

/**
 * Extracts and computes a numeric value from a measurement node, 
 * automatically resolving flat values or N-child standard/custom aggregations.
 * 
 * @param {Object} measurement - The measurement node.
 * @returns {number} The calculated value.
 */
export function extractMeasurementValue(measurement) {
  if (!measurement) return 0;

  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    if (children.length === 0) return 0;

    const strategy = measurement.get('formula') || 'AVG';
    
    // Process standard aggregation strategies
    if (['SUM', 'MIN', 'MAX', 'AVG'].includes(strategy)) {
      const values = children.map(c => parseFloat(c.get('value') || 0));
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      
      switch (strategy) {
        case 'SUM': return sum;
        case 'MIN': return Math.min(...values);
        case 'MAX': return Math.max(...values);
        case 'AVG': return sum / values.length;
      }
    } 
    
    // Process CUSTOM formula strategy
    const varsMap = {};
    children.forEach(c => {
      const sourceId = c.get('dataSource');
      if (sourceId) varsMap[sourceId] = parseFloat(c.get('value') || 0);
    });

    const result = evaluateFormula(strategy, varsMap);
    return (result === 'Syntax Err' || result === 'Calc Err') ? 0 : parseFloat(result);
  }

  return parseFloat(measurement.get('value') || 0);
}

/**
 * Safely evaluates a mathematical formula string using a provided variables map.
 * Utilizes memoization to cache compiled functions for high-performance IoT real-time updates.
 * 
 * @param {string} formula - The mathematical expression (e.g., "A + B / 2").
 * @param {Object} varsMap - A dictionary mapping variable names to numeric values.
 * @returns {string|number} The formatted result or an error code.
 */
export function evaluateFormula(formula, varsMap) {
  if (!formula || !formula.trim()) return 'Calc Err';

  // SECURITY CHECK 1: Only math characters, numbers, and basic string variables allowed.
  if (!/^[a-zA-Z0-9_.\s+\-*/()^]+$/.test(formula)) return 'Syntax Err';

  const validVars = Object.keys(varsMap);
  
  // SECURITY CHECK 2: Validate that all text words are explicitly defined in varsMap.
  // This blocks global functions like "alert" or "process".
  const wordsInFormula = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  if (wordsInFormula.some(word => !validVars.includes(word))) return 'Syntax Err';

  // Generate a unique cache signature for this formula and variable set
  const varNamesSorted = validVars.slice().sort();
  const cacheKey = `${formula}_${varNamesSorted.join(',')}`;

  try {
    let fn = formulaCache.get(cacheKey);

    // Compile and cache the function only if it hasn't been compiled before
    if (!fn) {
      const jsSafeFormula = formula.replace(/\^/g, '**');
      fn = new Function(...varNamesSorted, `return ${jsSafeFormula};`);
      formulaCache.set(cacheKey, fn);
    }

    // Execute the cached function passing the values in the exact sorted order
    const varValues = varNamesSorted.map(v => varsMap[v]);
    const result = fn(...varValues);

    if (!Number.isFinite(result)) return 'Calc Err';
    return Number.isInteger(result) ? result.toString() : result.toFixed(2);
  } catch (err) {
    return 'Syntax Err';
  }
}