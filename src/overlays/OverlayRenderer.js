/**
 * UI logic for generating HTML DOM nodes representing sustainability metrics on the canvas.
 */
import { getConfig, hasMissingSensorId, extractMeasurementValue, evaluateFormula } from '../utils/SustainabilityHelpers';

/** Utility to create DOM elements concisely (Hyperscript pattern). */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.substring(2).toLowerCase(), value);
    } else if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  children.flat().forEach(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  return el;
}

/** Attaches drag-and-drop behavior to the expanded card. */
function makeDraggable(headerNode, containerNode) {
  let isDragging = false, startX, startY, currentX = 0, currentY = 0;
  
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

/** Generates the collapsed summary badge restoring original SVG rendering. */
function createBadge(onToggle) {
  const badge = h('div', { className: 'sust-summary-badge', onClick: (e) => { e.stopPropagation(); onToggle(); } });
  badge.innerHTML = `
    <svg viewBox="0 0 1024 1024" class="sust-icon">
      <path d="M725.333333 341.333333C341.333333 426.666667 251.733333 689.92 162.986667 910.506667L243.626667 938.666667 284.16 840.533333C304.64 847.786667 325.973333 853.333333 341.333333 853.333333 810.666667 853.333333 938.666667 128 938.666667 128 896 213.333333 597.333333 224 384 266.666667 170.666667 309.333333 85.333333 490.666667 85.333333 576 85.333333 661.333333 160 736 160 736 298.666667 341.333333 725.333333 341.333333 725.333333 341.333333Z" />
    </svg>
    <div class="sust-badge-plus">+</div>
  `;
  return badge;
}

/** Generates purely the dynamic body of the details card containing the indicators. */
export function createCardBody(validIndicators) {
  const config = getConfig();
  
  const rows = validIndicators.map(indicator => {
    const indName = indicator.get('name');
    const indConfig = config.indicators.find(i => i.id === indName) || {};
    const { icon = '📊', label = indName, type = 'raw' } = indConfig;

    let displayValue = '', statusColor = '#333', aggNoteText = '';

    if (type === 'calculated') {
      const selectedFormula = (indConfig.formulas || []).find(f => f.id === indicator.get('formulaId'));
      if (!selectedFormula) {
        displayValue = 'Missing Formula'; statusColor = '#fbbc05';
      } else {
        const measurements = indicator.get('measurements') || [];
        if (measurements.some(hasMissingSensorId)) {
          displayValue = 'Missing Sensor ID'; statusColor = '#fbbc05';
        } else {
          const varsMap = Object.fromEntries((selectedFormula.variables || []).map((v, i) => [v.id || v, extractMeasurementValue(measurements[i])]));
          const res = evaluateFormula(indicator.get('formula') || selectedFormula.expression, varsMap);
          displayValue = res;
          statusColor = (res === 'Syntax Err' || res === 'Calc Err') ? '#ea4335' : '#4285f4';
        }
      }
    } else {
      const parentMeasurement = (indicator.get('measurements') || [])[0];
      if (!parentMeasurement) {
        displayValue = 'No Data'; statusColor = '#fbbc05';
      } else if (hasMissingSensorId(parentMeasurement)) {
        displayValue = 'Missing Sensor ID'; statusColor = '#fbbc05';
      } else {
        const unit = parentMeasurement.get('unit') || '';
        const val = extractMeasurementValue(parentMeasurement);
        displayValue = `${Number.isInteger(val) ? val.toString() : val.toFixed(2)} ${unit}`;
        if (parentMeasurement.get('type') === 'aggregation') {
          aggNoteText = `(∑ ${parentMeasurement.get('formula') || 'AVG'})`;
        }
      }
    }

    return h('div', { className: 'sust-row' },
      h('div', { className: 'sust-row-label' },
        h('span', {}, icon),
        h('span', { className: 'sust-row-label-text' }, label)
      ),
      h('div', { className: 'sust-row-value', style: { color: statusColor } },
        displayValue,
        aggNoteText ? h('span', { className: 'sust-agg-note' }, ` ${aggNoteText}`) : null
      )
    );
  });

  return h('div', { className: 'sust-card-body' }, ...rows);
}

/** Generates the full expanded details card. */
function createCard(validIndicators, onToggle, container) {
  const closeBtn = h('span', { className: 'sust-close-btn', onClick: (e) => { e.stopPropagation(); onToggle(); } }, '-');
  const header = h('div', { className: 'sust-card-header' }, h('span', {}, 'Sustainability Data'), closeBtn);
  const body = createCardBody(validIndicators);
  
  const card = h('div', { className: 'sust-details-card' }, header, body);
  makeDraggable(header, container);
  return card;
}

/** Creates the HTML container for either the collapsed badge or expanded card. */
export function createOverlayNode(validIndicators, isExpanded, onToggle) {
  const containerClass = `sust-overlay-container ${isExpanded ? 'expanded' : 'collapsed'}`;
  const container = h('div', { className: containerClass });
  
  const content = isExpanded 
    ? createCard(validIndicators, onToggle, container) 
    : createBadge(onToggle);
    
  container.appendChild(content);
  return container;
}