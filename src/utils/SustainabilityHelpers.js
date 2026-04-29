/**
 * Utility functions for managing sustainability data, validating inputs, and executing formulas securely.
 */

import configJson from '../../indicatorsConfig.json'; // Ensure this path matches your project structure

/**
 * Retrieves the global configuration for sustainability indicators.
 */
export function getConfig() {
  return configJson;
}

/**
 * Retrieves the SustainabilityData extension element from a given business object.
 */
export function getSustData(businessObject) {
  const extensionElements = businessObject.get('extensionElements');
  if (!extensionElements || !extensionElements.get('values')) return null;
  return extensionElements.get('values').find(el => el.$type === 'sust:SustainabilityData');
}

/**
 * A centralized helper to update Moddle properties safely.
 */
export function updateModdleProp(modeling, element, node, properties) {
  modeling.updateModdleProperties(element, node, properties);
}

/**
 * Creates and attaches a new indicator node. Strictly enforces Moddle hierarchy to ensure XML saving.
 */
export function createIndicatorNode(element, bpmnFactory, modeling) {
  const businessObject = element.businessObject;
  let extensionElements = businessObject.get('extensionElements');

  // Step 1: Ensure ExtensionElements exists
  if (!extensionElements) {
    extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
    modeling.updateModdleProperties(element, businessObject, { extensionElements });
  }

  // Step 2: Ensure SustainabilityData exists inside ExtensionElements
  let sustData = getSustData(businessObject);
  
  if (!sustData) {
    sustData = bpmnFactory.create('sust:SustainabilityData', { indicators: [] });
    modeling.updateModdleProperties(element, extensionElements, {
      values: [...(extensionElements.get('values') || []), sustData]
    });
  }

  // Step 3: Create the Indicator and attach it
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

  const currentIndicators = sustData.get('indicators') || [];
  const updatedIndicators = currentIndicators.filter(ind => ind !== indicator);

  modeling.updateModdleProperties(element, sustData, { indicators: updatedIndicators });
}

/**
 * Validates that a sensor ID (data source) does not contain spaces.
 * Empty values are ignored here to prevent premature red errors in the UI.
 */
export function validateSensorId(measurement, value) {
  if (!value || value.trim() === '') {
    return null; // Don't show error immediately, rely on canvas warning ("Missing Sensor ID")
  }
  if (/\s/.test(value)) {
    return 'Sensor ID cannot contain spaces.';
  }
  return null;
}

/**
 * Checks if a measurement or any of its child aggregations are missing a sensor ID.
 */
export function hasMissingSensorId(measurement) {
  if (!measurement) return true;
  
  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    if (children.length === 0) return true;
    return children.some(child => !child.get('dataSource') || child.get('dataSource').trim() === '');
  }
  
  return !measurement.get('dataSource') || measurement.get('dataSource').trim() === '';
}

/**
 * Extracts a numeric value from a measurement, handling both flat and custom aggregated types.
 */
export function extractMeasurementValue(measurement) {
  if (!measurement) return 0;

  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    const strategy = measurement.get('formula') || 'AVG';
    
    // Fallback if no children exist
    if (children.length === 0) return 0;

    // Handle standard strategies
    if (['SUM', 'MIN', 'MAX', 'AVG'].includes(strategy)) {
      const values = children.map(c => parseFloat(c.get('value') || 0));
      switch (strategy) {
        case 'SUM': return values.reduce((a, b) => a + b, 0);
        case 'MIN': return Math.min(...values);
        case 'MAX': return Math.max(...values);
        case 'AVG': default: return values.reduce((a, b) => a + b, 0) / values.length;
      }
    } 
    
    // Handle CUSTOM formula strategy
    const varsMap = {};
    children.forEach(c => {
      const sourceId = c.get('dataSource');
      if (sourceId) {
        varsMap[sourceId] = parseFloat(c.get('value') || 0);
      }
    });

    const result = evaluateFormula(strategy, varsMap);
    return (result === 'Syntax Err' || result === 'Calc Err') ? 0 : parseFloat(result);
  }

  return parseFloat(measurement.get('value') || 0);
}

/**
 * Safely evaluates a mathematical formula string using a provided variables map.
 * Includes strict security checks to prevent arbitrary code execution (XSS).
 */
export function evaluateFormula(formula, varsMap) {
  if (!formula || formula.trim() === '') return 'Calc Err';

  // SECURITY CHECK 1: Only allow math characters, numbers, and letters for variable names.
  const allowedCharsPattern = /^[a-zA-Z0-9_.\s+\-*/()^]+$/;
  if (!allowedCharsPattern.test(formula)) {
    return 'Syntax Err';
  }

  // SECURITY CHECK 2: Extract all alphabetical words and ensure they exist in our varsMap.
  // This blocks injected functions like "alert()", "eval()", "window", etc.
  const wordsInFormula = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const validVars = Object.keys(varsMap);
  const hasInvalidWord = wordsInFormula.some(word => !validVars.includes(word));
  
  if (hasInvalidWord) {
    return 'Syntax Err';
  }

  try {
    const jsSafeFormula = formula.replace(/\^/g, '**');
    const varNames = Object.keys(varsMap);
    const varValues = Object.values(varsMap);

    const testFn = new Function(...varNames, `return ${jsSafeFormula};`);
    const result = testFn(...varValues);

    if (isNaN(result) || !isFinite(result)) {
      return 'Calc Err';
    }

    return Number.isInteger(result) ? result.toString() : result.toFixed(2);
  } catch (err) {
    return 'Syntax Err';
  }
}