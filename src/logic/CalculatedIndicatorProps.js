/**
 * Logic for constructing the properties panel entries for calculated indicators.
 */
import { isTextFieldEntryEdited, isSelectEntryEdited, SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { html } from 'htm/preact';
import { CustomTextField } from '../components/SustainabilityInputs';
import { buildMeasurementEntries } from './SharedMeasurementProps';
import { updateModdleProp } from '../utils/SustainabilityHelpers';

/**
 * Generates the necessary properties panel entries for a calculated indicator.
 */
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

    entries.push(...buildMeasurementEntries(
      element, 
      measurement, 
      varIdPrefix, 
      `Measurement Value for ${varId}`, 
      `Sensor ID for ${varId}`
    ));
  });

  return entries;
}

/**
 * Component to select the baseline formula for a calculated indicator.
 */
function FormulaSelect(props) {
  const { element, id, indicator, formulasList } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const bpmnFactory = useService('bpmnFactory');

  const getValue = () => indicator.get('formulaId') || '';
  
  const setValue = value => {
    if (!value) return updateModdleProp(modeling, element, indicator, { formulaId: '', formula: '', measurements: [] });

    const selectedFormula = formulasList.find(f => f.id === value);
    const newMeasurements = (selectedFormula?.variables || []).map(v => {
      const m = bpmnFactory.create('sust:Measurement', { variable: v.id || v, value: '' });
      m.$parent = indicator;
      return m;
    });

    updateModdleProp(modeling, element, indicator, { 
      formulaId: value, formula: selectedFormula?.expression || '', measurements: newMeasurements
    });
  };

  const getOptions = () => [
    { label: '< Select a formula >', value: '' },
    ...formulasList.map(f => ({ label: f.label, value: f.id }))
  ];

  return html`<${SelectEntry} id=${id} element=${element} label=${translate('Default Formula')} getValue=${getValue} setValue=${setValue} getOptions=${getOptions} />`;
}