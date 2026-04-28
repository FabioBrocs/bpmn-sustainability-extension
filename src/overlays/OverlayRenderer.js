/** UI logic for generating HTML DOM nodes representing sustainability metrics on the canvas. */
import { getConfig, hasMissingSensorId, extractMeasurementValue, evaluateFormula } from '../utils/SustainabilityHelpers';

/** Creates the HTML container for either the collapsed summary badge or the expanded details card. */
export function createOverlayNode(validIndicators, isExpanded, onToggle) {
  const container = document.createElement('div');
  container.className = 'my-sust-overlay-container';

  const config = getConfig();

  if (!isExpanded) {
    container.style.cssText = `margin-top: 5px; display:flex; flex-direction:column; align-items:flex-start; cursor:default; pointer-events:auto; font-family:-apple-system,sans-serif;`;
    
    const badge = document.createElement('div');
    badge.className = 'sust-summary-badge';
    badge.style.cssText = `position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease;`;
    
    badge.innerHTML = `
      <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px; vertical-align: middle; fill: #28a745; overflow: hidden; user-select: none;">
        <path d="M725.333333 341.333333C341.333333 426.666667 251.733333 689.92 162.986667 910.506667L243.626667 938.666667 284.16 840.533333C304.64 847.786667 325.973333 853.333333 341.333333 853.333333 810.666667 853.333333 938.666667 128 938.666667 128 896 213.333333 597.333333 224 384 266.666667 170.666667 309.333333 85.333333 490.666667 85.333333 576 85.333333 661.333333 160 736 160 736 298.666667 341.333333 725.333333 341.333333 725.333333 341.333333Z" />
      </svg>
      <div style="position:absolute; bottom:-2px; right:-2px; background:#28a745; color:white; border-radius:50%; width:12px; height:12px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.2);">+</div>
    `;
    
    badge.onmouseover = () => badge.style.transform = 'scale(1.1)';
    badge.onmouseout = () => badge.style.transform = 'scale(1)';
    badge.onclick = (e) => { e.stopPropagation(); onToggle(); };
    
    container.appendChild(badge);
    return container;
  }

  container.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:default;pointer-events:auto;font-family:-apple-system,sans-serif;transform:translate(calc(-50% + 0px), 0px);position:absolute;z-index:100;`;

  const card = document.createElement('div');
  card.style.cssText = `background:#fff;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.2);border:1px solid #e0e0e0;min-width:200px;min-height:100px;overflow:hidden;resize:both;display:flex;flex-direction:column;`;

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
        displayValue = 'Missing Formula'; statusColor = '#fbbc05';
      } else {
        const measurements = indicator.get('measurements') || [];
        if (measurements.some(m => hasMissingSensorId(m))) {
          displayValue = 'Missing Sensor ID'; statusColor = '#fbbc05';
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
        displayValue = 'No Data'; statusColor = '#fbbc05';
      } else if (hasMissingSensorId(parentMeasurement)) {
        displayValue = 'Missing Sensor ID'; statusColor = '#fbbc05';
      } else {
        const unit = parentMeasurement.get('unit') || '';
        const val = extractMeasurementValue(parentMeasurement);
        const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(2);
        const isAgg = parentMeasurement.get('type') === 'aggregation';
        displayValue = isAgg ? `${formatted} ${unit} <span style="font-size:9px;color:#888;">(∑ ${parentMeasurement.get('formula') || 'AVG'})</span>` : `${formatted} ${unit}`;
      }
    }

    rowsHtml += `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;border-bottom:1px dashed #eee;padding-bottom:4px;">
        <div style="display:flex;align-items:center;gap:4px;color:#555;">
          <span>${icon}</span><span style="font-weight:500;">${label}</span>
        </div>
        <div style="font-weight:bold;color:${statusColor};text-align:right;">
          ${displayValue}
        </div>
      </div>
    `;
  });

  const header = document.createElement('div');
  header.style.cssText = `background:#28a745;color:white;padding:6px 10px;font-size:11px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;cursor:grab;user-select:none;flex-shrink:0;`;
  header.innerHTML = `
    <span>Sustainability Data</span>
    <span class="sust-close-btn" style="cursor:pointer;opacity:0.8;font-size:18px;line-height:0.6;padding:0 4px;transition:opacity 0.2s;">-</span>
  `;

  const body = document.createElement('div');
  body.style.cssText = `padding:8px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex-grow:1;`;
  body.innerHTML = rowsHtml;

  card.appendChild(header);
  card.appendChild(body);
  container.appendChild(card);

  const closeBtn = header.querySelector('.sust-close-btn');
  closeBtn.onclick = (e) => { e.stopPropagation(); onToggle(); };
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';

  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('sust-close-btn')) return;
    isDragging = true;
    header.style.cursor = 'grabbing';
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
    header.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  return container;
}