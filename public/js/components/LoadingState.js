export function LoadingState(message = 'Đang tải dữ liệu...') {
  const container = document.createElement('div');
  container.className = 'state-container';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';

  const text = document.createElement('div');
  text.textContent = message;

  container.appendChild(spinner);
  container.appendChild(text);

  return container;
}
