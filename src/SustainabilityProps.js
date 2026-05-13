import { h } from '@bpmn-io/properties-panel/preact';
import htm from 'htm';
import { isSelectEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { getSustData, getConfig, removeIndicatorNode } from './utils/SustainabilityHelpers';
import { AddIndicatorButton, IndicatorNameSelect } from './components/SustainabilityButtons';
import CalculatedIndicatorProps from './logic/CalculatedIndicatorProps';
import RawIndicatorProps from './logic/RawIndicatorProps';

const html = htm.bind(h);

/** 
 * L'Header: Stile solido con sfondo grigio e barra verde a sinistra.
 */
function IndicatorSectionHeader(props) {
  const { element, indicator, index, total, indicatorConfig } = props;
  const modeling = useService('modeling');
  
  const indicatorNum = total - index;
  
  const icon = indicatorConfig ? indicatorConfig.icon : '📌';
  const label = indicatorConfig ? indicatorConfig.label : 'Indicator';

  return html`
    <div style="margin-top: 30px; margin-bottom: 10px; padding: 8px 10px; background: #f1f3f4; border-radius: 4px; border-left: 4px solid #28a745; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <span style="font-size: 13px; font-weight: bold; color: #202124; display: flex; align-items: center; gap: 6px;">
        <span>${icon}</span> ${label} (#${indicatorNum})
      </span>
      <button onClick=${() => removeIndicatorNode(element, indicator, modeling)} 
              title="Delete this indicator"
              style="background: transparent; border: 1px solid #dc3545; color: #dc3545; font-size: 11px; font-weight: bold; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.2s;">
        ✕ Remove
      </button>
    </div>
  `;
}

/** 
 * Il Footer: Tratteggio scuro e visibile per chiudere la sezione
 */
function IndicatorSectionFooter() {
  return html`
    <div style="width: 100%; height: 10px; border-bottom: 2px dashed #1e7e34; margin-bottom: 20px;"></div>
  `;
}

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
    
    entries.push({ 
      id: `${idPrefix}-section-header`, 
      element, indicator, index, total: indicators.length, indicatorConfig,
      component: IndicatorSectionHeader 
    });

    entries.push({ id: `${idPrefix}-name`, element, indicator, component: IndicatorNameSelect, isEdited: isSelectEntryEdited });

    if (indicatorConfig) {
      const measurements = indicator.get('measurements') || [];
      const specificProps = indicatorConfig.type === 'calculated' 
        ? CalculatedIndicatorProps(element, indicator, indicatorConfig, measurements, idPrefix)
        : RawIndicatorProps(element, indicator, measurements, idPrefix);
      entries.push(...specificProps);
    }

    entries.push({ 
      id: `${idPrefix}-section-footer`, 
      component: IndicatorSectionFooter 
    });
  });

  return entries;
}