export function ErrorState(error) {
  const container = document.createElement('div');
  container.className = 'state-container';

  const icon = document.createElement('div');
  icon.textContent = '⚠️';
  icon.style.fontSize = '48px';
  icon.style.marginBottom = '16px';

  const text = document.createElement('div');
  text.textContent = 'An error occurred while loading data.';

  const details = document.createElement('div');
  details.className = 'error-text';
  // Sanitize message by using textContent
  details.textContent = error.message || 'Unknown Error';
  
  const code = document.createElement('div');
  code.style.marginTop = '8px';
  code.style.fontSize = '0.75rem';
  code.style.opacity = '0.7';
  code.textContent = `Code: ${error.code || 'UNKNOWN_ERROR'}`;

  container.appendChild(icon);
  container.appendChild(text);
  container.appendChild(details);
  container.appendChild(code);

  return container;
}
