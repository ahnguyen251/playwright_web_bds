/**
 * LoadingState Component - Nexora Modern Design Style
 * Elegant frosted glass loading indicator with dual-pulse gradient ring.
 */
export function LoadingState(message = 'Đang tải dữ liệu...') {
  const container = document.createElement('div');
  container.className = 'state-container nexora-loading-state';

  const loaderWrap = document.createElement('div');
  loaderWrap.className = 'nexora-loader-wrap';

  const spinner = document.createElement('div');
  spinner.className = 'nexora-spinner-ring';

  const innerDot = document.createElement('div');
  innerDot.className = 'nexora-spinner-dot';

  loaderWrap.appendChild(spinner);
  loaderWrap.appendChild(innerDot);

  const text = document.createElement('div');
  text.className = 'nexora-state-text';
  text.textContent = message;

  const hint = document.createElement('div');
  hint.className = 'nexora-state-subtext';
  hint.textContent = 'Vui lòng chờ trong giây lát...';

  container.appendChild(loaderWrap);
  container.appendChild(text);
  container.appendChild(hint);

  return container;
}
