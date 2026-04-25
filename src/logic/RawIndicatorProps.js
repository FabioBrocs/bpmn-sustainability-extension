import { isTextFieldEntryEdited, isSelectEntryEdited } from '@bpmn-io/properties-panel';
import { CustomTextField, MeasurementUnitSelect, AggregationModeToggle, AggregationStrategySelector, ChildSensorInput, AddChildSensorButton } from '../components/SustainabilityInputs';
import { html } from 'htm/preact';
import { validateSensorId } from '../utils/SustainabilityHelpers';

export default function RawIndicatorProps(element, indicator, measurements, idPrefix) {
  const entries = [];
  const parentMeasurement = measurements[0];
  
  if (!parentMeasurement) return entries;

  entries.push({ id: `${idPrefix}-unit`, element, indicator, measurement: parentMeasurement, component: MeasurementUnitSelect, isEdited: isSelectEntryEdited });
  entries.push({ id: `${idPrefix}-agg-divider`, component: () => html`<hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 18px 0 12px 0;" />` });
  entries.push({ id: `${idPrefix}-mode-toggle`, element, measurement: parentMeasurement, component: AggregationModeToggle });

  if (parentMeasurement.get('type') === 'aggregation') {
    entries.push({ id: `${idPrefix}-strategy`, element, measurement: parentMeasurement, component: AggregationStrategySelector });
    (parentMeasurement.get('measurements') || []).forEach((childSensor, index) => {
      entries.push({ id: `${idPrefix}-child-sensor-${index}`, element, parentMeasurement, childSensor, component: ChildSensorInput });
    });
    entries.push({ id: `${idPrefix}-add-child`, element, measurement: parentMeasurement, component: AddChildSensorButton });
  } else {
    entries.push({ id: `${idPrefix}-value`, element, node: parentMeasurement, propName: 'value', label: 'Measurement Value', component: CustomTextField, isEdited: isTextFieldEntryEdited });
    entries.push({ id: `${idPrefix}-source`, element, node: parentMeasurement, propName: 'dataSource', label: 'Data Source / Sensor ID', component: CustomTextField, validate: (value) => validateSensorId(parentMeasurement, value), isEdited: isTextFieldEntryEdited });
  }

  return entries;
}