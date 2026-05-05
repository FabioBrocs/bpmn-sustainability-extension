/**
 * UI logic for generating HTML DOM nodes representing sustainability metrics on the canvas.
 */
import { getConfig, hasMissingSensorId, extractMeasurementValue, evaluateFormula } from '../utils/SustainabilityHelpers';

/**
 * Helper function to safely create DOM elements and prevent XSS vulnerabilities.
 * 
 * @param {string} tag - The HTML tag name.
 * @param {string} className - The CSS class name(s).
 * @param {string} [textContent] - Safe text content to be inserted.
 * @returns {HTMLElement} The constructed DOM element.
 */
function createNode(tag, className, textContent = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

/**
 * Attaches drag-and-drop behavior to the expanded card.
 * 
 * @param {HTMLElement} headerNode - The element acting as the drag handle.
 * @param {HTMLElement} containerNode - The main overlay container to be moved.
 */
function makeDraggable(headerNode, containerNode) {
  let isDragging = false;
  let startX, startY, currentX = 0, currentY = 0;

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    containerNode.style.transform = `translate(calc(-50% + ${currentX}px), ${currentY}px)`;
  };

  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  headerNode.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('sust-close-btn')) return;
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * Generates the collapsed summary badge.
 * 
 * @param {Function} onToggle - Callback to trigger the expansion of the overlay.
 * @returns {HTMLElement} The badge DOM element.
 */
function createBadge(onToggle) {
  const badge = createNode('div', 'sust-summary-badge');
  badge.innerHTML = `
    <svg viewBox="0 0 1024 1024" class="sust-icon">
      <path d="M725.333333 341.333333C341.333333 426.666667 251.733333 689.92 162.986667 910.506667L243.626667 938.666667 284.16 840.533333C304.64 847.786667 325.973333 853.333333 341.333333 853.333333 810.666667 853.333333 938.666667 128 938.666667 128 896 213.333333 597.333333 224 384 266.666667 170.666667 309.333333 85.333333 490.666667 85.333333 576 85.333333 661.333333 160 736 160 736 298.666667 341.333333 725.333333 341.333333 725.333333 341.333333Z" />
    </svg>
    <div class="sust-badge-plus">+</div>
  `;
  badge.onclick = (e) => { e.stopPropagation(); onToggle(); };
  return badge;
}

/**
 * Generates purely the dynamic body of the details card containing the indicators.
 * Exported so it can be used to update existing overlays without destroying their dragged wrapper.
 * 
 * @param {Array} validIndicators - List of sustainability indicators.
 * @returns {HTMLElement} The card body DOM element.
 */
export function createCardBody(validIndicators) {
  const config = getConfig();
  const body = createNode('div', 'sust-card-body');

  validIndicators.forEach(indicator => {
    const indName = indicator.get('name');
    const indConfig = config.indicators.find(i => i.id === indName) || {};
    const icon = indConfig.icon || '📊';
    const label = indConfig.label || indName;
    const type = indConfig.type || 'raw';

    let displayValue = '';
    let statusColor = '#333';
    let aggNoteText = '';

    if (type === 'calculated') {
      const formulasList = indConfig.formulas || [];
      const selectedFormula = formulasList.find(f => f.id === indicator.get('formulaId'));

      if (!selectedFormula) {
        displayValue = 'Missing Formula'; 
        statusColor = '#fbbc05';
      } else {
        const measurements = indicator.get('measurements') || [];
        if (measurements.some(m => hasMissingSensorId(m))) {
          displayValue = 'Missing Sensor ID'; 
          statusColor = '#fbbc05';
        } else {
          const varsMap = {};
          (selectedFormula.variables || []).forEach((v, i) => {
            varsMap[v.id || v] = extractMeasurementValue(measurements[i]);
          });
          const res = evaluateFormula(indicator.get('formula') || selectedFormula.expression, varsMap);
          displayValue = res;
          statusColor = (res === 'Syntax Err' || res === 'Calc Err') ? '#ea4335' : '#4285f4';
        }
      }
    } else {
      const parentMeasurement = (indicator.get('measurements') || [])[0];
      if (!parentMeasurement) {
        displayValue = 'No Data'; 
        statusColor = '#fbbc05';
      } else if (hasMissingSensorId(parentMeasurement)) {
        displayValue = 'Missing Sensor ID'; 
        statusColor = '#fbbc05';
      } else {
        const unit = parentMeasurement.get('unit') || '';
        const val = extractMeasurementValue(parentMeasurement);
        const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(2);
        
        displayValue = `${formatted} ${unit}`;
        if (parentMeasurement.get('type') === 'aggregation') {
          aggNoteText = `(∑ ${parentMeasurement.get('formula') || 'AVG'})`;
        }
      }
    }

    const row = createNode('div', 'sust-row');
    const labelDiv = createNode('div', 'sust-row-label');
    labelDiv.appendChild(createNode('span', '', icon));
    labelDiv.appendChild(createNode('span', 'sust-row-label-text', label));

    const valueDiv = createNode('div', 'sust-row-value', displayValue);
    valueDiv.style.color = statusColor;

    if (aggNoteText) {
      valueDiv.appendChild(createNode('span', 'sust-agg-note', ` ${aggNoteText}`));
    }

    row.appendChild(labelDiv);
    row.appendChild(valueDiv);
    body.appendChild(row);
  });

  return body;
}

/**
 * Generates the full expanded details card.
 * 
 * @param {Array} validIndicators - List of sustainability indicators.
 * @param {Function} onToggle - Callback to trigger the collapse of the overlay.
 * @param {HTMLElement} container - The wrapper element (used for drag setup).
 * @returns {HTMLElement} The detailed card DOM element.
 */
function createCard(validIndicators, onToggle, container) {
  const card = createNode('div', 'sust-details-card');

  // Header
  const header = createNode('div', 'sust-card-header');
  header.appendChild(createNode('span', '', 'Sustainability Data'));
  const closeBtn = createNode('span', 'sust-close-btn', '-');
  closeBtn.onclick = (e) => { e.stopPropagation(); onToggle(); };
  header.appendChild(closeBtn);

  // Body
  const body = createCardBody(validIndicators);

  card.appendChild(header);
  card.appendChild(body);
  makeDraggable(header, container);

  return card;
}

/**
 * Creates the HTML container for either the collapsed badge or expanded card.
 */
export function createOverlayNode(validIndicators, isExpanded, onToggle) {
  const container = createNode('div', `sust-overlay-container ${isExpanded ? 'expanded' : 'collapsed'}`);
  if (!isExpanded) {
    container.appendChild(createBadge(onToggle));
  } else {
    container.appendChild(createCard(validIndicators, onToggle, container));
  }
  return container;
}