/** Preact UI components for inputs and toggles inside the properties panel. */
import { html } from 'htm/preact';
import { TextFieldEntry, SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { getConfig, validateSensorId } from '../utils/SustainabilityHelpers';

/** Renders a standard text field bound to a specific Moddle property. */
export function CustomTextField(props) {
  const { element, id, node, propName, label, validate } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => node.get(propName) || '';
  const setValue = value => modeling.updateModdleProperties(element, node, { [propName]: value });

  return html`<${TextFieldEntry} 
    id=${id} element=${element} label=${translate(label)} 
    getValue=${getValue} setValue=${setValue} 
    debounce=${debounce} validate=${validate} 
  />`;
}

/** Renders a dropdown to select the measurement unit based on the indicator config. */
export function MeasurementUnitSelect(props) {
  const { element, id, indicator, measurement } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const config = getConfig();

  const currentIndicatorId = indicator.get('name') || '';
  const currentConfig = config.indicators.find(ind => ind.id === currentIndicatorId);

  const getValue = () => {
    const defaultUnit = currentConfig?.allowedUnits?.[0]?.value || '';
    return measurement.get('unit') || defaultUnit;
  };
  
  const setValue = value => modeling.updateModdleProperties(element, measurement, { unit: value });
  const getOptions = () => currentConfig?.allowedUnits || [];

  return html`<${SelectEntry} 
    id=${id} element=${element} label=${translate('Unit')} 
    getValue=${getValue} setValue=${setValue} getOptions=${getOptions} 
  />`;
}

/** Renders a UI toggle switch to enable or disable 1-to-N sensor aggregation. */
export function AggregationModeToggle(props) {
  const { element, id, measurement } = props;
  const modeling = useService('modeling');
  const bpmnFactory = useService('bpmnFactory');

  const isAggregation = measurement.get('type') === 'aggregation';

  const toggleMode = () => {
    if (isAggregation) {
      modeling.updateModdleProperties(element, measurement, {
        type: '', formula: '', measurements: []
      });
    } else {
      const childSensor = bpmnFactory.create('sust:Measurement', { value: '' });
      childSensor.$parent = measurement;
      modeling.updateModdleProperties(element, measurement, {
        type: 'aggregation', formula: 'AVG', value: '', measurements: [childSensor]
      });
    }
  };

  return html`
    <div class="bio-properties-panel-entry" data-entry-id=${id} style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
      <label class="bio-properties-panel-label" style="margin: 0; cursor: pointer; font-size: 13px; font-weight: bold;" onClick=${toggleMode}>
        Sensor Aggregation (1-N)
      </label>
      <div onClick=${toggleMode} style="width: 36px; height: 20px; background: ${isAggregation ? '#28a745' : '#ccc'}; border-radius: 10px; position: relative; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0;">
        <div style="width: 16px; height: 16px; background: white; border-radius: 50%; position: absolute; top: 2px; left: ${isAggregation ? '18px' : '2px'}; transition: left 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
      </div>
    </div>
  `;
}

/** Renders a selector for choosing the aggregation strategy (AVG, SUM, MIN, MAX). */
export function AggregationStrategySelector(props) {
  const { element, id, measurement } = props;
  const modeling = useService('modeling');

  const strategies = ['AVG', 'SUM', 'MIN', 'MAX'];
  const currentStrategy = measurement.get('formula') || 'AVG';

  const setStrategy = (strat) => modeling.updateModdleProperties(element, measurement, { formula: strat });

  return html`
    <div class="bio-properties-panel-entry" data-entry-id=${id}>
      <label class="bio-properties-panel-label">Aggregation Strategy</label>
      <div style="display: flex; background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-top: 5px;">
        ${strategies.map(strat => html`
          <div onClick=${() => setStrategy(strat)}
            style="flex: 1; text-align: center; padding: 6px 0; font-size: 12px; cursor: pointer; font-weight: ${currentStrategy === strat ? 'bold' : 'normal'}; background: ${currentStrategy === strat ? '#28a745' : 'transparent'}; color: ${currentStrategy === strat ? 'white' : '#555'}; border-right: 1px solid #ddd; transition: all 0.2s ease;">
            ${strat}
          </div>
        `)}
      </div>
    </div>
  `;
}

/** Renders a row containing value and ID inputs for a single child sensor. */
export function ChildSensorInput(props) {
  const { element, id, parentMeasurement, childSensor } = props;
  const modeling = useService('modeling');

  const getValue = () => childSensor.get('value') || '';
  const rawSource = childSensor.get('dataSource') || '';
  const errorMessage = validateSensorId(childSensor, rawSource);
  const hasError = errorMessage !== null;

  const onValueInput = (e) => modeling.updateModdleProperties(element, childSensor, { value: e.target.value });
  const onSourceInput = (e) => modeling.updateModdleProperties(element, childSensor, { dataSource: e.target.value });
  
  const onRemove = () => {
    const currentChildren = parentMeasurement.get('measurements') || [];
    const newChildren = currentChildren.filter(c => c !== childSensor);
    modeling.updateModdleProperties(element, parentMeasurement, { measurements: newChildren });
  };

  return html`
    <div class="bio-properties-panel-entry" data-entry-id=${id} style="margin-top: 8px; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 4px;">
        <div style="background: #e9ecef; padding: 4px 6px; border-radius: 4px; font-size: 10px; color: #555; font-weight: bold;">VAL</div>
        <input type="text" value=${getValue()} onInput=${onValueInput} placeholder="..." style="flex: 1; min-width: 30px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;" />

        <div style="background: ${hasError ? '#ffe5e5' : '#e9ecef'}; padding: 4px 6px; border-radius: 4px; font-size: 10px; color: ${hasError ? '#dc3545' : '#555'}; font-weight: bold;">ID</div>
        <input type="text" value=${rawSource} onInput=${onSourceInput} placeholder="Required..." style="flex: 2; min-width: 50px; padding: 4px; border: 1px solid ${hasError ? '#dc3545' : '#ccc'}; border-radius: 4px; font-size: 12px; outline: none;" />

        <button onClick=${onRemove} style="background: transparent; color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; width: 24px; height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; padding: 0;">✕</button>
      </div>
      ${hasError ? html`<div style="color: #dc3545; font-size: 11px; margin-top: 4px;">${errorMessage}</div>` : ''}
    </div>
  `;
}

/** Renders a button that appends a new child sensor Moddle instance to an aggregation. */
export function AddChildSensorButton(props) {
  const { element, measurement } = props;
  const modeling = useService('modeling');
  const bpmnFactory = useService('bpmnFactory');

  const onAdd = () => {
    const newSensor = bpmnFactory.create('sust:Measurement', { value: '' });
    newSensor.$parent = measurement;
    modeling.updateModdleProperties(element, measurement, {
      measurements: [...(measurement.get('measurements') || []), newSensor]
    });
  };

  return html`
    <div style="margin-top: 8px;">
      <button onClick=${onAdd} style="width: 100%; padding: 6px; background: white; color: #28a745; border: 1px dashed #28a745; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
        + Add Sensor
      </button>
    </div>
  `;
}