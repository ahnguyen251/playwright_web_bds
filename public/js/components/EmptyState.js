export function EmptyState(message = 'No data available.') {
  const container = document.createElement('div');
  container.className = 'state-container';

  const text = document.createElement('div');
  text.textContent = message;

  container.appendChild(text);

  return container;
}
