import { h } from '@bpmn-io/properties-panel/preact';
import htm from 'htm';
import { isSelectEntryEdited } from '@bpmn-io/properties-panel';
import { getSustData, getConfig } from './utils/SustainabilityHelpers';
import { AddIndicatorButton, RemoveIndicatorButton, IndicatorNameSelect } from './components/SustainabilityButtons';
import CalculatedIndicatorProps from './logic/CalculatedIndicatorProps';
import RawIndicatorProps from './logic/RawIndicatorProps';

const html = htm.bind(h);

/** Generates the property panel entries for managing sustainability indicators attached to a BPMN element. */
export function getSustainabilityProps(element) {
  const sustData = getSustData(element.businessObject);
  const indicators = sustData?.get('indicators') || [];
  const config = getConfig();
  
  const entries = [{ id: 'add-sustainability-indicator-btn', component: AddIndicatorButton, element }];

  if (indicators.length === 0) {
    entries.push({
      id: 'empty-help-text',
      component: () => html`<div style="padding: 15px; text-align: center; color: #666; font-size: 13px; background: #f8f9fa; border: 1px dashed #ccc; border-radius: 4px;">No indicators configured yet.<br/><br/>Click the <b>"+ Add Indicator"</b> button above to start tracking.</div>`
    });
    return entries;
  }

  indicators.forEach((indicator, index) => {
    const idPrefix = `sust-ind-${index}`;
    const indicatorConfig = config.indicators.find(i => i.id === indicator.get('name'));
    
    if (index > 0) entries.push({ id: `${idPrefix}-divider`, component: () => html`<hr style="border: 0; border-top: 1px solid #ccc; margin: 15px 0;" />` });

    entries.push({ id: `${idPrefix}-name`, element, indicator, component: IndicatorNameSelect, isEdited: isSelectEntryEdited });

    if (indicatorConfig) {
      const measurements = indicator.get('measurements') || [];
      const specificProps = indicatorConfig.type === 'calculated' 
        ? CalculatedIndicatorProps(element, indicator, indicatorConfig, measurements, idPrefix)
        : RawIndicatorProps(element, indicator, measurements, idPrefix);
      entries.push(...specificProps);
    }

    entries.push({ id: `${idPrefix}-remove`, element, indicator, component: RemoveIndicatorButton });
  });

  return entries;
}