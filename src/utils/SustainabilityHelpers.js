/** Core utilities for managing Moddle elements and evaluating sustainability data. */
import config from '../../indicatorsConfig.json';

/** Tracks nodes that have been interacted with for validation purposes. */
export const touchedNodes = new WeakSet();

/** Retrieves the global sustainability configuration. */
export function getConfig() {
  return config;
}

/** Extracts the SustainabilityData extension from a BPMN business object. */
export function getSustData(businessObject) {
  const extensions = businessObject.get('extensionElements');
  if (!extensions || !extensions.get('values')) return null;
  return extensions.get('values').find(v => v.$instanceOf('sust:SustainabilityData'));
}

/** Creates and attaches a new empty Indicator to the specified BPMN element. */
export function createIndicatorNode(element, bpmnFactory, modeling) {
  const businessObject = element.businessObject;
  let extensions = businessObject.get('extensionElements');

  if (!extensions) {
    extensions = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
    modeling.updateProperties(element, { extensionElements: extensions });
  }

  let sustData = getSustData(businessObject);
  if (!sustData) {
    sustData = bpmnFactory.create('sust:SustainabilityData', { indicators: [] });
    sustData.$parent = extensions;
    modeling.updateModdleProperties(element, extensions, {
      values: [...extensions.get('values'), sustData]
    });
  }

  const newIndicator = bpmnFactory.create('sust:Indicator', { 
    name: '', type: '', formulaId: '', formula: '', measurements: [] 
  });
  newIndicator.$parent = sustData;

  modeling.updateModdleProperties(element, sustData, {
    indicators: [...(sustData.get('indicators') || []), newIndicator]
  });

  return newIndicator;
}

/** Removes a specific Indicator and cleans up empty parent extension elements. */
export function removeIndicatorNode(element, indicator, modeling) {
  const sustData = getSustData(element.businessObject);
  if (!sustData) return;

  const newIndicators = (sustData.get('indicators') || []).filter(val => val !== indicator);
  modeling.updateModdleProperties(element, sustData, { indicators: newIndicators });

  if (newIndicators.length === 0) {
    const extensions = element.businessObject.get('extensionElements');
    const newExtValues = extensions.get('values').filter(v => v !== sustData);
    modeling.updateModdleProperties(element, extensions, { values: newExtValues });
  }
}

/** Validates that a sensor ID is provided once the input field is touched. */
export function validateSensorId(node, value) {
  if (value && value.trim() !== '') {
    touchedNodes.add(node);
  }
  if (touchedNodes.has(node) && (!value || value.trim() === '')) {
    return 'Sensor ID is required.';
  }
  return null;
}

/** Safely evaluates a mathematical formula using the provided variables map. */
export function evaluateFormula(formula, variablesMap) {
  if (!formula || formula.trim() === '') return 'No Formula';
  
  try {
    const jsSafeFormula = formula.replace(/\^/g, '**');
    const varNames = Object.keys(variablesMap);
    const varValues = Object.values(variablesMap).map(val => Number(val) || 0);

    const evaluator = new Function(...varNames, `return ${jsSafeFormula};`);
    const result = evaluator(...varValues);

    if (!Number.isFinite(result)) return 'Calc Err';
    return Number.isInteger(result) ? result.toString() : result.toFixed(2);
  } catch (err) {
    return 'Syntax Err';
  }
}

/** Calculates an aggregated value (AVG, SUM, MIN, MAX) from multiple measurements. */
export function calculateAggregation(measurements, strategy) {
  if (!measurements || measurements.length === 0) return 0;
  
  const values = measurements
    .map(m => parseFloat(m.get('value')))
    .filter(v => !isNaN(v));

  if (values.length === 0) return 0;

  switch (strategy) {
    case 'SUM': return values.reduce((a, b) => a + b, 0);
    case 'MAX': return Math.max(...values);
    case 'MIN': return Math.min(...values);
    case 'AVG': 
    default: return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

/** Extracts a numeric value from a measurement, automatically handling aggregations. */
export function extractMeasurementValue(measurement) {
  if (!measurement) return 0;
  
  if (measurement.get('type') === 'aggregation') {
    const strategy = measurement.get('formula') || 'AVG';
    const childSensors = measurement.get('measurements') || [];
    return calculateAggregation(childSensors, strategy);
  }
  
  return parseFloat(measurement.get('value')) || 0;
}

/** Checks if a given measurement or its aggregated children lack a required sensor ID. */
export function hasMissingSensorId(measurement) {
  if (!measurement) return true;
  
  if (measurement.get('type') === 'aggregation') {
    const childSensors = measurement.get('measurements') || [];
    if (childSensors.length === 0) return true;
    return childSensors.some(c => !c.get('dataSource') || c.get('dataSource').trim() === '');
  }
  
  return !measurement.get('dataSource') || measurement.get('dataSource').trim() === '';
}