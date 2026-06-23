/**
 * Preact UI components for adding and selecting indicators and values.
 */
import { html } from 'htm/preact';
import { SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { getConfig, getValuesConfig, createIndicatorNode, updateModdleProp } from '../utils/SustainabilityHelpers';

/**
 * Renders the button to add a new sustainability indicator.
 */
export function AddIndicatorButton(props) {
  const { element } = props;
  const modeling = useService('modeling');
  const bpmnFactory = useService('bpmnFactory');

  return html`
    <div style="padding: 10px 0;">
      <button onClick=${() => createIndicatorNode(element, bpmnFactory, modeling)} style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(40,167,69,0.2);">
        + Add Indicator
      </button>
    </div>
  `;
}

/**
 * Renders the dropdown to select the Value Category, automatically binding dimensions.
 */
export function IndicatorValueSelect(props) {
  const { element, id, indicator } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const valuesConfig = getValuesConfig();

  const getValue = () => indicator.get('valueCategory') || '';
  
  const setValue = value => {
    if (!value) {
      return updateModdleProp(modeling, element, indicator, { valueCategory: '', dimensions: '', name: '', type: '', formulaId: '', formula: '', measurements: [] });
    }

    const safeValues = valuesConfig?.values || [];
    const selectedValueConfig = safeValues.find(v => v.id === value);
    const dimensionsStr = selectedValueConfig && selectedValueConfig.dimensions ? selectedValueConfig.dimensions.join(', ') : '';

    updateModdleProp(modeling, element, indicator, { 
      valueCategory: value, 
      dimensions: dimensionsStr,
      name: '', type: '', formulaId: '', formula: '', measurements: []
    });
  };

  const getOptions = () => {
    const safeValues = valuesConfig?.values || [];
    return [
      { label: '< Select a Value >', value: '' },
      ...safeValues.map(val => ({ label: val.label, value: val.id }))
    ];
  };

  return html`<${SelectEntry} id=${id} element=${element} label=${translate('Target Value')} getValue=${getValue} setValue=${setValue} getOptions=${getOptions} />`;
}

/**
 * Renders the dropdown to select the type/name of the indicator, filtered by the chosen Value.
 */
export function IndicatorNameSelect(props) {
  const { element, id, indicator } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const bpmnFactory = useService('bpmnFactory');
  
  const config = getConfig();
  const valuesConfig = getValuesConfig();

  const currentValueCategory = indicator.get('valueCategory');
  
  const getValue = () => indicator.get('name') || '';
  
  const setValue = value => {
    if (!value) {
      return updateModdleProp(modeling, element, indicator, { name: '', type: '', formulaId: '', formula: '', measurements: [] });
    }

    const selectedConfig = config.indicators.find(ind => ind.id === value);
    let newMeasurements = [];
    
    if (selectedConfig?.type !== 'calculated') {
      const defaultUnit = selectedConfig?.allowedUnits?.[0]?.value || '';
      newMeasurements = [bpmnFactory.create('sust:Measurement', { value: '', unit: defaultUnit })];
      newMeasurements[0].$parent = indicator;
    }

    updateModdleProp(modeling, element, indicator, { 
      name: value, type: selectedConfig?.type || 'raw', formulaId: '', formula: '', measurements: newMeasurements
    });
  };

  const getOptions = () => {
    if (!currentValueCategory) {
      return [{ label: '< Select a Value first >', value: '' }];
    }

    const valueConfig = valuesConfig.values.find(v => v.id === currentValueCategory);
    let filteredIndicators = [];

    if (valueConfig && valueConfig.indicators && valueConfig.indicators.length > 0) {
      filteredIndicators = config.indicators.filter(ind => valueConfig.indicators.includes(ind.id));
    } else {
      const assignedIndicatorIds = valuesConfig.values.flatMap(v => v.indicators || []);
      filteredIndicators = config.indicators.filter(ind => !assignedIndicatorIds.includes(ind.id));
    }

    return [
      { label: '< Select an indicator >', value: '' },
      ...filteredIndicators.map(ind => ({ label: ind.label, value: ind.id }))
    ];
  };

  return html`<${SelectEntry} id=${id} element=${element} label=${translate('Indicator Metric')} getValue=${getValue} setValue=${setValue} getOptions=${getOptions} />`;
}