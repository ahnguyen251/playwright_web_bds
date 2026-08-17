export function MetricCard(title, value, showProgress = false, progressPercent = 0) {
  const card = document.createElement('div');
  card.className = 'card';

  const titleEl = document.createElement('div');
  titleEl.className = 'metric-title';
  titleEl.textContent = title;

  const valueEl = document.createElement('div');
  valueEl.className = 'metric-value';
  valueEl.textContent = value;

  card.appendChild(titleEl);
  card.appendChild(valueEl);

  if (showProgress) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    
    progressContainer.appendChild(progressBar);
    card.appendChild(progressContainer);
  }

  return card;
}
