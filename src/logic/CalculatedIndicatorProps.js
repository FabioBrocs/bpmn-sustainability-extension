import { isTextFieldEntryEdited, isSelectEntryEdited, SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { html } from 'htm/preact';
import { CustomTextField, AggregationModeToggle, AggregationStrategySelector, ChildSensorInput, AddChildSensorButton } from '../components/SustainabilityInputs';
import { validateSensorId } from '../utils/SustainabilityHelpers';

export default function CalculatedIndicatorProps(element, indicator, indicatorConfig, measurements, idPrefix) {
  const entries = [];
  const formulasList = indicatorConfig.formulas || [];
  const currentFormulaId = indicator.get('formulaId') || '';
  const selectedFormulaConfig = formulasList.find(f => f.id === currentFormulaId);

  entries.push({
    id: `${idPrefix}-formula-select`, element, indicator, component: FormulaSelect, formulasList, isEdited: isSelectEntryEdited
  });

  if (!selectedFormulaConfig) return entries;

  const validateFormula = (value) => {
    if (!value || value.trim() === '') return null; 
    try {
      const jsSafeFormula = value.replace(/\^/g, '**');
      const varNames = (selectedFormulaConfig.variables || []).map(v => v.id || v);
      const testFn = new Function(...varNames, `return ${jsSafeFormula};`);
      testFn(...varNames.map(() => 1)); 
      return null; 
    } catch (err) {
      return 'Syntax error or unauthorized variable.';
    }
  };

  entries.push({
    id: `${idPrefix}-formula-text`, element, node: indicator, propName: 'formula', label: 'Edit Formula Calculation', component: CustomTextField, validate: validateFormula, isEdited: isTextFieldEntryEdited
  });

  (selectedFormulaConfig.variables || []).forEach((varObj, varIndex) => {
    const measurement = measurements[varIndex];
    if (!measurement) return;

    const varId = varObj.id || varObj;
    const varLabel = varObj.unit ? `${varId} (${varObj.unit})` : varId;
    const varIdPrefix = `${idPrefix}-var-${varId}`;

    entries.push({
      id: `${varIdPrefix}-header`,
      component: () => html`<div style="margin-top: 15px; padding: 4px 8px; background: #f1f3f4; border-radius: 4px; border-left: 3px solid #28a745;"><span style="font-size: 11px; font-weight: bold; color: #202124;">VARIABLE: ${varLabel}</span></div>`
    });

    entries.push({ id: `${varIdPrefix}-mode-toggle`, element, measurement, component: AggregationModeToggle });

    if (measurement.get('type') === 'aggregation') {
      entries.push({ id: `${varIdPrefix}-strategy`, element, measurement, component: AggregationStrategySelector });
      (measurement.get('measurements') || []).forEach((childSensor, childIdx) => {
        entries.push({ id: `${varIdPrefix}-child-${childIdx}`, element, parentMeasurement: measurement, childSensor, component: ChildSensorInput });
      });
      entries.push({ id: `${varIdPrefix}-add-child`, element, measurement, component: AddChildSensorButton });
    } else {
      entries.push({ id: `${varIdPrefix}-value`, element, node: measurement, propName: 'value', label: `Measurement Value for ${varId}`, component: CustomTextField, isEdited: isTextFieldEntryEdited });
      entries.push({ id: `${varIdPrefix}-source`, element, node: measurement, propName: 'dataSource', label: `Sensor ID for ${varId}`, component: CustomTextField, validate: (value) => validateSensorId(measurement, value), isEdited: isTextFieldEntryEdited });
    }
  });

  return entries;
}

function FormulaSelect(props) {
  const { element, id, indicator, formulasList } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const bpmnFactory = useService('bpmnFactory');

  const getValue = () => indicator.get('formulaId') || '';
  
  const setValue = value => {
    if (!value) return modeling.updateModdleProperties(element, indicator, { formulaId: '', formula: '', measurements: [] });

    const selectedFormula = formulasList.find(f => f.id === value);
    const newMeasurements = (selectedFormula?.variables || []).map(v => {
      const m = bpmnFactory.create('sust:Measurement', { variable: v.id || v, value: '' });
      m.$parent = indicator;
      return m;
    });

    modeling.updateModdleProperties(element, indicator, { 
      formulaId: value, formula: selectedFormula?.expression || '', measurements: newMeasurements
    });
  };

  const getOptions = () => [
    { label: '< Select a formula >', value: '' },
    ...formulasList.map(f => ({ label: f.label, value: f.id }))
  ];

  return html`<${SelectEntry} id=${id} element=${element} label=${translate('Default Formula')} getValue=${getValue} setValue=${setValue} getOptions=${getOptions} />`;
}