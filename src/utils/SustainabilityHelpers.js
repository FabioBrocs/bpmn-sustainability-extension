/**
 * Utility functions for managing sustainability data, validating inputs, and executing formulas securely.
 */
import configJson from '../../indicatorsConfig.json';

const formulaCache = new Map();

/** Retrieves the global configuration for sustainability indicators. */
export function getConfig() {
  return configJson;
}

/** Retrieves the SustainabilityData extension element from a given business object. */
export function getSustData(businessObject) {
  const extElements = businessObject.get('extensionElements');
  return extElements?.get('values')?.find(el => el.$type === 'sust:SustainabilityData') || null;
}

/** Safely updates Moddle properties using the command stack for proper Undo/Redo support. */
export function updateModdleProp(modeling, element, node, properties) {
  modeling.updateModdleProperties(element, node, properties);
}

/** Creates and attaches a new indicator node, ensuring full command stack compliance. */
export function createIndicatorNode(element, bpmnFactory, modeling) {
  const bo = element.businessObject;
  let extElements = bo.get('extensionElements');

  if (!extElements) {
    extElements = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
    modeling.updateModdleProperties(element, bo, { extensionElements: extElements });
  }

  let sustData = getSustData(bo);
  if (!sustData) {
    sustData = bpmnFactory.create('sust:SustainabilityData', { indicators: [] });
    const newValues = [...(extElements.get('values') || []), sustData];
    modeling.updateModdleProperties(element, extElements, { values: newValues });
  }

  const newIndicator = bpmnFactory.create('sust:Indicator', {
    name: '', type: '', formulaId: '', formula: '', measurements: []
  });

  const newIndicators = [...(sustData.get('indicators') || []), newIndicator];
  modeling.updateModdleProperties(element, sustData, { indicators: newIndicators });
}

/** Removes a specific indicator node from the element, preserving undo history. */
export function removeIndicatorNode(element, indicator, modeling) {
  const sustData = getSustData(element.businessObject);
  if (!sustData) return;
  const updatedIndicators = (sustData.get('indicators') || []).filter(ind => ind !== indicator);
  modeling.updateModdleProperties(element, sustData, { indicators: updatedIndicators });
}

/** Validates that a sensor ID does not contain spaces. */
export function validateSensorId(measurement, value) {
  return (value && /\s/.test(value)) ? 'Sensor ID cannot contain spaces.' : null;
}

/** Checks if a measurement or its children are missing a sensor ID. */
export function hasMissingSensorId(measurement) {
  if (!measurement) return true;
  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    return children.length === 0 || children.some(child => !child.get('dataSource')?.trim());
  }
  return !measurement.get('dataSource')?.trim();
}

/** Extracts and computes a numeric value from a measurement node. */
export function extractMeasurementValue(measurement) {
  if (!measurement) return 0;
  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    if (children.length === 0) return 0;

    const strategy = measurement.get('formula') || 'AVG';
    if (['SUM', 'MIN', 'MAX', 'AVG'].includes(strategy)) {
      const values = children.map(c => parseFloat(c.get('value') || 0));
      const sum = values.reduce((a, b) => a + b, 0);
      const aggregations = { SUM: sum, MIN: Math.min(...values), MAX: Math.max(...values), AVG: sum / values.length };
      return aggregations[strategy];
    }

    const varsMap = Object.fromEntries(children.map(c => [c.get('dataSource'), parseFloat(c.get('value') || 0)]));
    const result = evaluateFormula(strategy, varsMap);
    return isNaN(result) ? 0 : parseFloat(result);
  }
  return parseFloat(measurement.get('value') || 0);
}

/** Safely evaluates a mathematical formula string using a sanitized environment and caching. */
export function evaluateFormula(formula, varsMap) {
  if (!formula || !formula.trim()) return 'Calc Err';
  if (!/^[a-zA-Z0-9_.\s+\-*/()^]+$/.test(formula)) return 'Syntax Err';

  const validVars = Object.keys(varsMap);
  const wordsInFormula = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  if (wordsInFormula.some(word => !validVars.includes(word))) return 'Syntax Err';

  const varNamesSorted = validVars.slice().sort();
  const cacheKey = `${formula}_${varNamesSorted.join(',')}`;

  try {
    let fn = formulaCache.get(cacheKey);
    if (!fn) {
      const jsSafeFormula = formula.replace(/\^/g, '**');
      fn = new Function(...varNamesSorted, `"use strict"; return Number(${jsSafeFormula});`);
      formulaCache.set(cacheKey, fn);
    }

    const varValues = varNamesSorted.map(v => varsMap[v]);
    const result = fn(...varValues);

    if (!Number.isFinite(result)) return 'Calc Err';
    return Number.isInteger(result) ? result.toString() : result.toFixed(2);
  } catch (err) {
    return 'Syntax Err';
  }
}