/**
 * Service responsible for injecting and managing custom overlays on the BPMN canvas.
 */
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { getSustData } from '../utils/SustainabilityHelpers';
import { createOverlayNode, createCardBody } from './OverlayRenderer';

/**
 * Registers event listeners to update canvas overlays when elements change or the viewport zooms.
 */
export default function SustainabilityOverlays(eventBus, overlays, elementRegistry) {
  const expandedStates = {};

  /**
   * Renders or updates the overlay for a given BPMN element.
   * Modifies existing HTML when possible to preserve drag coordinates.
   */
  function updateOverlays(element) {
    if (!element || !element.id) return;
    if (!elementRegistry.get(element.id)) return;
    if (!is(element, 'bpmn:Task') && !is(element, 'bpmn:Event') && !is(element, 'bpmn:Group')) return;

    const sustData = getSustData(element.businessObject);
    const indicators = sustData ? (sustData.get('indicators') || []) : [];
    const validIndicators = indicators.filter(ind => ind.get('name') && ind.get('name').trim() !== '');

    const existingOverlays = overlays.get({ element: element.id, type: 'sust-badge' });

    if (validIndicators.length === 0) {
      if (existingOverlays.length > 0) existingOverlays.forEach(ov => overlays.remove(ov.id));
      return;
    }

    const isExpanded = expandedStates[element.id] || false;
    const handleToggle = () => {
      expandedStates[element.id] = !isExpanded;
      updateOverlays(element);
    };

    if (existingOverlays.length > 0) {
      const overlayHtmlContainer = existingOverlays[0].html;
      const currentContainer = overlayHtmlContainer.querySelector('.sust-overlay-container');

      // OPTIMIZATION: If card is already expanded, replace ONLY the dynamic body
      // This preserves the drag transformation applied to the parent container!
      if (currentContainer && currentContainer.classList.contains('expanded') && isExpanded) {
        const oldBody = currentContainer.querySelector('.sust-card-body');
        const newBody = createCardBody(validIndicators);
        if (oldBody) {
          oldBody.replaceWith(newBody);
          return; // Exit early, no need to recreate the wrapper
        }
      }

      // If state changed (e.g., toggling open/close), recreate the node entirely
      const containerDOM = createOverlayNode(validIndicators, isExpanded, handleToggle);
      overlayHtmlContainer.innerHTML = '';
      overlayHtmlContainer.appendChild(containerDOM);
    } else {
      const overlayPosition = isExpanded ? { bottom: -10, left: element.width / 2 } : { bottom: 0, left: 0 };
      const containerDOM = createOverlayNode(validIndicators, isExpanded, handleToggle);
      overlays.add(element.id, 'sust-badge', { position: overlayPosition, html: containerDOM });
    }
  }

  eventBus.on('import.done', () => {
    elementRegistry.getAll().forEach(updateOverlays);
  });
  
  eventBus.on('elements.changed', (context) => {
    if (context.elements) {
      context.elements.forEach(updateOverlays);
    }
  });

  eventBus.on('canvas.viewbox.changed', (context) => {
    const opacity = context.viewbox.scale < 0.6 ? '0' : '1';
    document.querySelectorAll('.sust-overlay-container').forEach(container => {
      container.style.opacity = opacity;
      container.style.transition = 'opacity 0.2s';
    });
  });
}

SustainabilityOverlays.$inject = [ 'eventBus', 'overlays', 'elementRegistry' ];