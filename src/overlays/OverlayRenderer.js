/**
 * UI logic for generating HTML DOM nodes representing sustainability metrics on the canvas.
 */
import { getConfig, hasMissingSensorId, extractMeasurementValue, evaluateFormula } from '../utils/SustainabilityHelpers';

/**
 * Creates the HTML container for either the collapsed summary badge or the expanded details card.
 */
export function createOverlayNode(validIndicators, isExpanded, onToggle) {
  const container = document.createElement('div');
  container.className = isExpanded ? 'sust-overlay-container expanded' : 'sust-overlay-container collapsed';

  const config = getConfig();

  if (!isExpanded) {
    const badge = document.createElement('div');
    badge.className = 'sust-summary-badge';
    
    badge.innerHTML = `
      <svg viewBox="0 0 1024 1024" class="sust-icon">
        <path d="M725.333333 341.333333C341.333333 426.666667 251.733333 689.92 162.986667 910.506667L243.626667 938.666667 284.16 840.533333C304.64 847.786667 325.973333 853.333333 341.333333 853.333333 810.666667 853.333333 938.666667 128 938.666667 128 896 213.333333 597.333333 224 384 266.666667 170.666667 309.333333 85.333333 490.666667 85.333333 576 85.333333 661.333333 160 736 160 736 298.666667 341.333333 725.333333 341.333333 725.333333 341.333333Z" />
      </svg>
      <div class="sust-badge-plus">+</div>
    `;
    
    badge.onclick = (e) => { e.stopPropagation(); onToggle(); };
    container.appendChild(badge);
    return container;
  }

  const card = document.createElement('div');
  card.className = 'sust-details-card';

  let rowsHtml = '';
  validIndicators.forEach(indicator => {
    const indName = indicator.get('name');
    const indConfig = config.indicators.find(i => i.id === indName) || {};
    const icon = indConfig.icon || '📊';
    const label = indConfig.label || indName;
    const type = indConfig.type || 'raw';

    let displayValue = '';
    let statusColor = '#333';

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
        const isAgg = parentMeasurement.get('type') === 'aggregation';
        
        displayValue = isAgg 
          ? `${formatted} ${unit} <span class="sust-agg-note">(∑ ${parentMeasurement.get('formula') || 'AVG'})</span>` 
          : `${formatted} ${unit}`;
      }
    }

    rowsHtml += `
      <div class="sust-row">
        <div class="sust-row-label">
          <span>${icon}</span><span class="sust-row-label-text">${label}</span>
        </div>
        <div class="sust-row-value" style="color:${statusColor};">
          ${displayValue}
        </div>
      </div>
    `;
  });

  const header = document.createElement('div');
  header.className = 'sust-card-header';
  header.innerHTML = `
    <span>Sustainability Data</span>
    <span class="sust-close-btn">-</span>
  `;

  const body = document.createElement('div');
  body.className = 'sust-card-body';
  body.innerHTML = rowsHtml;

  card.appendChild(header);
  card.appendChild(body);
  container.appendChild(card);

  const closeBtn = header.querySelector('.sust-close-btn');
  closeBtn.onclick = (e) => { e.stopPropagation(); onToggle(); };

  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('sust-close-btn')) return;
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    container.style.transform = `translate(calc(-50% + ${currentX}px), ${currentY}px)`;
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  return container;
}