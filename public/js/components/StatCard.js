/**
 * StatCard Component - Nexora Modern Design Style
 * Renders large, high-impact key statistics with muted descriptions and optional indicators,
 * inspired by Nexora's "50K+ / 3.2M / 99.9% / 150+" metrics strip.
 */
export function StatCard(value, label, options = {}) {
  const card = document.createElement('div');
  card.className = `nexora-stat-item ${options.className || ''}`.trim();

  const valueRow = document.createElement('div');
  valueRow.className = 'nexora-stat-value-row';

  const valEl = document.createElement('span');
  valEl.className = 'nexora-stat-number';
  valEl.textContent = value;
  valueRow.appendChild(valEl);

  if (options.trend) {
    const trendEl = document.createElement('span');
    trendEl.className = `nexora-stat-trend trend-${options.trendType || 'positive'}`;
    trendEl.textContent = options.trend;
    valueRow.appendChild(trendEl);
  }

  card.appendChild(valueRow);

  const labelEl = document.createElement('div');
  labelEl.className = 'nexora-stat-label';
  labelEl.textContent = label;
  card.appendChild(labelEl);

  if (options.subtext) {
    const subEl = document.createElement('div');
    subEl.className = 'nexora-stat-subtext';
    subEl.textContent = options.subtext;
    card.appendChild(subEl);
  }

  return card;
}

