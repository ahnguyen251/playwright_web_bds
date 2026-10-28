import { api } from '../api.js';
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
    this.pageSize = 20;
    this.statusFilter = '';
    this.runType = 'SUITE';
    this.searchTerm = '';
    this.abortController = null;
    this.cachedTestCase = null;
    this.cachedAnalytics = null;
    this.cachedResults = null;
    this.modal = new ResultDetailsModalClass();
  }

  async mount(rootElement, params) {
    this.root = rootElement;
    this.testCaseId = params.testCaseId;
    this.page = 1;
    this.pageSize = 20;
    this.statusFilter = '';
    this.runType = 'SUITE';
    this.searchTerm = '';

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = `Chi Tiết Test Case`;
    }

    await this.fetchAndRenderAll();
  }

  unmount() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.root = null;
    this.cachedTestCase = null;
    this.cachedAnalytics = null;
    this.cachedResults = null;
  }

  async fetchAndRenderAll() {
    if (!this.root) return;
    this.root.innerHTML = '';
    this.root.appendChild(LoadingState('Đang tải dữ liệu kịch bản kiểm thử và phân tích...'));

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      const [tcData, analyticsData, resultsData] = await Promise.all([
        api.getTestCaseById(this.testCaseId, { signal }),
        api.getTestCaseAnalytics(this.testCaseId, { signal }).catch(() => null),
        api.getTestCaseResults(this.testCaseId, this.page, this.pageSize, { status: this.statusFilter, runType: this.runType }, { signal })
      ]);

      this.cachedTestCase = tcData;
      this.cachedAnalytics = analyticsData;
      this.cachedResults = resultsData;

      this.render();
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (!this.root) return;
      this.root.innerHTML = '';
      if (error.code === 'TEST_CASE_NOT_FOUND') {
        this.root.appendChild(EmptyState(`Không tìm thấy Test Case ID: ${this.testCaseId}`));
      } else {
        this.root.appendChild(ErrorState(error));
      }
    }
  }

  render() {
    if (!this.root || !this.cachedTestCase) return;
    this.root.innerHTML = '';

    const tc = this.cachedTestCase;
    const analytics = this.cachedAnalytics || {
      summary: { totalExecutions: 0, passed: 0, failed: 0, passRatePercent: 0, averageDurationMs: null, retryFlakyRatePercent: 0 },
      stability: { statusChanges: 0, statusChangeRatePercent: 0 },
      trend: [],
      window: { trendLimit: 20 }
    };
    const results = this.cachedResults || { items: [], pagination: {} };
    const items = results.items || [];

    const isAutomated = tc.automation_status === 'AUTOMATED';
    const totalExecs = analytics.summary.totalExecutions || 0;
    const passRate = analytics.summary.passRatePercent != null ? analytics.summary.passRatePercent : 0;
    const flakyRate = analytics.summary.retryFlakyRatePercent != null ? analytics.summary.retryFlakyRatePercent : 0;
    const avgDuration = analytics.summary.averageDurationMs != null 
      ? `${(analytics.summary.averageDurationMs / 1000).toFixed(1)}s` 
      : 'N/A';

    const container = document.createElement('div');
    container.className = 'tc-details-wrapper';

    // 1. Header & Breadcrumbs
    const headerSection = document.createElement('div');
    headerSection.className = 'apm-header-container';
    headerSection.innerHTML = `
      <div class="apm-breadcrumb-row">
        <div class="apm-breadcrumb">
          <a href="#summary" class="apm-breadcrumb-link">Bảng điều khiển</a>
          <span class="breadcrumb-sep">›</span>
          <a href="#test-cases" class="apm-breadcrumb-link">Danh Sách Test Case</a>
          <span class="breadcrumb-sep">›</span>
          <span style="color: var(--text-main); font-weight: 600;">${tc.test_case_id}</span>
        </div>
        <div class="apm-header-actions">
          <a href="#test-cases" class="btn btn-export-file" style="padding: 7px 14px; font-size: 0.8125rem;">
            ← Quay Lại Danh Sách
          </a>
          <button type="button" class="btn btn-export-file" id="btn-export-tc-json" style="padding: 7px 14px; font-size: 0.8125rem;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Xuất Phân Tích JSON</span>
          </button>
          ${isAutomated ? `
            <div style="display: inline-flex; align-items: center; gap: 8px; background: #eff6ff; padding: 4px 10px; border-radius: 8px; border: 1.5px solid #2563eb;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #1d4ed8; white-space: nowrap;">TRÌNH DUYỆT:</span>
              <select id="select-run-browser" class="form-select" style="padding: 6px 10px; font-size: 0.8125rem; font-weight: 600; border-radius: 6px; border: 1px solid #93c5fd; background: #ffffff; color: #1e293b; cursor: pointer;" title="Chọn dự án / trình duyệt để chạy">
                <option value="chromium" selected>🌐 Chromium (Chrome)</option>
                <option value="firefox">🦊 Firefox</option>
                <option value="webkit">🧭 WebKit (Safari)</option>
              </select>
              <button type="button" class="btn btn-primary" id="btn-run-tc" style="padding: 7px 14px; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>Chạy Test Case Này</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="apm-title-row">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap;">
            <h1 class="apm-title-main" id="tc-title-id" style="font-family: Consolas, monospace;">${tc.test_case_id}</h1>
            <button type="button" class="btn-copy-id" id="btn-copy-tc-id" title="Sao chép Test Case ID">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <span class="status-pill ${tc.automation_status.toLowerCase().replace('_', '-')}" style="font-size: 0.75rem;">
              <span class="status-dot-circle"></span>
              <span>${tc.automation_status}</span>
            </span>
          </div>
          <p class="apm-subtitle" style="font-size: 1rem; color: #1e293b; font-weight: 500;">
            ${tc.title}
          </p>
          <div class="detail-meta-list" style="margin-top: 10px;">
            <div class="meta-chip-item">
              <span>Mô-đun:</span>
              <strong>${tc.module || 'N/A'}</strong>
            </div>
            ${tc.script_path ? `
              <div class="meta-chip-item">
                <span>File kịch bản:</span>
                <span class="code-path-chip" id="script-path-text">${tc.script_path}</span>
                <button type="button" class="btn-copy-id" id="btn-copy-script-path" title="Sao chép đường dẫn kịch bản" style="padding: 1px 3px;">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            ` : ''}
            <div class="meta-chip-item">
              <span>Cập nhật:</span>
              <strong>${tc.updated_at ? new Date(tc.updated_at).toLocaleDateString('vi-VN') : 'Không rõ'}</strong>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(headerSection);

    // Copy handlers
    const copyTcIdBtn = headerSection.querySelector('#btn-copy-tc-id');
    if (copyTcIdBtn) {
      copyTcIdBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(tc.test_case_id).then(() => {
          copyTcIdBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyTcIdBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            `;
          }, 1800);
        });
      });
    }

    const copyScriptBtn = headerSection.querySelector('#btn-copy-script-path');
    if (copyScriptBtn && tc.script_path) {
      copyScriptBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(tc.script_path).then(() => {
          copyScriptBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#10b981" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyScriptBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            `;
          }, 1800);
        });
      });
    }

    // Export JSON
    headerSection.querySelector('#btn-export-tc-json').addEventListener('click', () => {
      const exportObj = { testCase: tc, analytics, results: items };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-case-${tc.test_case_id}-analytics.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Run Test Case button
    const runTcBtn = headerSection.querySelector('#btn-run-tc');
    const runBrowserSelect = headerSection.querySelector('#select-run-browser');
    if (runTcBtn) {
      runTcBtn.addEventListener('click', async () => {
        if (runTcBtn.disabled) return;
        runTcBtn.disabled = true;
        if (runBrowserSelect) runBrowserSelect.disabled = true;
        const origContent = runTcBtn.innerHTML;
        const selectedBrowser = runBrowserSelect?.value || 'chromium';
        const browserNames = {
          chromium: 'Chromium',
          firefox: 'Firefox',
          webkit: 'WebKit',
        };
        const browserDisplay = browserNames[selectedBrowser] || selectedBrowser;
        runTcBtn.innerHTML = `
          <svg class="spinner" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
          </svg>
          <span>Đang chạy (${browserDisplay})...</span>
        `;
        try {
          const res = await api.runTestCase(tc.test_case_id, { browser: selectedBrowser });
          this.runType = 'SINGLE';
          this.page = 1;
          await this.fetchAndRenderAll();
          if (res.resultId) {
            this.modal.open(res.resultId);
          }
          if (res.status === 'SKIPPED') {
            alert(`⚠️ Test case ${tc.test_case_id} được BỎ QUA (SKIPPED) do chính sách an toàn môi trường: Không thực hiện tạo tài khoản thử nghiệm bừa bãi trên Production.`);
          }
        } catch (err) {
          alert('✕ Lỗi thực thi ' + tc.test_case_id + ': ' + (err.message || 'Lỗi không xác định'));
        } finally {
          runTcBtn.disabled = false;
          if (runBrowserSelect) runBrowserSelect.disabled = false;
          runTcBtn.innerHTML = origContent;
        }
      });
    }

    // 2. 4 Modern KPI Cards Grid
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'summary-kpi-grid';
    kpiGrid.innerHTML = `
      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">TRẠNG THÁI TỰ ĐỘNG</span>
          <div class="kpi-icon-box ${isAutomated ? 'green' : 'amber'}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num" style="font-size: 1.625rem;">${isAutomated ? 'ĐÃ HOÀN TẤT' : 'CHƯA TỰ ĐỘNG'}</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot ${isAutomated ? 'green' : 'amber'}"></span>
          <span>${isAutomated ? 'Script Playwright sẵn sàng chạy CI' : 'Cần ưu tiên viết script kiểm thử'}</span>
        </div>
      </div>

      <div class="kpi-modern-card">
        <div class="kpi-header-row">
          <span class="kpi-header-label">LƯỢT CHẠY (30 NGÀY)</span>
          <div class="kpi-icon-box gray">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-big-num">${totalExecs}</span>
          <span class="kpi-unit-text">phiên</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot blue"></span>
          <span>${analytics.summary.passed || 0} Pass • ${analytics.summary.failed || 0} Fail</span>
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
        </div>
        <div class="kpi-card-footer">
          <span class="dot green"></span>
          <span>Tính trên toàn bộ các lần chạy gần nhất</span>
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
          <span class="kpi-big-num">${avgDuration}</span>
        </div>
        <div class="kpi-card-footer">
          <span class="dot amber"></span>
          <span>Tỷ lệ Flaky (chạy lại mới pass): <strong>${flakyRate}%</strong></span>
        </div>
      </div>
    `;
    container.appendChild(kpiGrid);

    // 3. Analytics Stability & Trend Panel
    const analyticsBox = document.createElement('div');
    analyticsBox.className = 'analytics-modern-box';

    const maxDuration = analytics.trend ? analytics.trend.reduce((max, t) => Math.max(max, t.durationMs || 0), 0) : 0;
    const trendHtml = (analytics.trend && analytics.trend.length > 0) ? analytics.trend.map(t => {
      const heightPercent = maxDuration > 0 ? ((t.durationMs || 0) / maxDuration) * 100 : 0;
      const height = Math.max(heightPercent, 8);
      const flakyMarker = t.retryFlaky ? '<div class="flaky-marker" title="Không ổn định khi thử lại" aria-label="Không ổn định khi thử lại"></div>' : '';
      return `
        <div class="trend-point">
          <div class="trend-bar-wrapper">
            <div class="trend-bar" style="height: ${height}%" title="${t.durationMs || 0} ms"></div>
          </div>
          <div class="status-dot ${t.finalStatus ? t.finalStatus.toLowerCase() : 'skipped'}" title="${t.finalStatus} lúc ${new Date(t.executedAt).toLocaleString()}" aria-label="${t.finalStatus}"></div>
          ${flakyMarker}
        </div>
      `;
    }).join('') : '';

    analyticsBox.innerHTML = `
      <div class="analytics-modern-header">
        <div>
          <h3 class="analytics-modern-title">Phân Tích Độ Ổn Định & Xu Hướng Thực Thi (30 Ngày)</h3>
          <p class="bottom-card-subtitle">Đo lường tính ổn định, độ tin cậy và tốc độ phản hồi qua các phiên kiểm thử</p>
        </div>
      </div>

      <div class="analytics-grid">
        <div class="analytics-stat-pill">
          <span class="analytics-stat-label">Số Lần Chạy Logic</span>
          <span class="analytics-stat-val">${totalExecs}</span>
        </div>
        <div class="analytics-stat-pill">
          <span class="analytics-stat-label">Tỷ Lệ Pass</span>
          <span class="analytics-stat-val text-green">${passRate}%</span>
        </div>
        <div class="analytics-stat-pill">
          <span class="analytics-stat-label" title="Các lần chạy ban đầu lỗi nhưng thành công sau khi chạy lại.">Tỷ Lệ Lỗi (Flaky) ℹ️</span>
          <span class="analytics-stat-val">${flakyRate}%</span>
        </div>
        <div class="analytics-stat-pill">
          <span class="analytics-stat-label" title="Tần suất kết quả thay đổi giữa các lần chạy liên tiếp.">Tỷ Lệ Đổi Trạng Thái ℹ️</span>
          <span class="analytics-stat-val">${analytics.stability.statusChangeRatePercent || 0}%</span>
        </div>
        <div class="analytics-stat-pill">
          <span class="analytics-stat-label">Thời Lượng TB</span>
          <span class="analytics-stat-val">${avgDuration}</span>
        </div>
        <div class="analytics-stat-pill">
          <span class="analytics-stat-label">Trạng Thái Gần Nhất</span>
          <span class="analytics-stat-val">${analytics.summary.latestStatus || 'N/A'}</span>
        </div>
      </div>

      <div class="trend-section-title">
        Xu Hướng Thực Thi Gần Nhất (${analytics.trend ? analytics.trend.length : 0} phiên)
      </div>
      ${trendHtml ? `
        <div class="trend-chart">
          ${trendHtml}
        </div>
      ` : '<div style="color: var(--text-muted); font-size: 0.8125rem; padding: 12px 0;">Chưa có dữ liệu xu hướng thực thi trong 30 ngày qua.</div>'}
    `;
    container.appendChild(analyticsBox);

    // 4. Results Section Header & Toolbar
    const resultsHeader = document.createElement('div');
    resultsHeader.className = 'runner-section-header';
    resultsHeader.style.marginTop = '28px';
    resultsHeader.innerHTML = `
      <div class="runner-section-title">
        <span class="section-bullet"></span>
        <span>Lịch Sử Các Lần Thực Thi Kịch Bản Này</span>
      </div>
    `;
    container.appendChild(resultsHeader);

    // Segmented 2-tab control: Chạy Theo Nhóm vs Chạy Riêng Lẻ
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'runs-mode-tabs-container';
    tabsContainer.style.marginBottom = '16px';
    tabsContainer.innerHTML = `
      <button type="button" class="runs-mode-tab ${this.runType === 'SUITE' ? 'active' : ''}" data-run-type="SUITE">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>Chạy Theo Nhóm (Suite Runs)</span>
      </button>
      <button type="button" class="runs-mode-tab ${this.runType === 'SINGLE' ? 'active' : ''}" data-run-type="SINGLE">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>Chạy Riêng Lẻ (Single Runs)</span>
      </button>
    `;
    container.appendChild(tabsContainer);

    tabsContainer.querySelectorAll('.runs-mode-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', async () => {
        const selectedType = tabBtn.dataset.runType;
        if (this.runType === selectedType) return;
        this.runType = selectedType;
        this.page = 1;
        await this.fetchResultsOnly();
      });
    });

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
          id="tc-results-search" 
          placeholder="Tìm kiếm theo mã Run ID hoặc Dự án..." 
          value="${this.searchTerm}"
        />
      </div>

      <select class="filter-dropdown-select" id="tc-results-status-filter">
        <option value="" ${this.statusFilter === '' ? 'selected' : ''}>Tất Cả Trạng Thái</option>
        <option value="PASSED" ${this.statusFilter === 'PASSED' ? 'selected' : ''}>Thành Công (PASSED)</option>
        <option value="FAILED" ${this.statusFilter === 'FAILED' ? 'selected' : ''}>Thất Bại (FAILED)</option>
        <option value="SKIPPED" ${this.statusFilter === 'SKIPPED' ? 'selected' : ''}>Bỏ Qua (SKIPPED)</option>
      </select>
    `;
    container.appendChild(toolbar);

    // Toolbar events
    toolbar.querySelector('#tc-results-search').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.renderResultsTable(tableContainer, paginationEl, items);
    });

    toolbar.querySelector('#tc-results-status-filter').addEventListener('change', async (e) => {
      this.statusFilter = e.target.value;
      this.page = 1;
      await this.fetchResultsOnly();
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

  async fetchResultsOnly() {
    try {
      const data = await api.getTestCaseResults(this.testCaseId, this.page, this.pageSize, {
        status: this.statusFilter,
        runType: this.runType
      });
      this.cachedResults = data;
      this.render();
    } catch (err) {
      console.error('Failed to fetch test case results', err);
    }
  }

  renderResultsTable(tableContainer, paginationContainer, allItems) {
    tableContainer.innerHTML = '';
    paginationContainer.innerHTML = '';

    const filteredItems = allItems.filter(res => {
      return !this.searchTerm || 
        (res.runId && res.runId.toLowerCase().includes(this.searchTerm)) ||
        (res.projectName && res.projectName.toLowerCase().includes(this.searchTerm));
    });

    if (filteredItems.length === 0) {
      if (this.runType === 'SINGLE') {
        tableContainer.appendChild(EmptyState(
          'Chưa có lần chạy riêng lẻ nào cho kịch bản này. Bạn có thể bấm nút "Chạy Test Case Này" ở trên để chạy thử nghiệm độc lập.'
        ));
      } else {
        tableContainer.appendChild(EmptyState(
          this.searchTerm || this.statusFilter
            ? 'Không tìm thấy kết quả thực thi nào phù hợp với bộ lọc.'
            : 'Chưa có dữ liệu lịch sử thực thi nào cho kịch bản này trong các đợt chạy nhóm.'
        ));
      }
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'testcase-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 260px;">Mã Lần Chạy (Run ID)</th>
        <th style="width: 200px;">Thời Gian Chạy</th>
        <th style="width: 170px;">Dự Án</th>
        <th style="width: 120px;">Thời Lượng</th>
        <th style="width: 130px;">Trạng Thái</th>
        <th style="width: 160px; text-align: right;">Bằng Chứng & Chi Tiết</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    filteredItems.forEach(res => {
      const tr = document.createElement('tr');
      const isPass = res.status === 'PASSED';
      const isFail = res.status === 'FAILED';
      const durationSec = ((res.durationMs || 0) / 1000).toFixed(1);
      const dateStr = res.runTimestamp ? new Date(res.runTimestamp).toLocaleString('vi-VN') : 'Không rõ';

      tr.innerHTML = `
        <!-- Mã Lần Chạy -->
        <td>
          <div class="run-id-cell">
            <a href="#runs/${encodeURIComponent(res.runId)}" class="run-id-text">
              ${res.runId}
            </a>
            <button type="button" class="btn-copy-id" title="Sao chép Run ID" data-run-id="${res.runId}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
          ${res.runId && res.runId.startsWith('adhoc-') ? '<span class="trigger-badge trigger-badge-adhoc" style="margin-top: 4px; display: inline-block;">Chạy riêng lẻ</span>' : ''}
        </td>

        <!-- Thời Gian Chạy -->
        <td>
          <div class="time-cell-main">${dateStr}</div>
        </td>

        <!-- Dự Án -->
        <td>
          <span class="project-pill">${res.projectName || 'Chromium'}</span>
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

        <!-- Trạng Thái -->
        <td>
          <span class="status-badge-chip ${isPass ? 'success' : isFail ? 'failed' : ''}">
            <span class="dot-indicator ${isPass ? 'green' : isFail ? 'red' : ''}" style="width: 6px; height: 6px; border-radius: 50%; background: ${isPass ? '#10b981' : isFail ? '#ef4444' : '#94a3b8'};"></span>
            <span>${res.status}</span>
          </span>
        </td>

        <!-- Thao Tác -->
        <td style="text-align: right;">
          <button type="button" class="btn-detail-link btn-open-modal" data-result-id="${res.resultId}">
            <span>Xem Chi Tiết</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </td>
      `;

      // Copy run ID
      const copyBtn = tr.querySelector('.btn-copy-id');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(res.runId).then(() => {
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

      // Modal
      const modalBtn = tr.querySelector('.btn-open-modal');
      if (modalBtn) {
        modalBtn.addEventListener('click', () => {
          this.modal.open(res.resultId);
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
        this.fetchResultsOnly();
      });
      paginationContainer.appendChild(paginationEl);
    }
  }
}

export const TestCaseDetailsView = new TestCaseDetailsViewClass();
