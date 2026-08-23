export function EmptyState(message = 'Chưa có dữ liệu.') {
  const container = document.createElement('div');
  container.className = 'state-container';

  const text = document.createElement('div');
  text.textContent = message;

  container.appendChild(text);

  return container;
}
