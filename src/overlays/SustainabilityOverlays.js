/**
 * Service responsible for injecting and managing custom overlays on the BPMN canvas.
 */
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { getSustData } from '../utils/SustainabilityHelpers';
import { createOverlayNode } from './OverlayRenderer';

/**
 * Registers event listeners to update canvas overlays when elements change or the viewport zooms.
 */
export default function SustainabilityOverlays(eventBus, overlays, elementRegistry) {
  const expandedStates = {};

  /**
   * Renders or updates the overlay for a given BPMN element if it contains valid sustainability data.
   */
  function updateOverlays(element) {
    if (!element || !element.id) return;
    
    // We let diagram-js natively handle the removal of overlays for deleted elements.
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

    const containerDOM = createOverlayNode(validIndicators, isExpanded, handleToggle);

    if (existingOverlays.length > 0) {
      // BULLETPROOF FIX: Avoid destroying and recreating overlays to prevent race condition bugs.
      // We directly mutate the innerHTML of the existing overlay container.
      const overlayHtmlContainer = existingOverlays[0].html;
      overlayHtmlContainer.innerHTML = '';
      overlayHtmlContainer.appendChild(containerDOM);
    } else {
      const overlayPosition = isExpanded ? { bottom: -10, left: element.width / 2 } : { bottom: 0, left: 0 };
      overlays.add(element.id, 'sust-badge', { position: overlayPosition, html: containerDOM });
    }
  }

  // Initial render when diagram is loaded
  eventBus.on('import.done', () => {
    elementRegistry.getAll().forEach(updateOverlays);
  });
  
  // Rerender when elements are added, moved, or edited
  eventBus.on('elements.changed', (context) => {
    if (context.elements) {
      context.elements.forEach(updateOverlays);
    }
  });

  // Handle zoom transitions to fade overlays in/out
  eventBus.on('canvas.viewbox.changed', (context) => {
    const opacity = context.viewbox.scale < 0.6 ? '0' : '1';
    document.querySelectorAll('.sust-overlay-container').forEach(container => {
      container.style.opacity = opacity;
      container.style.transition = 'opacity 0.2s';
    });
  });
}

SustainabilityOverlays.$inject = [ 'eventBus', 'overlays', 'elementRegistry' ];