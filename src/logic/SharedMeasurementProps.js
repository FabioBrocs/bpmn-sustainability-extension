import { isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { CustomTextField, AggregationModeToggle, AggregationStrategySelector, ChildSensorInput, AddChildSensorButton } from '../components/SustainabilityInputs';
import { validateSensorId } from '../utils/SustainabilityHelpers';

/**
 * Generates inputs in a generalized way (single or complex).
 */
export function buildMeasurementEntries(element, measurement, idPrefix, valueLabel = 'Measurement Value', sourceLabel = 'Data Source / Sensor ID') {
  const entries = [];

  entries.push({ id: `${idPrefix}-mode-toggle`, element, measurement, component: AggregationModeToggle });

  if (measurement.get('type') === 'aggregation') {
    entries.push({ id: `${idPrefix}-strategy`, element, measurement, component: AggregationStrategySelector });
    
    (measurement.get('measurements') || []).forEach((childSensor, index) => {
      entries.push({ id: `${idPrefix}-child-sensor-${index}`, element, parentMeasurement: measurement, childSensor, component: ChildSensorInput });
    });
    
    entries.push({ id: `${idPrefix}-add-child`, element, measurement, component: AddChildSensorButton });
  } else {
    entries.push({ id: `${idPrefix}-value`, element, node: measurement, propName: 'value', label: valueLabel, component: CustomTextField, isEdited: isTextFieldEntryEdited });
    entries.push({ id: `${idPrefix}-source`, element, node: measurement, propName: 'dataSource', label: sourceLabel, component: CustomTextField, validate: (value) => validateSensorId(measurement, value), isEdited: isTextFieldEntryEdited });
  }

  return entries;
}