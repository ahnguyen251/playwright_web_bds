import { api } from '../api.js';
import { Pagination } from '../components/Pagination.js';
import { LoadingState } from '../components/LoadingState.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';

export class RunsViewClass {
  constructor() {
    this.root = null;
    this.page = 1;
    this.pageSize = 20;
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.runType = 'SUITE';
    this.cachedData = null;
  }

  async mount(rootElement) {
    this.root = rootElement;
    this.page = 1;
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.runType = 'SUITE';
    await this.fetchAndRender();
  }

  unmount() {
    this.root = null;
    this.cachedData = null;
  }

  formatRelativeTime(isoString) {
    if (!isoString) return 'Không rõ';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  }

  async fetchAndRender() {
    if (!this.root) return;
    this.root.innerHTML = '';
    this.root.appendChild(LoadingState('Đang tải danh sách lịch sử chạy test...'));

    try {
      const data = await api.getRuns(this.page, this.pageSize, { runType: this.runType });
      this.cachedData = data;
      this.render();
    } catch (error) {
      if (!this.root) return;
      this.root.innerHTML = '';
      this.root.appendChild(ErrorState(error));
    }
  }

  render() {
    if (!this.root || !this.cachedData) return;
    this.root.innerHTML = '';

    const data = this.cachedData;
    const items = data.items || [];
    const pagination = data.pagination || { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };

    // Calculate aggregated stats across items
    let totalExecs = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDurationMs = 0;

    items.forEach(r => {
      totalExecs += (r.total_executions || 0);
      totalPassed += (r.passed_executions || 0);
      totalFailed += (r.failed_executions || 0);
      totalDurationMs += (r.duration_ms || 0);
    });

    const avgPassRate = totalExecs > 0 ? ((totalPassed / totalExecs) * 100).toFixed(1) : '100.0';
    const avgDurationSec = items.length > 0 ? (totalDurationMs / items.length / 1000).toFixed(1) : '0.0';

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Filter items locally based on search and status
    const filteredItems = items.filter(run => {
      const matchesSearch = !this.searchTerm || 
        (run.run_id && run.run_id.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      let matchesStatus = true;
      if (this.statusFilter === 'PASSED') {
        matchesStatus = (run.failed_executions || 0) === 0;
      } else if (this.statusFilter === 'FAILED') {
        matchesStatus = (run.failed_executions || 0) > 0;
      }

      return matchesSearch && matchesStatus;
    });

    const container = document.createElement('div');
    container.className = 'runs-view-wrapper';

    // 1. Header & Breadcrumb
    const headerSection = document.createElement('div');
    headerSection.className = 'apm-header-container';
    headerSection.innerHTML = `
      <div class="apm-breadcrumb-row">
        <div class="apm-breadcrumb">
          <a href="#summary" class="apm-breadcrumb-link">Bảng điều khiển</a>
          <span class="breadcrumb-sep">›</span>
          <span style="color: var(--text-main); font-weight: 600;">Lịch Sử Chạy Test</span>
        </div>
        <div class="apm-header-actions">
          <button type="button" class="btn btn-export-file" id="btn-refresh-runs" style="padding: 7px 14px; font-size: 0.8125rem;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>Làm Mới</span>
          </button>
          <button type="button" class="btn btn-export-file" id="btn-export-runs" style="padding: 7px 14px; font-size: 0.8125rem;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Xuất Lịch Sử</span>
          </button>
        </div>
      </div>

      <div class="apm-title-row">
        <div>
          <h1 class="apm-title-main">Lịch Sử Chạy Test - Playwright APM</h1>
          <p class="apm-subtitle">Nhật ký thực thi kịch bản kiểm thử tự động, theo dõi thời gian chạy và tỷ lệ thành công qua các phiên CI/CD.</p>
        </div>
        <div class="apm-sync-pill">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Đồng bộ lần cuối: <strong>Vừa xong (${timeStr})</strong></span>
        </div>
      </div>
    `;
    container.appendChild(headerSection);

    // Refresh and Export handlers
    headerSection.querySelector('#btn-refresh-runs').addEventListener('click', () => {
      this.fetchAndRender();
    });

    headerSection.querySelector('#btn-export-runs').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apm-test-runs-history-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // 2. 4 Modern KPI Cards Grid
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'runs-kpi-grid';
    kpiGrid.innerHTML = `
      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">${this.runType === 'SINGLE' ? 'TỔNG LẦN CHẠY RIÊNG LẺ' : 'TỔNG LẦN CHẠY THEO NHÓM'}</span>
          <div class="kpi-icon-box gray">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num">${pagination.totalItems}</span>
          <span class="kpi-badge badge-green">Hoạt động</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot blue"></span>
          <span>${this.runType === 'SINGLE' ? 'Các lần chạy thử từng test case qua Web Runner' : 'Phiên thực thi bộ Test Suite trên hệ thống'}</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">TỶ LỆ PASS TRUNG BÌNH</span>
          <div class="kpi-icon-box green">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num">${avgPassRate}%</span>
          <span class="kpi-unit-text">trên trang này</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot green"></span>
          <span>Độ ổn định kịch bản kiểm thử cao</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">TỔNG EXECUTIONS</span>
          <div class="kpi-icon-box blue">
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
          <span class="kpi-big-num">${totalExecs}</span>
          <span class="kpi-unit-text">executions</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot blue"></span>
          <span>Lượt kịch bản test case đã chạy</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">THỜI LƯỢNG TRUNG BÌNH</span>
          <div class="kpi-icon-box amber">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num">${avgDurationSec}s</span>
          <span class="kpi-unit-text">/ lần chạy</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot amber"></span>
          <span>Tốc độ phản hồi CI/CD tự động</span>
        </div>
      </div>
    `;
    container.appendChild(kpiGrid);

    // Segmented Tabs: Chạy Theo Nhóm vs Chạy Riêng Lẻ
    const modeTabs = document.createElement('div');
    modeTabs.className = 'runs-mode-tabs-container';
    modeTabs.innerHTML = `
      <button type="button" class="runs-mode-tab ${this.runType === 'SUITE' ? 'is-active' : ''}" data-run-type="SUITE">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>Chạy Theo Nhóm (Suite Runs)</span>
      </button>
      <button type="button" class="runs-mode-tab ${this.runType === 'SINGLE' ? 'is-active' : ''}" data-run-type="SINGLE">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>Chạy Riêng Lẻ (Single Runs)</span>
      </button>
    `;

    modeTabs.querySelectorAll('.runs-mode-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const targetType = tabBtn.dataset.runType;
        if (targetType && targetType !== this.runType) {
          this.runType = targetType;
          this.page = 1;
          this.searchTerm = '';
          this.statusFilter = 'ALL';
          this.fetchAndRender();
        }
      });
    });

    container.appendChild(modeTabs);

    // 3. Search & Filter Command Bar
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
          id="runs-search-input" 
          placeholder="Tìm kiếm theo mã Run ID..." 
          value="${this.searchTerm}"
        />
      </div>

      <select class="filter-dropdown-select" id="runs-status-filter">
        <option value="ALL" ${this.statusFilter === 'ALL' ? 'selected' : ''}>Tất cả trạng thái</option>
        <option value="PASSED" ${this.statusFilter === 'PASSED' ? 'selected' : ''}>Thành công (100% Pass)</option>
        <option value="FAILED" ${this.statusFilter === 'FAILED' ? 'selected' : ''}>Có test thất bại</option>
      </select>

      <select class="filter-dropdown-select" id="runs-pagesize-filter" style="min-width: 150px;">
        <option value="20" ${this.pageSize === 20 ? 'selected' : ''}>20 mục / trang</option>
        <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50 mục / trang</option>
      </select>
    `;
    container.appendChild(toolbar);

    // Toolbar Event Listeners
    const searchInput = toolbar.querySelector('#runs-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim();
      this.renderTableContent(tableContainer, paginationEl, items);
    });

    const statusSelect = toolbar.querySelector('#runs-status-filter');
    statusSelect.addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.renderTableContent(tableContainer, paginationEl, items);
    });

    const pageSizeSelect = toolbar.querySelector('#runs-pagesize-filter');
    pageSizeSelect.addEventListener('change', (e) => {
      this.pageSize = parseInt(e.target.value, 10);
      this.page = 1;
      this.fetchAndRender();
    });

    // 4. Data Table Card
    const tableContainer = document.createElement('div');
    tableContainer.className = 'data-table-card';
    container.appendChild(tableContainer);

    // 5. Pagination Container
    const paginationEl = document.createElement('div');
    container.appendChild(paginationEl);

    // Render Table & Pagination initially
    this.renderTableContent(tableContainer, paginationEl, items);

    this.root.appendChild(container);
  }

  renderTableContent(tableContainer, paginationContainer, allItems) {
    tableContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    const filteredItems = allItems.filter(run => {
      const matchesSearch = !this.searchTerm || 
        (run.run_id && run.run_id.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      let matchesStatus = true;
      if (this.statusFilter === 'PASSED') {
        matchesStatus = (run.failed_executions || 0) === 0;
      } else if (this.statusFilter === 'FAILED') {
        matchesStatus = (run.failed_executions || 0) > 0;
      }

      return matchesSearch && matchesStatus;
    });

    if (filteredItems.length === 0) {
      const emptyMsg = this.runType === 'SINGLE'
        ? (this.searchTerm || this.statusFilter !== 'ALL'
            ? 'Không tìm thấy lần chạy riêng lẻ nào phù hợp với bộ lọc.'
            : 'Chưa có lần chạy riêng lẻ nào. Hãy bấm nút Play ở Danh Sách Test Case để chạy thử.')
        : (this.searchTerm || this.statusFilter !== 'ALL'
            ? 'Không tìm thấy lần chạy theo nhóm nào phù hợp với bộ lọc.'
            : 'Không tìm thấy lần chạy theo nhóm nào.');
      tableContainer.appendChild(EmptyState(emptyMsg));
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'testcase-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 260px;">Mã Lần Chạy</th>
        <th style="width: 180px;">Thời Gian Bắt Đầu</th>
        <th style="width: 100px;">Thời Lượng</th>
        <th>Tiến Độ Thực Thi</th>
        <th style="width: 130px;">Trạng Thái</th>
        <th style="width: 140px;">Traceability</th>
        <th style="width: 110px; text-align: right;">Thao Tác</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    filteredItems.forEach(run => {
      const tr = document.createElement('tr');

      const total = run.total_executions || 0;
      const passed = run.passed_executions || 0;
      const failed = run.failed_executions || 0;
      const skipped = run.skipped_executions || 0;

      const passedPct = total > 0 ? (passed / total) * 100 : 0;
      const failedPct = total > 0 ? (failed / total) * 100 : 0;
      const skippedPct = total > 0 ? (skipped / total) * 100 : 0;

      const isSuccess = failed === 0;
      const durationSec = ((run.duration_ms || 0) / 1000).toFixed(1);
      const relativeTime = this.formatRelativeTime(run.started_at);
      const fullDateStr = run.started_at ? new Date(run.started_at).toLocaleString('vi-VN') : 'Không rõ';

      const isSingleRun = (run.run_id && run.run_id.startsWith('adhoc-')) || this.runType === 'SINGLE';
      const badgeHtml = isSingleRun
        ? `<span class="run-trigger-badge single">Web Runner • Chạy riêng lẻ</span>`
        : `<span class="run-trigger-badge suite">Worker Pool #1 • Scheduled CI</span>`;

      tr.innerHTML = `
        <!-- Mã Lần Chạy -->
        <td>
          <div class="run-id-cell">
            <div>
              <a href="#runs/${encodeURIComponent(run.run_id)}" class="run-id-text" title="Xem chi tiết lần chạy">
                ${run.run_id}
              </a>
              ${badgeHtml}
            </div>
            <button type="button" class="btn-copy-id" title="Sao chép Run ID" data-run-id="${run.run_id}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </td>

        <!-- Thời Gian Bắt Đầu -->
        <td>
          <div class="time-cell-main">${relativeTime}</div>
          <div class="time-cell-sub">${fullDateStr}</div>
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

        <!-- Tiến Độ Thực Thi -->
        <td>
          <div class="execution-progress-wrap">
            <div class="execution-multi-bar">
              <div class="exec-bar-passed" style="width: ${passedPct}%;"></div>
              <div class="exec-bar-failed" style="width: ${failedPct}%;"></div>
              <div class="exec-bar-skipped" style="width: ${skippedPct}%;"></div>
            </div>
            <div class="exec-breakdown-tags">
              <span class="exec-tag passed">
                <strong>${passed}</strong> Pass
              </span>
              <span class="exec-tag ${failed > 0 ? 'failed' : ''}">
                • <strong>${failed}</strong> Fail
              </span>
              ${skipped > 0 ? `<span class="exec-tag skipped">• <strong>${skipped}</strong> Skip</span>` : ''}
              <span style="color: var(--text-subtle); margin-left: auto;">${total} total</span>
            </div>
          </div>
        </td>

        <!-- Trạng Thái -->
        <td>
          <span class="status-badge-chip ${isSuccess ? 'success' : 'failed'}">
            <span class="dot-indicator ${isSuccess ? 'green' : 'red'}" style="width: 6px; height: 6px; border-radius: 50%;"></span>
            <span>${isSuccess ? 'Thành công' : 'Có lỗi'}</span>
          </span>
        </td>

        <!-- Traceability -->
        <td>
          <div class="trace-badge">
            <span>Mapped: <strong>${run.mapped_executions || 0}</strong></span>
            ${(run.unmapped_executions || 0) > 0 ? `<br><span style="color: #d97706; font-size: 0.6875rem;">Unmapped: ${run.unmapped_executions}</span>` : ''}
          </div>
        </td>

        <!-- Thao Tác -->
        <td style="text-align: right;">
          <a href="#runs/${encodeURIComponent(run.run_id)}" class="btn-detail-link">
            <span>Chi Tiết</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </td>
      `;

      // Copy run ID event listener
      const copyBtn = tr.querySelector('.btn-copy-id');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const runIdToCopy = copyBtn.getAttribute('data-run-id');
          navigator.clipboard.writeText(runIdToCopy).then(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            `;
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              `;
            }, 1800);
          });
        });
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tableContainer.appendChild(tableWrapper);

    // Bottom pagination component
    const paginationEl = Pagination(this.cachedData.pagination, (newPage) => {
      this.page = newPage;
      this.fetchAndRender();
    });
    paginationContainer.appendChild(paginationEl);
  }
}

export const RunsView = new RunsViewClass();
