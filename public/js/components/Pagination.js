/**
 * Pagination Component - Nexora Modern Design Style
 * Sleek frosted glass pagination bar with pill action buttons and page indicator.
 */
export function Pagination(paginationData, onPageChange) {
  const container = document.createElement('div');
  container.className = 'pagination nexora-pagination';

  if (!paginationData || paginationData.totalPages <= 1) {
    container.style.display = 'none';
    return container; // Return hidden node so appendChild never throws TypeError
  }

  const { page, totalPages, totalItems } = paginationData;

  const info = document.createElement('div');
  info.className = 'pagination-info';
  info.innerHTML = `<span>Trang <strong>${page}</strong> / <strong>${totalPages}</strong></span> <span class="pagination-dot">•</span> <span>Tổng <strong>${totalItems}</strong> mục</span>`;
  container.appendChild(info);

  const controls = document.createElement('div');
  controls.className = 'pagination-controls';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'btn btn-page-pill';
  prevBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
    <span>Trước</span>
  `;
  prevBtn.disabled = page <= 1;
  prevBtn.onclick = () => onPageChange(page - 1);

  const pageBadge = document.createElement('span');
  pageBadge.className = 'pagination-current-pill';
  pageBadge.textContent = `${page}`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-page-pill';
  nextBtn.innerHTML = `
    <span>Sau</span>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `;
  nextBtn.disabled = page >= totalPages;
  nextBtn.onclick = () => onPageChange(page + 1);

  controls.appendChild(prevBtn);
  controls.appendChild(pageBadge);
  controls.appendChild(nextBtn);
  container.appendChild(controls);

  return container;
}
