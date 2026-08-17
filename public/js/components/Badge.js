export function Badge(text, statusType = 'default') {
  const badge = document.createElement('span');
  
  // Map standard backend statuses to CSS classes
  const statusMap = {
    'PASSED': 'success',
    'AUTOMATED': 'success',
    'MAPPED': 'success',
    
    'FAILED': 'error',
    'NOT_AUTOMATED': 'error',
    'UNMAPPED': 'error',
    'UNKNOWN_TEST_CASE_ID': 'error',
    
    'IN_PROGRESS': 'info',
    
    'BLOCKED': 'warning',
    'TIMED_OUT': 'warning',
    'INTERRUPTED': 'warning',
    
    'SKIPPED': 'default'
  };

  const cssClass = statusMap[statusType] || 'default';
  badge.className = `badge ${cssClass}`;
  badge.textContent = text;

  return badge;
}
