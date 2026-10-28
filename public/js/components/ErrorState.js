/**
 * ErrorState Component - Nexora Modern Design Style
 * Frosted alert card with soft rose accent, warning shield icon,
 * sanitized error description, and error code pill.
 */
export function ErrorState(error) {
  const container = document.createElement('div');
  container.className = 'state-container nexora-error-state';

  const iconBox = document.createElement('div');
  iconBox.className = 'nexora-state-icon-box rose';
  iconBox.innerHTML = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  `;

  const text = document.createElement('div');
  text.className = 'nexora-state-text text-rose';
  text.textContent = 'Đã có lỗi xảy ra khi xử lý dữ liệu';

  const details = document.createElement('div');
  details.className = 'nexora-error-details';
  details.textContent = (error && error.message) ? error.message : 'Lỗi Không Xác Định';

  const codePill = document.createElement('div');
  codePill.className = 'nexora-error-code';
  codePill.textContent = `Mã lỗi: ${(error && error.code) ? error.code : 'UNKNOWN_ERROR'}`;

  container.appendChild(iconBox);
  container.appendChild(text);
  container.appendChild(details);
  container.appendChild(codePill);

  return container;
}
