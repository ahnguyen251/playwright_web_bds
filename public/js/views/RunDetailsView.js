import { api } from '../api.js';
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
    this.pageSize = 20;
    this.statusFilter = '';
    this.searchTerm = '';
    this.traceFilter = '';
    this.cachedRun = null;
    this.cachedResults = null;
  }

  async mount(rootElement, params) {
    this.root = rootElement;
    this.runId = params.runId;
    this.page = 1;
    this.statusFilter = '';
    this.searchTerm = '';
    this.traceFilter = '';

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = `Chi Tiết Lần Chạy`;
    }

    await this.fetchAndRender();
  }

  unmount() {
    this.root = null;
    this.cachedRun = null;
    this.cachedResults = null;
  }

  async fetchAndRender() {
    if (!this.root) return;
    this.root.innerHTML = '';
    this.root.appendChild(LoadingState('Đang tải thông tin chi tiết lần chạy...'));

    try {
      const [runData, resultsData] = await Promise.all([
        api.getRunById(this.runId),
        api.getRunResults(this.runId, this.page, this.pageSize, this.statusFilter)
      ]);

      this.cachedRun = runData;
      this.cachedResults = resultsData;
      this.render();
    } catch (error) {
      if (!this.root) return;
      this.root.innerHTML = '';
      this.root.appendChild(ErrorState(error));
    }
  }

  render() {
    if (!this.root || !this.cachedRun) return;
    this.root.innerHTML = '';

    const run = this.cachedRun;
    const results = this.cachedResults || { items: [], pagination: {} };
    const items = results.items || [];

    const total = run.total_executions || 0;
    const passed = run.passed_executions || 0;
    const failed = run.failed_executions || 0;
    const skipped = run.skipped_executions || 0;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;
    const isSuccess = failed === 0;

    const startDateStr = run.started_at ? new Date(run.started_at).toLocaleString('vi-VN') : 'Không rõ';
    const finishDateStr = run.finished_at ? new Date(run.finished_at).toLocaleString('vi-VN') : 'Không rõ';
    const durationSec = ((run.duration_ms || 0) / 1000).toFixed(1);

    const container = document.createElement('div');
    container.className = 'run-details-wrapper';

    // 1. Unified Page Header
    const headerSection = document.createElement('div');
    headerSection.className = 'page-title-row';
    headerSection.innerHTML = `
      <div class="page-title-group">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <h1 class="page-title-text" style="font-family: var(--font-mono); font-size: 1.25rem;">${run.run_id}</h1>
          <button type="button" class="btn-copy-id" id="btn-copy-header-id" title="Sao chép Run ID">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <span class="status-badge-chip ${isSuccess ? 'success' : 'failed'}">
            <span class="dot-indicator ${isSuccess ? 'green' : 'red'}" style="width: 6px; height: 6px; border-radius: 50%;"></span>
            <span>${isSuccess ? 'Thành công (100% Pass)' : `${failed} Test Thất Bại`}</span>
          </span>
        </div>
        <p class="page-subtitle-text">Bắt đầu: ${startDateStr} • Hoàn thành: ${finishDateStr} (${durationSec}s)</p>
      </div>
      <div class="page-title-actions">
        <a href="#runs" class="btn btn-export-file" style="height: 36px; padding: 0 14px; font-size: 0.8125rem; display: inline-flex; align-items: center; text-decoration: none;">
          ← Quay Lại Lịch Sử
        </a>
        <button type="button" class="btn btn-export-file" id="btn-export-run-detail" style="height: 36px; padding: 0 14px; font-size: 0.8125rem;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Xuất JSON</span>
        </button>
      </div>
    `;
    container.appendChild(headerSection);

    // Copy Run ID event
    const copyHeaderBtn = headerSection.querySelector('#btn-copy-header-id');
    if (copyHeaderBtn) {
      copyHeaderBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(run.run_id).then(() => {
          copyHeaderBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyHeaderBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            `;
          }, 1800);
        });
      });
    }

    // Export JSON event
    headerSection.querySelector('#btn-export-run-detail').addEventListener('click', () => {
      const exportObj = { run, results: items };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run-${run.run_id}-details.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // 2. 4 Modern KPI Cards Grid
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'summary-kpi-grid';
    kpiGrid.innerHTML = `
      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">TỔNG TEST EXECUTIONS</span>
          <div class="kpi-icon-box gray">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num">${total}</span>
          <span class="kpi-unit-text">kịch bản</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot green"></span>
          <span>${passed} Pass • ${failed} Fail • ${skipped} Skip</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">TỶ LỆ PASS RATE</span>
          <div class="kpi-icon-box green">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num text-green">${passRate}%</span>
          <span class="kpi-badge badge-green">${isSuccess ? '100% Sạch' : 'Có lỗi'}</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot green"></span>
          <span>${passed}/${total} test executions hoàn thành</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">THỜI LƯỢNG PHIÊN CHẠY</span>
          <div class="kpi-icon-box amber">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num">${durationSec}s</span>
          <span class="kpi-unit-text">tổng thời gian</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot amber"></span>
          <span>Tốc độ phản hồi Worker Pool</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">TRACEABILITY (LIÊN KẾT ID)</span>
          <div class="kpi-icon-box blue">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num text-blue">${run.mapped_executions || 0}/${total}</span>
          <span class="kpi-unit-text">đã gắn mã</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot blue"></span>
          <span><strong>${run.unique_mapped_test_case_ids_executed || 0}</strong> unique test case ID đã chạy</span>
        </div>
      </div>
    `;
    container.appendChild(kpiGrid);

    // 3. Execution Environment Overview Card
    const overviewCard = document.createElement('div');
    overviewCard.className = 'detail-overview-card';
    overviewCard.innerHTML = `
      <div class="detail-overview-top">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
            THÔNG TIN MÔI TRƯỜNG & PHIÊN THỰC THI
          </span>
          <h3 style="font-size: 1.125rem; font-weight: 700; color: #0f172a; margin-top: 4px;">
            Worker Pool #1 • Playwright Test Suite
          </h3>
        </div>
        <div class="detail-meta-list" style="margin-top: 0;">
          <div class="meta-chip-item">
            <span>Bắt đầu:</span>
            <strong>${startDateStr}</strong>
          </div>
          <div class="meta-chip-item">
            <span>Kết thúc:</span>
            <strong>${finishDateStr}</strong>
          </div>
          <div class="meta-chip-item">
            <span>Báo cáo HTML:</span>
            <strong>${run.report_path ? run.report_path : 'Allure / HTML'}</strong>
          </div>
        </div>
      </div>
    `;
    container.appendChild(overviewCard);

    // 4. Command Toolbar: Search & Filters
    const toolbar = document.createElement('div');
    toolbar.className = 'command-toolbar';
    toolbar.innerHTML = `
      <div class="search-input-wrap">
        <svg class="search-icon-inside" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text" 
          class="search-input-field" 
          id="detail-search-input" 
          placeholder="Tìm kiếm theo tiêu đề test, file kịch bản hoặc test case ID..." 
          value="${this.searchTerm}"
        />
      </div>

      <select class="filter-dropdown-select" id="detail-status-filter">
        <option value="" ${this.statusFilter === '' ? 'selected' : ''}>Tất Cả Trạng Thái</option>
        <option value="PASSED" ${this.statusFilter === 'PASSED' ? 'selected' : ''}>Thành Công (PASSED)</option>
        <option value="FAILED" ${this.statusFilter === 'FAILED' ? 'selected' : ''}>Thất Bại (FAILED)</option>
        <option value="SKIPPED" ${this.statusFilter === 'SKIPPED' ? 'selected' : ''}>Bỏ Qua (SKIPPED)</option>
      </select>

      <select class="filter-dropdown-select" id="detail-trace-filter" style="min-width: 170px;">
        <option value="" ${this.traceFilter === '' ? 'selected' : ''}>Tất Cả Liên Kết</option>
        <option value="MAPPED" ${this.traceFilter === 'MAPPED' ? 'selected' : ''}>Chỉ Đã Map ID</option>
        <option value="UNMAPPED" ${this.traceFilter === 'UNMAPPED' ? 'selected' : ''}>Chưa Map (UNMAPPED)</option>
      </select>
    `;
    container.appendChild(toolbar);

    // Toolbar Event Listeners
    toolbar.querySelector('#detail-search-input').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.renderResultsTable(tableContainer, paginationEl, items);
    });

    toolbar.querySelector('#detail-status-filter').addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.page = 1;
      this.fetchAndRender();
    });

    toolbar.querySelector('#detail-trace-filter').addEventListener('change', (e) => {
      this.traceFilter = e.target.value;
      this.renderResultsTable(tableContainer, paginationEl, items);
    });

    // 5. Results Table Container
    const tableContainer = document.createElement('div');
    tableContainer.className = 'data-table-card';
    container.appendChild(tableContainer);

    // 6. Pagination Container
    const paginationEl = document.createElement('div');
    container.appendChild(paginationEl);

    this.renderResultsTable(tableContainer, paginationEl, items);

    this.root.appendChild(container);
  }

  renderResultsTable(tableContainer, paginationContainer, allItems) {
    tableContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    const filteredItems = allItems.filter(res => {
      const titleMatch = !this.searchTerm || 
        (res.title && res.title.toLowerCase().includes(this.searchTerm)) ||
        (res.file_path && res.file_path.toLowerCase().includes(this.searchTerm)) ||
        (res.test_case_id && res.test_case_id.toLowerCase().includes(this.searchTerm));

      let traceMatch = true;
      if (this.traceFilter === 'MAPPED') {
        traceMatch = res.traceability_status === 'MAPPED';
      } else if (this.traceFilter === 'UNMAPPED') {
        traceMatch = res.traceability_status !== 'MAPPED';
      }

      return titleMatch && traceMatch;
    });

    if (filteredItems.length === 0) {
      tableContainer.appendChild(EmptyState(
        this.searchTerm || this.statusFilter || this.traceFilter
          ? 'Không tìm thấy kết quả test nào phù hợp với bộ lọc.'
          : 'Không có kết quả test nào trong lần chạy này.'
      ));
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'testcase-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 140px;">Trạng Thái</th>
        <th>Kịch Bản & Tiêu Đề</th>
        <th style="width: 160px;">Dự Án</th>
        <th style="width: 110px;">Thời Lượng</th>
        <th style="width: 130px;">Traceability</th>
        <th style="width: 160px; text-align: right;">Bằng Chứng & Chi Tiết</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    filteredItems.forEach(res => {
      const tr = document.createElement('tr');
      const isPass = res.status === 'PASSED';
      const isFail = res.status === 'FAILED';
      const durationSec = ((res.duration_ms || 0) / 1000).toFixed(1);
      const tcId = res.test_case_id || res.parsed_test_case_id;

      // Clean file path display
      let displayPath = res.file_path || '';
      if (displayPath.includes('tests')) {
        displayPath = displayPath.substring(displayPath.indexOf('tests'));
      }

      tr.innerHTML = `
        <!-- Trạng Thái -->
        <td>
          <span class="status-badge-chip ${isPass ? 'success' : isFail ? 'failed' : ''}">
            <span class="dot-indicator ${isPass ? 'green' : isFail ? 'red' : ''}" style="width: 6px; height: 6px; border-radius: 50%; background: ${isPass ? '#10b981' : isFail ? '#ef4444' : '#94a3b8'};"></span>
            <span>${res.status}</span>
          </span>
        </td>

        <!-- Kịch Bản & Tiêu Đề -->
        <td>
          <div class="scenario-title-cell">
            <div class="scenario-title-text">${res.title}</div>
            <div class="scenario-tags-row">
              ${tcId ? `
                <a href="#test-cases/${encodeURIComponent(tcId)}" class="tc-link-chip" title="Xem chi tiết test case ${tcId}">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <span>${tcId}</span>
                </a>
              ` : ''}
              <span class="scenario-file-path" title="${res.file_path}">${displayPath}</span>
            </div>
          </div>
        </td>

        <!-- Dự Án -->
        <td>
          <span class="project-pill">${res.project_name || 'Chromium'}</span>
        </td>

        <!-- Thời Lượng -->
        <td>
          <div class="duration-pill">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>${durationSec}s</span>
          </div>
        </td>

        <!-- Traceability -->
        <td>
          <span class="status-badge-chip ${res.traceability_status === 'MAPPED' ? 'success' : ''}" style="font-size: 0.6875rem;">
            ${res.traceability_status}
          </span>
        </td>

        <!-- Bằng Chứng & Chi Tiết -->
        <td style="text-align: right;">
          <button type="button" class="btn-detail-link btn-open-modal" data-result-id="${res.result_id}">
            <span>Xem Bằng Chứng</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </td>
      `;

      // Open Modal Handler
      const openModalBtn = tr.querySelector('.btn-open-modal');
      if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
          ResultDetailsModal.open(res.result_id);
        });
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tableContainer.appendChild(tableWrapper);

    // Pagination
    if (this.cachedResults && this.cachedResults.pagination) {
      const paginationEl = Pagination(this.cachedResults.pagination, (newPage) => {
        this.page = newPage;
        this.fetchAndRender();
      });
      paginationContainer.appendChild(paginationEl);
    }
  }
}

export const RunDetailsView = new RunDetailsViewClass();
