/**
 * Preact UI components for inputs and toggles inside the properties panel.
 */
import { html } from 'htm/preact';
import { TextFieldEntry, SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { getConfig, validateSensorId, updateModdleProp, getAllSensorIds, syncSensorIdRename, syncCalculatedValues } from '../utils/SustainabilityHelpers';

export function CustomTextField(props) {
  const { element, id, node, propName, label, validate, description } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => node.get(propName) || '';
  const setValue = value => {
    const oldValue = node.get(propName);
    updateModdleProp(modeling, element, node, { [propName]: value });
    
    if (propName === 'dataSource' && oldValue !== value) {
      syncSensorIdRename(modeling, element, oldValue, value);
    }
    syncCalculatedValues(modeling, element);
  };

  return html`<${TextFieldEntry} 
    id=${id} element=${element} label=${translate(label)} 
    getValue=${getValue} setValue=${setValue} 
    debounce=${debounce} validate=${validate} description=${description}
  />`;
}

export function CalculatedVariableInput(props) {
  const { element, id, node, label } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');

  const valValue = () => node.get('value') || '';
  const onValInput = (e) => {
    updateModdleProp(modeling, element, node, { value: e.target.value });
  };

  const srcValue = () => node.get('dataSource') || '';
  const onSrcInput = (e) => {
    updateModdleProp(modeling, element, node, { dataSource: e.target.value });
    syncCalculatedValues(modeling, element);
  };

  const availableIds = getAllSensorIds(element);
  const datalistId = `${id}-datalist`;

  return html`
    <div class="bio-properties-panel-entry" data-entry-id=${id} style="margin-bottom: 10px;">
      <label class="bio-properties-panel-label">${translate(label)}</label>
      <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
        <div style="background: #e9ecef; padding: 4px 6px; border-radius: 4px; font-size: 10px; color: #555; font-weight: bold;">VAL</div>
        <input type="text" value=${valValue()} onInput=${onValInput} placeholder="Test Val..." style="flex: 1; min-width: 40px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;" />

        <div style="background: #e9ecef; padding: 4px 6px; border-radius: 4px; font-size: 10px; color: #555; font-weight: bold;">ID</div>
        <input type="text" value=${srcValue()} onInput=${onSrcInput} list=${datalistId} placeholder="Link ID..." spellcheck="false" style="flex: 2; min-width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; outline: none;" />
        <datalist id=${datalistId}>
          ${availableIds.map(val => html`<option value=${val}></option>`)}
        </datalist>
      </div>
    </div>
  `;
}

export function MeasurementUnitSelect(props) {
  const { element, id, indicator, measurement } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const config = getConfig();

  const currentIndicatorId = indicator.get('name') || '';
  const currentConfig = config.indicators.find(ind => ind.id === currentIndicatorId);

  const getValue = () => measurement.get('unit') || currentConfig?.allowedUnits?.[0]?.value || '';
  const setValue = value => updateModdleProp(modeling, element, measurement, { unit: value });
  const getOptions = () => currentConfig?.allowedUnits || [];

  return html`<${SelectEntry} 
    id=${id} element=${element} label=${translate('Unit')} 
    getValue=${getValue} setValue=${setValue} getOptions=${getOptions} 
  />`;
}

export function AggregationModeToggle(props) {
  const { element, id, measurement } = props;
  const modeling = useService('modeling');
  const bpmnFactory = useService('bpmnFactory');

  const isAggregation = measurement.get('type') === 'aggregation';

  const toggleMode = () => {
    if (isAggregation) {
      updateModdleProp(modeling, element, measurement, { type: '', formula: '', measurements: [] });
    } else {
      const childSensor = bpmnFactory.create('sust:Measurement', { value: '' });
      childSensor.$parent = measurement;
      updateModdleProp(modeling, element, measurement, {
        type: 'aggregation', formula: 'AVG', value: '', dataSource: '', measurements: [childSensor]
      });
    }
    syncCalculatedValues(modeling, element);
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

export function AggregationStrategySelector(props) {
  const { element, id, measurement } = props;
  const modeling = useService('modeling');

  const standardStrategies = ['AVG', 'SUM', 'MIN', 'MAX'];
  const currentFormula = measurement.get('formula') || 'AVG';
  
  const isCustom = !standardStrategies.includes(currentFormula) && currentFormula !== '';
  const activeTab = isCustom ? 'CUSTOM' : currentFormula;

  const setStrategy = (strat) => {
    // FIXED: Inserted clear example string
    updateModdleProp(modeling, element, measurement, { formula: strat === 'CUSTOM' ? 'sens_01 + sens_02' : strat });
    syncCalculatedValues(modeling, element);
  };

  const validateCustomFormula = (value) => {
    if (!value || value.trim() === '') return 'Custom formula cannot be empty.';
    return null;
  };

  return html`
    <div class="bio-properties-panel-entry" data-entry-id=${id}>
      <label class="bio-properties-panel-label">Aggregation Strategy</label>
      <div style="display: flex; background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-top: 5px;">
        ${[...standardStrategies, 'CUSTOM'].map(strat => html`
          <div onClick=${() => setStrategy(strat)}
            style="flex: 1; text-align: center; padding: 6px 0; font-size: 11px; cursor: pointer; font-weight: ${activeTab === strat ? 'bold' : 'normal'}; background: ${activeTab === strat ? '#28a745' : 'transparent'}; color: ${activeTab === strat ? 'white' : '#555'}; border-right: 1px solid #ddd; transition: all 0.2s ease;">
            ${strat}
          </div>
        `)}
      </div>
      
      ${activeTab === 'CUSTOM' ? html`
        <div style="margin-top: 15px; padding: 10px; background: #e9ecef; border-radius: 6px; border-left: 3px solid #28a745;">
          <${CustomTextField} 
            id="${id}-custom-formula" 
            element=${element} node=${measurement} propName="formula" 
            label="Custom Math Formula" 
            description="Use child Sensor IDs as variables. Spaces are not allowed."
            validate=${validateCustomFormula} 
          />
        </div>
      ` : ''}
    </div>
  `;
}

export function ChildSensorInput(props) {
  const { element, id, parentMeasurement, childSensor } = props;
  const modeling = useService('modeling');

  const getValue = () => childSensor.get('value') || '';
  const rawSource = childSensor.get('dataSource') || '';
  
  const errorMessage = validateSensorId(element, childSensor, rawSource);
  const hasError = errorMessage !== null;

  const onValueInput = (e) => {
    updateModdleProp(modeling, element, childSensor, { value: e.target.value });
    syncCalculatedValues(modeling, element);
  };

  const onSourceInput = (e) => {
    const oldSource = childSensor.get('dataSource');
    updateModdleProp(modeling, element, childSensor, { dataSource: e.target.value });
    syncSensorIdRename(modeling, element, oldSource, e.target.value);
    syncCalculatedValues(modeling, element);
  };
  
  const onRemove = () => {
    const newChildren = (parentMeasurement.get('measurements') || []).filter(c => c !== childSensor);
    updateModdleProp(modeling, element, parentMeasurement, { measurements: newChildren });
    syncCalculatedValues(modeling, element);
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

export function AddChildSensorButton(props) {
  const { element, measurement } = props;
  const modeling = useService('modeling');
  const bpmnFactory = useService('bpmnFactory');

  const onAdd = () => {
    const newSensor = bpmnFactory.create('sust:Measurement', { value: '' });
    newSensor.$parent = measurement;
    updateModdleProp(modeling, element, measurement, {
      measurements: [...(measurement.get('measurements') || []), newSensor]
    });
    syncCalculatedValues(modeling, element);
  };

  return html`
    <div style="margin-top: 8px;">
      <button onClick=${onAdd} style="width: 100%; padding: 6px; background: white; color: #28a745; border: 1px dashed #28a745; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
        + Add Sensor
      </button>
    </div>
  `;
}