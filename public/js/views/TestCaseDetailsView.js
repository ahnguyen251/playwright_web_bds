import { api } from '../api.js';
import { Badge } from '../components/Badge.js';
import { Pagination } from '../components/Pagination.js';
import { LoadingState } from '../components/LoadingState.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';
import { ResultDetailsModalClass } from '../components/ResultDetailsModal.js';

export class TestCaseDetailsViewClass {
  constructor() {
    this.root = null;
    this.testCaseId = null;
    this.page = 1;
    this.statusFilter = '';
    this.abortController = null;
    this.modal = new ResultDetailsModalClass();
  }

  async mount(rootElement, params) {
    this.root = rootElement;
    this.testCaseId = params.testCaseId;
    this.page = 1;
    this.statusFilter = '';

    this.renderContainer();
    await this.fetchAndRender();
  }

  unmount() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.root = null;
  }

  renderContainer() {
    this.root.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = '← Quay lại Danh Sách Test Case';
    backBtn.style.marginBottom = '24px';
    backBtn.onclick = () => {
      window.location.hash = '#test-cases';
    };
    this.root.appendChild(backBtn);

    this.headerArea = document.createElement('div');
    this.headerArea.className = 'card';
    this.headerArea.style.marginBottom = '24px';
    this.root.appendChild(this.headerArea);

    this.analyticsArea = document.createElement('div');
    this.analyticsArea.style.marginBottom = '24px';
    this.root.appendChild(this.analyticsArea);

    const controls = document.createElement('div');
    controls.className = 'filter-controls';
    controls.style.marginBottom = '16px';

    const statusSelect = document.createElement('select');
    statusSelect.className = 'input';
    statusSelect.style.width = '200px';
    statusSelect.innerHTML = `
      <option value="">Tất Cả Trạng Thái</option>
      <option value="PASSED">Thành Công</option>
      <option value="FAILED">Thất Bại</option>
      <option value="SKIPPED">Bỏ Qua</option>
    `;
    statusSelect.value = this.statusFilter;
    statusSelect.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.page = 1;
      this.fetchResultsOnly();
    });

    controls.appendChild(statusSelect);
    this.root.appendChild(controls);

    this.resultsArea = document.createElement('div');
    this.root.appendChild(this.resultsArea);
  }

  async fetchAndRender() {
    this.headerArea.innerHTML = '';
    this.headerArea.appendChild(LoadingState('Đang tải dữ liệu test case...'));
    this.resultsArea.innerHTML = '';
    this.resultsArea.appendChild(LoadingState('Đang tải lịch sử...'));

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      const tc = await api.getTestCaseById(this.testCaseId, { signal });
      this.renderHeader(tc);
      await this.fetchResultsOnly(signal);
      this.fetchAnalytics(signal); // Fire and forget, catches its own errors
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.headerArea.innerHTML = '';
      this.resultsArea.innerHTML = '';
      if (error.code === 'TEST_CASE_NOT_FOUND') {
        this.headerArea.appendChild(EmptyState('Không tìm thấy Test Case.'));
      } else {
        this.headerArea.appendChild(ErrorState(error));
      }
    }
  }

  renderHeader(tc) {
    this.headerArea.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <h2 style="margin: 0;" id="tc-title-id"></h2>
        <span id="tc-status-badge"></span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div><strong>Module:</strong> <span id="tc-module"></span></div>
        <div><strong>Testcase:</strong> <span id="tc-title"></span></div>
      </div>
    `;

    // Safely insert textContent
    this.headerArea.querySelector('#tc-title-id').textContent = tc.test_case_id;
    const badgeContainer = this.headerArea.querySelector('#tc-status-badge');
    badgeContainer.appendChild(Badge(tc.automation_status, tc.automation_status));
    this.headerArea.querySelector('#tc-module').textContent = tc.module || 'N/A';
    this.headerArea.querySelector('#tc-title').textContent = tc.title || 'N/A';
  }

  async fetchResultsOnly(passedSignal) {
    let signal = passedSignal;
    if (!signal) {
      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();
      signal = this.abortController.signal;
    }

    this.resultsArea.innerHTML = '';
    this.resultsArea.appendChild(LoadingState('Đang tải lịch sử thực thi...'));

    try {
      const data = await api.getTestCaseResults(this.testCaseId, this.page, 20, this.statusFilter, { signal });
      this.resultsArea.innerHTML = '';

      const totalExecutions = document.createElement('div');
      totalExecutions.style.marginBottom = '16px';
      totalExecutions.innerHTML = `<strong>Tổng Số Lần Chạy:</strong> <span id="tc-total-execs"></span>`;
      totalExecutions.querySelector('#tc-total-execs').textContent = data.pagination.totalItems;
      this.resultsArea.appendChild(totalExecutions);

      if (!data.items || data.items.length === 0) {
        this.resultsArea.appendChild(EmptyState('Không tìm thấy lịch sử thực thi.'));
        return;
      }

      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Mã Lần Chạy</th>
          <th>Thời Gian Chạy</th>
          <th>Dự Án</th>
          <th>Thời Gian</th>
          <th>Trạng Thái</th>
          <th>Hành Động</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.items.forEach(res => {
        const tr = document.createElement('tr');

        const tdRun = document.createElement('td');
        const aRun = document.createElement('a');
        aRun.href = `#runs/${encodeURIComponent(res.runId)}`;
        aRun.textContent = res.runId;
        aRun.className = 'link';
        tdRun.appendChild(aRun);

        const tdTime = document.createElement('td');
        tdTime.textContent = new Date(res.runTimestamp).toLocaleString();

        const tdProj = document.createElement('td');
        tdProj.textContent = res.projectName || 'N/A';

        const tdDur = document.createElement('td');
        tdDur.textContent = (res.durationMs / 1000).toFixed(1) + 's';

        const tdStatus = document.createElement('td');
        tdStatus.appendChild(Badge(res.status, res.status));

        const tdActions = document.createElement('td');
        const btnDetails = document.createElement('button');
        btnDetails.className = 'btn';
        btnDetails.textContent = 'Xem Chi Tiết';
        btnDetails.onclick = () => this.modal.open(res.resultId);
        tdActions.appendChild(btnDetails);

        tr.appendChild(tdRun);
        tr.appendChild(tdTime);
        tr.appendChild(tdProj);
        tr.appendChild(tdDur);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);
      this.resultsArea.appendChild(tableContainer);

      const paginationEl = Pagination(data.pagination, (newPage) => {
        this.page = newPage;
        this.fetchResultsOnly();
      });
      this.resultsArea.appendChild(paginationEl);

    } catch (error) {
      if (error.name === 'AbortError') return;
      this.resultsArea.innerHTML = '';
      this.resultsArea.appendChild(ErrorState(error));
    }
  }
  async fetchAnalytics(signal) {
    this.analyticsArea.innerHTML = '';
    this.analyticsArea.appendChild(LoadingState('Đang tải phân tích...'));
    try {
      const data = await api.getTestCaseAnalytics(this.testCaseId, { signal });
      this.renderAnalyticsPanel(data);
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.analyticsArea.innerHTML = '';
      this.analyticsArea.appendChild(ErrorState(error));
    }
  }

  renderAnalyticsPanel(data) {
    const formatPercent = (val) => val != null ? `${val}%` : 'N/A';
    const formatMs = (val) => val != null ? `${val} ms` : 'N/A';

    const maxDuration = data.trend.reduce((max, t) => Math.max(max, t.durationMs || 0), 0);

    const trendHtml = data.trend.map(t => {
      const heightPercent = maxDuration > 0 ? ((t.durationMs || 0) / maxDuration) * 100 : 0;
      const height = Math.max(heightPercent, 5);
      const flakyMarker = t.retryFlaky ? '<div class="flaky-marker" title="Không ổn định khi thử lại" aria-label="Không ổn định khi thử lại"></div>' : '';
      return `
        <div class="trend-point">
          <div class="trend-bar-wrapper">
            <div class="trend-bar" style="height: ${height}%" title="${t.durationMs || 0} ms"></div>
          </div>
          <div class="status-dot ${t.finalStatus.toLowerCase()}" title="${t.finalStatus} lúc ${new Date(t.executedAt).toLocaleString()}" aria-label="${t.finalStatus}"></div>
          ${flakyMarker}
        </div>
      `;
    }).join('');

    this.analyticsArea.innerHTML = `
      <div class="card analytics-panel">
        <h3 style="margin-bottom: 16px;">Phân Tích Độ Ổn Định (30 Ngày)</h3>
        <div class="analytics-grid">
          <div class="stat-card">
            <div class="stat-label">Số Lần Chạy Logic</div>
            <div class="stat-value">${data.summary.totalExecutions}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tỷ Lệ Pass</div>
            <div class="stat-value">${formatPercent(data.summary.passRatePercent)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label" title="Các lần chạy ban đầu bị lỗi nhưng thành công sau khi chạy lại.">Tỷ Lệ Lỗi (Flaky) ℹ️</div>
            <div class="stat-value">${formatPercent(data.summary.retryFlakyRatePercent)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label" title="Tần suất kết quả thay đổi giữa các lần chạy liên tiếp.">Tỷ Lệ Thay Đổi Trạng Thái ℹ️</div>
            <div class="stat-value">${formatPercent(data.stability.statusChangeRatePercent)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Thời Gian Trung Bình</div>
            <div class="stat-value">${formatMs(data.summary.averageDurationMs)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Trạng Thái Mới Nhất</div>
            <div class="stat-value">${data.summary.latestStatus || 'N/A'}</div>
          </div>
        </div>
        
        <div style="margin-top: 24px;">
          <h4 style="margin-bottom: 8px;">Xu Hướng Thực Thi (Mới Nhất ${data.window.trendLimit})</h4>
          ${data.trend.length > 0 ? `
            <div class="trend-chart">
              ${trendHtml}
            </div>
          ` : '<div class="text-muted">Không có dữ liệu xu hướng.</div>'}
        </div>
      </div>
    `;
  }
}

export const TestCaseDetailsView = new TestCaseDetailsViewClass();
