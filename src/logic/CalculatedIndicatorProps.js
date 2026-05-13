import { isTextFieldEntryEdited, isSelectEntryEdited, SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { html } from 'htm/preact';
import { CustomTextField, CalculatedVariableInput } from '../components/SustainabilityInputs';
import { updateModdleProp, extractMeasurementValue, evaluateFormula } from '../utils/SustainabilityHelpers';

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

  entries.push({
    id: `${idPrefix}-calc-val-display`,
    component: () => {
      const currentFormula = indicator.get('formula') || selectedFormulaConfig.expression || '';
      const varsMap = {};
      (selectedFormulaConfig.variables || []).forEach((varObj, i) => {
        varsMap[varObj.id || varObj] = extractMeasurementValue(measurements[i]);
      });
      const computedVal = evaluateFormula(currentFormula, varsMap);
      
      return html`
        <div class="bio-properties-panel-entry">
          <label class="bio-properties-panel-label" style="color: #28a745;">Computed Formula Result</label>
          <div style="padding: 6px 10px; background: #f1f8f5; border: 1px dashed #28a745; border-radius: 4px; font-size: 13px; font-weight: bold; color: #155724; margin-top: 4px; margin-bottom: 12px;">
            ${computedVal}
          </div>
        </div>
      `;
    }
  });

  (selectedFormulaConfig.variables || []).forEach((varObj, varIndex) => {
    const measurement = measurements[varIndex];
    if (!measurement) return;

    const varId = varObj.id || varObj;
    const varLabel = varObj.unit ? `${varId} (${varObj.unit})` : varId;
    const varIdPrefix = `${idPrefix}-var-${varId}`;

    // Le variabili ora sono compatte, con il nome passato direttamente come "label" 
    entries.push({
      id: `${varIdPrefix}-source`,
      element,
      node: measurement,
      label: `Variable: ${varLabel}`,
      component: CalculatedVariableInput
    });
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