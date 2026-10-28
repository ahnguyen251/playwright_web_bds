/**
 * Badge Component - Nexora Modern Design Style
 * Renders a frosted pill badge with high-contrast text and glowing status indicator.
 */
export function Badge(text, statusType = 'default', options = {}) {
  const badge = document.createElement('span');
  
  // Map standard backend statuses to CSS classes
  const statusMap = {
    'PASSED': 'success',
    'AUTOMATED': 'success',
    'MAPPED': 'success',
    'SUCCESS': 'success',
    'COMPLETED': 'success',
    'ACTIVE': 'success',
    
    'FAILED': 'error',
    'NOT_AUTOMATED': 'error',
    'UNMAPPED': 'error',
    'UNKNOWN_TEST_CASE_ID': 'error',
    'ERROR': 'error',
    
    'IN_PROGRESS': 'info',
    'RUNNING': 'info',
    'INFO': 'info',
    'PENDING': 'info',
    
    'BLOCKED': 'warning',
    'TIMED_OUT': 'warning',
    'INTERRUPTED': 'warning',
    'WARNING': 'warning',
    'FLAKY': 'warning',
    
    'SKIPPED': 'default',
    'MANUAL': 'purple',
    'DEFAULT': 'default'
  };

  const normalized = String(statusType || '').toUpperCase();
  const cssClass = statusMap[normalized] || 'default';
  
  const sizeClass = options.size ? `badge-${options.size}` : '';
  badge.className = `badge ${cssClass} ${sizeClass}`.trim();

  // Create dot indicator
  const dot = document.createElement('span');
  dot.className = 'badge-dot';
  badge.appendChild(dot);

  // Text container
  const textEl = document.createElement('span');
  textEl.className = 'badge-text';
  textEl.textContent = text;
  badge.appendChild(textEl);

  return badge;
}
