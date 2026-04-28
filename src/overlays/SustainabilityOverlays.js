/** Service responsible for injecting and managing custom overlays on the BPMN canvas. */
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { getSustData } from '../utils/SustainabilityHelpers';
import { createOverlayNode } from './OverlayRenderer';

/** Registers event listeners to update canvas overlays when elements change or the viewport zooms. */
export default function SustainabilityOverlays(eventBus, overlays, elementRegistry) {
  const expandedStates = {};

  /** Renders or updates the overlay for a given BPMN element if it contains valid sustainability data. */
  function updateOverlays(element) {
    if (!is(element, 'bpmn:Task') && !is(element, 'bpmn:Event') && !is(element, 'bpmn:Group')) return;

    overlays.remove({ element: element.id, type: 'sust-badge' });
    if (!elementRegistry.get(element.id)) return;

    const sustData = getSustData(element.businessObject);
    const indicators = sustData?.get('indicators') || [];
    const validIndicators = indicators.filter(ind => ind.get('name')?.trim() !== '');

    if (validIndicators.length > 0) {
      const isExpanded = expandedStates[element.id] || false;

      const handleToggle = () => {
        expandedStates[element.id] = !isExpanded;
        updateOverlays(element);
      };

      const containerDOM = createOverlayNode(validIndicators, isExpanded, handleToggle);

      const overlayPosition = isExpanded 
        ? { bottom: -10, left: element.width / 2 } 
        : { bottom: -0, left: 0 };

      overlays.add(element.id, 'sust-badge', {
        position: overlayPosition,
        html: containerDOM
      });
    }
  }

  eventBus.on('import.done', () => elementRegistry.getAll().forEach(updateOverlays));
  eventBus.on('elements.changed', (context) => context.elements.forEach(updateOverlays));
  eventBus.on('shape.removed', (context) => delete expandedStates[context.element.id]);

  eventBus.on('canvas.viewbox.changed', (context) => {
    const opacity = context.viewbox.scale < 0.6 ? '0' : '1';
    document.querySelectorAll('.my-sust-overlay-container').forEach(container => {
      container.style.opacity = opacity;
      container.style.transition = 'opacity 0.2s';
    });
  });
}

SustainabilityOverlays.$inject = [ 'eventBus', 'overlays', 'elementRegistry' ];