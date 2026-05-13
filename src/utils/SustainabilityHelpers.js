/**
 * Utility functions for managing sustainability data, validating inputs, and executing formulas securely.
 */
import configJson from '../../indicatorsConfig.json';

const formulaCache = new Map();

export function getConfig() {
  return configJson;
}

export function getSustData(businessObject) {
  const extElements = businessObject.get('extensionElements');
  return extElements?.get('values')?.find(el => el.$type === 'sust:SustainabilityData') || null;
}

export function updateModdleProp(modeling, element, node, properties) {
  modeling.updateModdleProperties(element, node, properties);
}

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

  // FIXED: Prepend new indicator so it appears at the TOP of the properties panel
  const newIndicators = [newIndicator, ...(sustData.get('indicators') || [])];
  modeling.updateModdleProperties(element, sustData, { indicators: newIndicators });
}

export function removeIndicatorNode(element, indicator, modeling) {
  const sustData = getSustData(element.businessObject);
  if (!sustData) return;
  const updatedIndicators = (sustData.get('indicators') || []).filter(ind => ind !== indicator);
  modeling.updateModdleProperties(element, sustData, { indicators: updatedIndicators });
}

export function getAllSensorIds(element) {
  const sustData = getSustData(element?.businessObject);
  if (!sustData) return [];
  const ids = new Set();
  
  (sustData.get('indicators') || []).forEach(ind => {
    if (ind.get('type') !== 'calculated') {
      (ind.get('measurements') || []).forEach(m => {
        if (m.get('type') === 'aggregation') {
          if (m.get('dataSource') && m.get('dataSource').trim() !== '') ids.add(m.get('dataSource'));
          (m.get('measurements') || []).forEach(child => {
            if (child.get('dataSource') && child.get('dataSource').trim() !== '') ids.add(child.get('dataSource'));
          });
        } else {
          if (m.get('dataSource') && m.get('dataSource').trim() !== '') ids.add(m.get('dataSource'));
        }
      });
    }
  });
  return Array.from(ids);
}

export function syncSensorIdRename(modeling, element, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  const sustData = getSustData(element?.businessObject);
  if (!sustData) return;

  (sustData.get('indicators') || []).forEach(ind => {
    if (ind.get('type') === 'calculated') {
      (ind.get('measurements') || []).forEach(m => {
        if (m.get('dataSource') === oldId) {
          modeling.updateModdleProperties(element, m, { dataSource: newId });
        }
      });
    }
  });
}

export function syncCalculatedValues(modeling, element) {
  const sustData = getSustData(element?.businessObject);
  if (!sustData) return;

  const valueMap = {};
  (sustData.get('indicators') || []).forEach(ind => {
    if (ind.get('type') !== 'calculated') {
      (ind.get('measurements') || []).forEach(m => {
        if (m.get('type') === 'aggregation') {
          const aggId = m.get('dataSource');
          if (aggId && aggId.trim() !== '') valueMap[aggId] = extractMeasurementValue(m);
          
          (m.get('measurements') || []).forEach(child => {
            const childId = child.get('dataSource');
            if (childId && childId.trim() !== '') valueMap[childId] = extractMeasurementValue(child);
          });
        } else {
          const mId = m.get('dataSource');
          if (mId && mId.trim() !== '') valueMap[mId] = extractMeasurementValue(m);
        }
      });
    }
  });

  (sustData.get('indicators') || []).forEach(ind => {
    if (ind.get('type') === 'calculated') {
      (ind.get('measurements') || []).forEach(m => {
        const mId = m.get('dataSource');
        if (mId && valueMap.hasOwnProperty(mId)) {
          const newValue = String(valueMap[mId]);
          if (m.get('value') !== newValue) {
            modeling.updateModdleProperties(element, m, { value: newValue });
          }
        }
      });
    }
  });
}

export function validateSensorId(element, measurement, value) {
  if (!value || value.trim() === '') return null;
  if (/\s/.test(value)) return 'Sensor ID cannot contain spaces.';

  const sustData = getSustData(element?.businessObject);
  if (!sustData) return null;

  let duplicateFound = false;
  (sustData.get('indicators') || []).forEach(ind => {
    if (ind.get('type') !== 'calculated') {
      (ind.get('measurements') || []).forEach(m => {
        if (m.get('type') === 'aggregation') {
          if (m.get('dataSource') === value && m !== measurement) duplicateFound = true;
          (m.get('measurements') || []).forEach(child => {
            if (child.get('dataSource') === value && child !== measurement) duplicateFound = true;
          });
        } else {
          if (m.get('dataSource') === value && m !== measurement) duplicateFound = true;
        }
      });
    }
  });

  if (duplicateFound) return 'ID already exists!';
  return null;
}

export function hasMissingSensorId(measurement) {
  if (!measurement) return true;
  if (measurement.get('type') === 'aggregation') {
    const children = measurement.get('measurements') || [];
    return children.length === 0 || children.some(child => !child.get('dataSource')?.trim());
  }
  return !measurement.get('dataSource')?.trim();
}

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