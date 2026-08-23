import { api } from '../api.js';
import { Badge } from '../components/Badge.js';
import { MetricCard } from '../components/MetricCard.js';
import { Pagination } from '../components/Pagination.js';
import { LoadingState } from '../components/LoadingState.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';
import { ResultDetailsModal } from '../components/ResultDetailsModal.js';

export class RunDetailsViewClass {
  constructor() {
    this.root = null;
    this.runId = null;
    this.page = 1;
    this.statusFilter = '';
  }

  async mount(rootElement, params) {
    this.root = rootElement;
    this.runId = params.runId;
    this.page = 1;
    this.statusFilter = '';
    
    // Change page title to include runId securely
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = `Chi Tiết Lần Chạy`;
    }

    await this.fetchAndRender();
  }

  unmount() {
    this.root = null;
  }

  async fetchAndRender() {
    this.root.innerHTML = '';
    this.root.appendChild(LoadingState('Đang tải chi tiết lần chạy...'));

    try {
      const runData = await api.getRunById(this.runId);
      const resultsData = await api.getRunResults(this.runId, this.page, 20, this.statusFilter);
      
      this.root.innerHTML = '';

      // Back button
      const backBtn = document.createElement('button');
      backBtn.className = 'btn';
      backBtn.textContent = '← Quay lại Lịch Sử Chạy';
      backBtn.style.marginBottom = '24px';
      backBtn.onclick = () => window.location.hash = 'runs';
      this.root.appendChild(backBtn);

      // Summary Header
      const headerTitle = document.createElement('h3');
      headerTitle.textContent = runData.run_id;
      headerTitle.style.marginBottom = '16px';
      this.root.appendChild(headerTitle);

      const grid = document.createElement('div');
      grid.className = 'metrics-grid';
      grid.appendChild(MetricCard('Bắt Đầu', new Date(runData.started_at).toLocaleString()));
      grid.appendChild(MetricCard('Thời Gian', `${(runData.duration_ms / 1000).toFixed(1)}s`));
      grid.appendChild(MetricCard('Tổng Cộng', runData.total_executions));
      grid.appendChild(MetricCard('Thành Công', runData.passed_executions));
      grid.appendChild(MetricCard('Thất Bại', runData.failed_executions));
      grid.appendChild(MetricCard('Bỏ Qua', runData.skipped_executions));
      this.root.appendChild(grid);

      // Filters
      const controls = document.createElement('div');
      controls.className = 'search-container';
      controls.style.marginTop = '32px';
      
      const select = document.createElement('select');
      select.className = 'input';
      select.innerHTML = `
        <option value="">Tất Cả Trạng Thái</option>
        <option value="PASSED">Thành Công</option>
        <option value="FAILED">Thất Bại</option>
        <option value="SKIPPED">Bỏ Qua</option>
      `;
      select.value = this.statusFilter;
      select.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.page = 1;
        this.fetchAndRender();
      };
      controls.appendChild(select);
      this.root.appendChild(controls);

      // Results Table
      if (!resultsData.items || resultsData.items.length === 0) {
        this.root.appendChild(EmptyState('Không tìm thấy kết quả test nào cho lần chạy này.'));
        return;
      }

      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';

      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Trạng Thái</th>
            <th>Tiêu Đề</th>
            <th>Dự Án</th>
            <th>Thời Gian</th>
            <th>Map</th>
            <th>Hành Động</th>
          </tr>
        </thead>
      `;

      const tbody = document.createElement('tbody');
      resultsData.items.forEach(res => {
        const tr = document.createElement('tr');
        
        const tdStatus = document.createElement('td');
        tdStatus.appendChild(Badge(res.status, res.status));

        const tdTitle = document.createElement('td');
        tdTitle.textContent = res.title;

        const tdProject = document.createElement('td');
        tdProject.textContent = res.project_name || 'N/A';

        const tdDuration = document.createElement('td');
        tdDuration.textContent = `${(res.duration_ms / 1000).toFixed(1)}s`;

        const tdTrace = document.createElement('td');
        tdTrace.appendChild(Badge(res.traceability_status, res.traceability_status));

        const tdAction = document.createElement('td');
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn';
        viewBtn.textContent = 'Xem';
        viewBtn.onclick = () => ResultDetailsModal.open(res.result_id);
        tdAction.appendChild(viewBtn);

        tr.appendChild(tdStatus);
        tr.appendChild(tdTitle);
        tr.appendChild(tdProject);
        tr.appendChild(tdDuration);
        tr.appendChild(tdTrace);
        tr.appendChild(tdAction);
        
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);
      this.root.appendChild(tableContainer);

      const paginationEl = Pagination(resultsData.pagination, (newPage) => {
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

export const RunDetailsView = new RunDetailsViewClass();
