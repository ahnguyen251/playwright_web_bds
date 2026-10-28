/**
 * MetricCard Component - Nexora Modern Design Style
 * Floating frosted glass card with squircle icon, bold KPI typography,
 * glowing progress indicator, and subtle interactive lift.
 */
export function MetricCard(title, value, showProgress = false, progressPercent = 0, options = {}) {
  const card = document.createElement('div');
  card.className = `kpi-modern-card ${options.className || ''}`.trim();

  // Top header row: Label + (Icon or Target Badge)
  const headerRow = document.createElement('div');
  headerRow.className = 'kpi-header-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'kpi-header-label';
  labelEl.textContent = title;
  headerRow.appendChild(labelEl);

  if (options.iconSvg) {
    const iconBox = document.createElement('div');
    iconBox.className = `kpi-icon-box ${options.colorScheme || 'blue'}`;
    iconBox.innerHTML = options.iconSvg;
    headerRow.appendChild(iconBox);
  } else if (options.targetText) {
    const targetEl = document.createElement('span');
    targetEl.className = 'kpi-target-label';
    targetEl.textContent = options.targetText;
    headerRow.appendChild(targetEl);
  } else {
    // Default sleek squircle icon
    const iconBox = document.createElement('div');
    iconBox.className = `kpi-icon-box ${options.colorScheme || 'blue'}`;
    iconBox.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    `;
    headerRow.appendChild(iconBox);
  }

  card.appendChild(headerRow);

  // Value row: Big bold number + optional trend badge or unit
  const valueRow = document.createElement('div');
  valueRow.className = 'kpi-value-row';

  const valEl = document.createElement('span');
  valEl.className = 'kpi-big-num metric-value';
  valEl.textContent = value;
  valueRow.appendChild(valEl);

  if (options.badgeText) {
    const badgeEl = document.createElement('span');
    badgeEl.className = `kpi-badge badge-${options.badgeColor || 'green'}`;
    badgeEl.textContent = options.badgeText;
    valueRow.appendChild(badgeEl);
  } else if (options.unitText) {
    const unitEl = document.createElement('span');
    unitEl.className = 'kpi-unit-text';
    unitEl.textContent = options.unitText;
    valueRow.appendChild(unitEl);
  }

  card.appendChild(valueRow);

  // Optional Progress Bar
  if (showProgress) {
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'kpi-progress-bar-wrap';

    const bgTrack = document.createElement('div');
    bgTrack.className = 'kpi-progress-bar-bg';

    const fillBar = document.createElement('div');
    fillBar.className = 'kpi-progress-bar-fill';
    fillBar.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    bgTrack.appendChild(fillBar);
    progressWrapper.appendChild(bgTrack);

    if (options.progressLabels) {
      const labelsRow = document.createElement('div');
      labelsRow.className = 'kpi-progress-labels';
      labelsRow.innerHTML = `
        <span>${options.progressLabels.left || `Đang đạt: ${progressPercent}%`}</span>
        <span>${options.progressLabels.right || ''}</span>
      `;
      progressWrapper.appendChild(labelsRow);
    }

    card.appendChild(progressWrapper);
  }

  // Footer row (Subtitle / Description / Link)
  if (options.footerText || options.footerHtml) {
    const footerEl = document.createElement('div');
    footerEl.className = 'kpi-card-footer';
    if (options.footerHtml) {
      footerEl.innerHTML = options.footerHtml;
    } else {
      footerEl.innerHTML = `
        <span class="dot ${options.colorScheme || 'blue'}"></span>
        <span>${options.footerText}</span>
      `;
    }
    card.appendChild(footerEl);
  }

  return card;
}
