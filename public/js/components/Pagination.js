export function Pagination(paginationData, onPageChange) {
  const container = document.createElement('div');
  container.className = 'pagination';

  if (!paginationData || paginationData.totalPages <= 1) {
    return container; // Empty if no pagination needed
  }

  const { page, totalPages, totalItems } = paginationData;

  const info = document.createElement('div');
  info.className = 'pagination-info';
  info.textContent = `Showing page ${page} of ${totalPages} (${totalItems} total items)`;
  container.appendChild(info);

  const controls = document.createElement('div');
  controls.className = 'pagination-controls';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn';
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = page <= 1;
  prevBtn.onclick = () => onPageChange(page - 1);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = page >= totalPages;
  nextBtn.onclick = () => onPageChange(page + 1);

  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);
  container.appendChild(controls);

  return container;
}
