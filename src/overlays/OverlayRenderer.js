/** UI logic for generating HTML DOM nodes representing sustainability metrics on the canvas. */
import { getConfig, hasMissingSensorId, extractMeasurementValue, evaluateFormula } from '../utils/SustainabilityHelpers';

/** Creates the HTML container for either the collapsed summary badge or the expanded details card. */
export function createOverlayNode(validIndicators, isExpanded, onToggle) {
  const container = document.createElement('div');
  container.className = 'my-sust-overlay-container';
  container.style.cssText = `display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);cursor:default;pointer-events:auto;font-family:-apple-system,sans-serif;`;

  const config = getConfig();
  const mainIndicator = validIndicators[0];
  const mainConfig = config.indicators.find(i => i.id === mainIndicator.get('name')) || {};
  const mainIcon = mainConfig.icon || '🌱';

  if (!isExpanded) {
    const badge = document.createElement('div');
    badge.className = 'sust-summary-badge';
    badge.style.cssText = `background:#fff;color:#28a745;border:1px solid #28a745;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.15);`;
    badge.textContent = `${mainIcon} ${validIndicators.length} Sust. Metric${validIndicators.length > 1 ? 's' : ''}`;
    
    badge.onmouseover = () => badge.style.background = '#f0fdf4';
    badge.onmouseout = () => badge.style.background = '#fff';
    badge.onclick = (e) => { e.stopPropagation(); onToggle(); };
    
    container.appendChild(badge);
    return container;
  }

  const card = document.createElement('div');
  card.style.cssText = `background:#fff;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.2);border:1px solid #e0e0e0;min-width:180px;overflow:hidden;`;

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

  card.innerHTML = `
    <div style="background:#28a745;color:white;padding:6px 10px;font-size:11px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;">
      <span>Sustainability Data</span>
      <span class="sust-close-btn" style="cursor:pointer;opacity:0.8;font-size:10px;padding:2px;transition:opacity 0.2s;">✖</span>
    </div>
    <div style="padding:8px;display:flex;flex-direction:column;gap:8px;">
      ${rowsHtml}
    </div>
  `;

  const closeBtn = card.querySelector('.sust-close-btn');
  closeBtn.onclick = (e) => { e.stopPropagation(); onToggle(); };
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';

  container.appendChild(card);
  return container;
}