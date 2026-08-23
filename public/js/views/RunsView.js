import { api } from '../api.js';
import { Pagination } from '../components/Pagination.js';
import { LoadingState } from '../components/LoadingState.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';

export class RunsViewClass {
  constructor() {
    this.root = null;
    this.page = 1;
  }

  async mount(rootElement) {
    this.root = rootElement;
    await this.fetchAndRender();
  }

  unmount() {
    this.root = null;
  }

  async fetchAndRender() {
    this.root.innerHTML = '';
    this.root.appendChild(LoadingState('Đang tải danh sách lần chạy test...'));

    try {
      const data = await api.getRuns(this.page, 20);
      this.root.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        this.root.appendChild(EmptyState('Không tìm thấy lần chạy nào.'));
        return;
      }

      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Mã Lần Chạy</th>
          <th>Thời Gian Bắt Đầu</th>
          <th>Thời Gian</th>
          <th>Tổng Lần Chạy</th>
          <th>Thành Công / Thất Bại / Bỏ Qua</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.items.forEach(run => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        const link = document.createElement('a');
        link.href = `#runs/${encodeURIComponent(run.run_id)}`;
        link.textContent = run.run_id;
        link.style.color = 'var(--accent)';
        link.style.textDecoration = 'none';
        link.style.fontWeight = '500';
        tdId.appendChild(link);
        
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(run.started_at).toLocaleString();
        
        const tdDuration = document.createElement('td');
        tdDuration.textContent = `${(run.duration_ms / 1000).toFixed(1)}s`;
        
        const tdExecs = document.createElement('td');
        tdExecs.textContent = run.total_executions;
        
        const tdStats = document.createElement('td');
        tdStats.textContent = `${run.passed_executions} / ${run.failed_executions} / ${run.skipped_executions}`;

        tr.appendChild(tdId);
        tr.appendChild(tdDate);
        tr.appendChild(tdDuration);
        tr.appendChild(tdExecs);
        tr.appendChild(tdStats);
        
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);
      this.root.appendChild(tableContainer);

      const paginationEl = Pagination(data.pagination, (newPage) => {
        this.page = newPage;
        this.fetchAndRender();
      });
      this.root.appendChild(paginationEl);

    } catch (error) {
      this.root.innerHTML = '';
      this.root.appendChild(ErrorState(error));
    }
  }
}

export const RunsView = new RunsViewClass();
