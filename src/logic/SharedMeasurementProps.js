import { isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { CustomTextField, AggregationModeToggle, AggregationStrategySelector, ChildSensorInput, AddChildSensorButton } from '../components/SustainabilityInputs';
import { validateSensorId, extractMeasurementValue } from '../utils/SustainabilityHelpers';
import { html } from 'htm/preact';

export function buildMeasurementEntries(element, measurement, idPrefix, valueLabel = 'Measurement Value', sourceLabel = 'Data Source / Sensor ID') {
  const entries = [];

  entries.push({ id: `${idPrefix}-mode-toggle`, element, measurement, component: AggregationModeToggle });

  if (measurement.get('type') === 'aggregation') {
    entries.push({ 
      id: `${idPrefix}-agg-source`, 
      element, node: measurement, propName: 'dataSource', 
      label: 'Aggregation Total ID (Data Source)', 
      component: CustomTextField, 
      validate: (value) => validateSensorId(element, measurement, value), 
      isEdited: isTextFieldEntryEdited 
    });

    entries.push({
      id: `${idPrefix}-agg-val-display`,
      component: () => {
        const computedVal = extractMeasurementValue(measurement);
        const displayVal = Number.isFinite(computedVal) ? (Number.isInteger(computedVal) ? computedVal.toString() : computedVal.toFixed(2)) : 'Error';
        return html`
          <div class="bio-properties-panel-entry">
            <label class="bio-properties-panel-label" style="color: #28a745;">Computed Total Value</label>
            <div style="padding: 6px 10px; background: #f1f8f5; border: 1px dashed #28a745; border-radius: 4px; font-size: 13px; font-weight: bold; color: #155724; margin-top: 4px; margin-bottom: 12px;">
              ${displayVal}
            </div>
          </div>
        `;
      }
    });

    entries.push({ id: `${idPrefix}-strategy`, element, measurement, component: AggregationStrategySelector });
    
    (measurement.get('measurements') || []).forEach((childSensor, index) => {
      entries.push({ id: `${idPrefix}-child-sensor-${index}`, element, parentMeasurement: measurement, childSensor, component: ChildSensorInput });
    });
    
    entries.push({ id: `${idPrefix}-add-child`, element, measurement, component: AddChildSensorButton });
  } else {
    entries.push({ id: `${idPrefix}-value`, element, node: measurement, propName: 'value', label: valueLabel, component: CustomTextField, isEdited: isTextFieldEntryEdited });
    entries.push({ id: `${idPrefix}-source`, element, node: measurement, propName: 'dataSource', label: sourceLabel, component: CustomTextField, validate: (value) => validateSensorId(element, measurement, value), isEdited: isTextFieldEntryEdited });
  }

  return entries;
}