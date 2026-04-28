import { isSelectEntryEdited } from '@bpmn-io/properties-panel';
import { MeasurementUnitSelect } from '../components/SustainabilityInputs';
import { html } from 'htm/preact';
import { buildMeasurementEntries } from './SharedMeasurementProps';

export default function RawIndicatorProps(element, indicator, measurements, idPrefix) {
  const entries = [];
  const parentMeasurement = measurements[0];
  
  if (!parentMeasurement) return entries;

  entries.push({ id: `${idPrefix}-unit`, element, indicator, measurement: parentMeasurement, component: MeasurementUnitSelect, isEdited: isSelectEntryEdited });
  entries.push({ id: `${idPrefix}-agg-divider`, component: () => html`<hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 18px 0 12px 0;" />` });

  entries.push(...buildMeasurementEntries(
    element, 
    parentMeasurement, 
    idPrefix, 
    'Measurement Value', 
    'Data Source / Sensor ID'
  ));

  return entries;
}