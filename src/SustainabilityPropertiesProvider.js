import { is } from 'bpmn-js/lib/util/ModelUtil.js';
import { getSustainabilityProps } from './SustainabilityProps';

const LOW_PRIORITY = 500;

/** Registers the sustainability properties group in the properties panel for supported BPMN elements. */
export default function SustainabilityPropertiesProvider(propertiesPanel, translate) {
  this.getGroups = function(element) {
    return function(groups) {
      if (is(element, 'bpmn:Task') || is(element, 'bpmn:Event') || is(element, 'bpmn:Group')) {
        groups.push({
          id: 'sustainability_group',
          label: translate('Sustainability Indicators'),
          entries: getSustainabilityProps(element)
        });
      }
      return groups;
    };
  };
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

SustainabilityPropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];