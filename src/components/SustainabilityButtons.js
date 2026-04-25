import { html } from 'htm/preact';
import { SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { getConfig, createIndicatorNode, removeIndicatorNode } from '../utils/SustainabilityHelpers';

export function AddIndicatorButton(props) {
  const { element } = props;
  const modeling = useService('modeling');
  const bpmnFactory = useService('bpmnFactory');

  return html`
    <div style="padding: 10px 0;">
      <button onClick=${() => createIndicatorNode(element, bpmnFactory, modeling)} style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        + Add Indicator
      </button>
    </div>
  `;
}

export function RemoveIndicatorButton(props) {
  const { element, indicator } = props;
  const modeling = useService('modeling');

  return html`
    <div style="text-align: right; margin-top: 5px; padding-bottom: 5px;">
      <button onClick=${() => removeIndicatorNode(element, indicator, modeling)} style="background: none; border: none; color: #dc3545; font-size: 12px; cursor: pointer; text-decoration: underline;">
        Remove Indicator
      </button>
    </div>
  `;
}

export function IndicatorNameSelect(props) {
  const { element, id, indicator } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const bpmnFactory = useService('bpmnFactory');
  const config = getConfig();

  const getValue = () => indicator.get('name') || '';
  
  const setValue = value => {
    if (!value) {
      return modeling.updateModdleProperties(element, indicator, { name: '', type: '', formulaId: '', formula: '', measurements: [] });
    }

    const selectedConfig = config.indicators.find(ind => ind.id === value);
    let newMeasurements = [];
    
    if (selectedConfig?.type !== 'calculated') {
      const defaultUnit = selectedConfig?.allowedUnits?.[0]?.value || '';
      newMeasurements = [bpmnFactory.create('sust:Measurement', { value: '', unit: defaultUnit })];
      newMeasurements[0].$parent = indicator;
    }

    modeling.updateModdleProperties(element, indicator, { 
      name: value, type: selectedConfig?.type || 'raw', formulaId: '', formula: '', measurements: newMeasurements
    });
  };

  const getOptions = () => [
    { label: '< Select an indicator >', value: '' },
    ...config.indicators.map(ind => ({ label: ind.label, value: ind.id }))
  ];

  return html`<${SelectEntry} id=${id} element=${element} label=${translate('Indicator')} getValue=${getValue} setValue=${setValue} getOptions=${getOptions} />`;
}