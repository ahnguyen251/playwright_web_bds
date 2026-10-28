import { api } from '../api.js';
import { Pagination } from '../components/Pagination.js';
import { LoadingState } from '../components/LoadingState.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';

export class TestCasesViewClass {
  constructor() {
    this.root = null;
    this.page = 1;
    this.pageSize = 20;
    this.searchQuery = '';
    this.activeModule = '';
    this.automationStatus = '';
    this.latestRunStatus = '';
    this.selectedTestCaseIds = new Set();
    this.modules = [];
    this.summaryData = null;
    this.modulesLoaded = false;
    this.debouncer = null;
    this.abortController = null;
    this.visibleTestCaseIds = [];
    this.executionBrowser = 'chromium';
  }

  async mount(rootElement) {
    this.root = rootElement;
    this.page = 1;
    this.searchQuery = '';
    this.activeModule = '';
    this.automationStatus = '';
    this.latestRunStatus = '';
    this.selectedTestCaseIds = new Set();
    this.modules = [];
    this.summaryData = null;
    this.modulesLoaded = false;
    this.executionBrowser = this.executionBrowser || 'chromium';

    this.renderContainer();
    await this.fetchAndRender();
  }

  unmount() {
    if (this.abortController) {
      this.abortController.abort();
    }
    clearTimeout(this.debouncer);
    this.root = null;
  }

  renderContainer() {
    this.root.innerHTML = '';

    // 1. Page Header (Title + Subtitle + Refresh Button)
    this.pageHeaderRow = document.createElement('div');
    this.pageHeaderRow.className = 'page-title-row';
    this.pageHeaderRow.innerHTML = `
      <div class="page-title-group">
        <h2 class="page-title-text">Danh Sách Test Case <span class="text-gradient">Playwright APM</span></h2>
        <p class="page-subtitle-text">83 kịch bản kiểm thử tự động hoá giao diện cho hệ sinh thái Propify</p>
      </div>
      <div class="page-title-actions">
        <button type="button" class="btn btn-refresh-compact" id="btn-refresh-view" title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Làm mới</span>
        </button>
      </div>
    `;
    this.pageHeaderRow.querySelector('#btn-refresh-view').addEventListener('click', () => {
      this.modulesLoaded = false;
      this.fetchAndRender();
      this.showToast('Đã làm mới dữ liệu kiểm thử');
    });
    this.root.appendChild(this.pageHeaderRow);

    // 2. 4 KPI Summary Cards
    this.kpiContainer = document.createElement('div');
    this.kpiContainer.className = 'kpi-summary-grid';
    this.root.appendChild(this.kpiContainer);

    // 3. Module Filter Section (Pills)
    this.moduleSection = document.createElement('div');
    this.moduleSection.className = 'module-filter-card';
    this.root.appendChild(this.moduleSection);

    // 4. Command Filter Bar (Search + Dropdown + Export)
    this.commandBar = document.createElement('section');
    this.commandBar.className = 'command-toolbar-section';
    this.commandBar.setAttribute('aria-label', 'Bộ lọc test case');
    this.root.appendChild(this.commandBar);

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'command-toolbar';
    this.commandBar.appendChild(this.toolbar);

    this.activeFiltersContainer = document.createElement('div');
    this.activeFiltersContainer.className = 'active-filter-chips';
    this.commandBar.appendChild(this.activeFiltersContainer);

    this.renderToolbar();
    this.renderActiveFilters();

    // 5. Module Info Summary Strip
    this.moduleStripContainer = document.createElement('div');
    this.root.appendChild(this.moduleStripContainer);

    // 6. Main Data Content Area (Table + Bulk Action Bar + Pagination)
    this.contentArea = document.createElement('div');
    this.root.appendChild(this.contentArea);
  }

  renderKpiCards() {
    this.kpiContainer.innerHTML = '';

    const totalAll = this.modules.reduce((sum, m) => sum + (m.totalTestCases || 0), 0) || (this.summaryData?.testCases?.total || 0);
    const totalModules = this.modules.length || 12;

    // Determine metrics for card 2 & 3 based on active module or all
    let activeModuleLabel = 'TOÀN HỆ THỐNG';
    let moduleTotal = totalAll;
    let moduleAutomated = this.modules.reduce((sum, m) => sum + (m.automatedCount || 0), 0) || (this.summaryData?.testCases?.automated || 0);
    let moduleNotAutomated = this.modules.reduce((sum, m) => sum + (m.notAutomatedCount || 0), 0) || (this.summaryData?.testCases?.notAutomated || 0);

    if (this.activeModule) {
      const found = this.modules.find((m) => m.module === this.activeModule);
      if (found) {
        activeModuleLabel = found.module.toUpperCase();
        moduleTotal = found.totalTestCases;
        moduleAutomated = found.automatedCount;
        moduleNotAutomated = found.notAutomatedCount;
      }
    }

    const coveragePercent = moduleTotal > 0 ? ((moduleAutomated / moduleTotal) * 100).toFixed(1) : '0.0';

    // Calculate pass rate from latest run or default
    let passRate = '98.2%';
    if (this.summaryData?.latestRun && this.summaryData.latestRun.totalExecutions > 0) {
      const rate = ((this.summaryData.latestRun.passed / this.summaryData.latestRun.totalExecutions) * 100).toFixed(1);
      passRate = `${rate}%`;
    }

    // Card 1: Tổng Test Toàn Hệ Thống
    const card1 = document.createElement('div');
    card1.className = 'kpi-card';
    card1.innerHTML = `
      <div>
        <div class="kpi-card-top">
          <span class="kpi-card-label">TỔNG TEST TOÀN HỆ THỐNG</span>
          <div class="kpi-card-icon-wrap kpi-icon-blue">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value">${totalAll}</span>
          <span class="kpi-card-unit">test cases</span>
        </div>
      </div>
      <div class="kpi-card-footer">
        <span class="kpi-footer-subtext">Phân bố trên <strong>${totalModules} mô-đun chức năng</strong></span>
      </div>
    `;

    // Card 2: Bao Phủ Tự Động
    const card2 = document.createElement('div');
    card2.className = 'kpi-card';
    card2.innerHTML = `
      <div>
        <div class="kpi-card-top">
          <span class="kpi-card-label">BAO PHỦ TỰ ĐỘNG</span>
          <div class="kpi-card-icon-wrap kpi-icon-green">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value text-green">${coveragePercent}%</span>
          <span class="kpi-card-unit">/ ${moduleTotal} Tự động hoá</span>
        </div>
      </div>
      <div class="kpi-card-footer">
        <div class="kpi-progress-track">
          <div class="kpi-progress-fill" style="width: ${coveragePercent}%;"></div>
        </div>
      </div>
    `;

    // Card 3: Cần Tự Động Hoá
    const card3 = document.createElement('div');
    card3.className = 'kpi-card';
    card3.innerHTML = `
      <div>
        <div class="kpi-card-top">
          <span class="kpi-card-label">CẦN TỰ ĐỘNG HOÁ</span>
          <div class="kpi-card-icon-wrap kpi-icon-red">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value" style="color: #dc2626;">${moduleNotAutomated}</span>
          <span class="kpi-card-unit">cần viết script</span>
        </div>
      </div>
      <div class="kpi-card-footer">
        <span class="kpi-footer-subtext">Ưu tiên kịch bản core flow</span>
      </div>
    `;

    // Card 4: Tỷ Lệ Pass Playwright
    const card4 = document.createElement('div');
    card4.className = 'kpi-card';
    card4.innerHTML = `
      <div>
        <div class="kpi-card-top">
          <span class="kpi-card-label">TỶ LỆ PASS PLAYWRIGHT</span>
          <div class="kpi-card-icon-wrap kpi-icon-purple">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
        </div>
        <div class="kpi-card-body">
          <span class="kpi-card-value">${passRate}</span>
          <span class="kpi-tag-success" style="margin-left: 6px;">Tốt</span>
        </div>
      </div>
      <div class="kpi-card-footer">
        <span class="kpi-footer-subtext">Chạy dưới dự án Chromium</span>
      </div>
    `;

    this.kpiContainer.appendChild(card1);
    this.kpiContainer.appendChild(card2);
    this.kpiContainer.appendChild(card3);
    this.kpiContainer.appendChild(card4);

    // Update sidebar counter badge
    const sidebarCount = document.getElementById('sidebar-test-case-count');
    if (sidebarCount) {
      sidebarCount.textContent = String(totalAll);
    }
  }

  renderToolbar() {
    this.toolbar.innerHTML = '';

    // Search Input Field
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-input-wrap';
    searchWrap.innerHTML = `
      <svg class="search-icon-inside" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" class="search-input-field" placeholder="Search Test Cases..." value="${this.escapeHtml(this.searchQuery)}">
    `;

    const searchInput = searchWrap.querySelector('input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(this.debouncer);
      this.debouncer = setTimeout(() => {
        this.page = 1;
        this.selectedTestCaseIds.clear();
        this.renderActiveFilters();
        this.fetchAndRender();
      }, 500);
    });
    this.toolbar.appendChild(searchWrap);

    // Unified Status Dropdown ("Tất cả trạng thái")
    const select = document.createElement('select');
    select.id = 'status-filter';
    select.className = 'filter-dropdown-select';
    select.setAttribute('aria-label', 'Kết quả chạy gần nhất');

    const options = [
      { value: '', label: 'Tất cả trạng thái' },
      { value: 'AUTOMATED', label: 'Đã tự động hóa' },
      { value: 'NOT_AUTOMATED', label: 'Chưa tự động hóa' },
      { value: 'PASSED', label: 'Passed (Lần chạy trước)' },
      { value: 'FAILED', label: 'Failed (Lần chạy trước)' },
      { value: 'NOT_RUN', label: 'Chưa chạy' },
    ];

    let currentSelectedValue = '';
    if (this.latestRunStatus) {
      currentSelectedValue = this.latestRunStatus;
    } else if (this.automationStatus) {
      currentSelectedValue = this.automationStatus;
    }

    options.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      opt.selected = value === currentSelectedValue;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (['PASSED', 'FAILED', 'NOT_RUN'].includes(val)) {
        this.latestRunStatus = val;
        this.automationStatus = '';
      } else if (['AUTOMATED', 'NOT_AUTOMATED'].includes(val)) {
        this.automationStatus = val;
        this.latestRunStatus = '';
      } else {
        this.latestRunStatus = '';
        this.automationStatus = '';
      }
      this.page = 1;
      this.selectedTestCaseIds.clear();
      this.renderActiveFilters();
      this.fetchAndRender();
    });

    this.toolbar.appendChild(select);

    // Export File Button
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn-export-file';
    exportBtn.id = 'btn-export-testcases';
    exportBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Xuất File</span>
    `;
    exportBtn.addEventListener('click', () => this.exportCurrentData());
    this.toolbar.appendChild(exportBtn);
  }

  renderActiveFilters() {
    this.activeFiltersContainer.innerHTML = '';

    const automationLabels = {
      AUTOMATED: 'Đã tự động hóa',
      NOT_AUTOMATED: 'Chưa tự động hóa',
    };
    const latestRunLabels = {
      PASSED: 'Passed',
      FAILED: 'Failed',
      NOT_RUN: 'Chưa chạy',
    };

    const filters = [
      {
        value: this.searchQuery,
        label: `Tìm kiếm: ${this.searchQuery}`,
        clear: () => {
          this.searchQuery = '';
          this.applyFilterChange();
        },
      },
      {
        value: this.activeModule,
        label: `Mô-đun: ${this.activeModule}`,
        clear: () => {
          this.activeModule = '';
          this.applyFilterChange();
        },
      },
      {
        value: this.automationStatus,
        label: `Trạng thái: ${automationLabels[this.automationStatus] || this.automationStatus}`,
        clear: () => {
          this.automationStatus = '';
          this.applyFilterChange();
        },
      },
      {
        value: this.latestRunStatus,
        label: latestRunLabels[this.latestRunStatus] || this.latestRunStatus,
        clear: () => {
          this.latestRunStatus = '';
          this.applyFilterChange();
        },
      },
    ];

    const activeFilters = filters.filter(({ value }) => Boolean(value));

    activeFilters.forEach(({ label, clear }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.textContent = label;
      chip.setAttribute('aria-label', `Bỏ lọc: ${label}`);
      chip.addEventListener('click', clear);
      this.activeFiltersContainer.appendChild(chip);
    });

    if (activeFilters.length > 0) {
      const clearAllBtn = document.createElement('button');
      clearAllBtn.type = 'button';
      clearAllBtn.className = 'clear-filters-button';
      clearAllBtn.textContent = 'Xóa bộ lọc';
      clearAllBtn.addEventListener('click', () => this.clearFilters());
      this.activeFiltersContainer.appendChild(clearAllBtn);
    }
  }

  applyFilterChange() {
    this.page = 1;
    this.selectedTestCaseIds.clear();
    this.renderToolbar();
    this.renderActiveFilters();
    this.renderModuleTabs();
    this.renderKpiCards();
    this.fetchAndRender();
  }

  clearFilters() {
    this.searchQuery = '';
    this.activeModule = '';
    this.automationStatus = '';
    this.latestRunStatus = '';
    this.applyFilterChange();
  }

  renderModuleTabs() {
    this.moduleSection.innerHTML = '';

    if (!this.modules || this.modules.length === 0) {
      return;
    }

    const header = document.createElement('div');
    header.className = 'module-filter-header';
    header.innerHTML = `
      <span class="module-filter-title">PHÂN LOẠI THEO MÔ-ĐUN</span>
      <span class="module-filter-hint">Chọn mô-đun để lọc nhanh dữ liệu</span>
    `;
    this.moduleSection.appendChild(header);

    const pillList = document.createElement('div');
    pillList.className = 'module-pill-list';

    const totalAll = this.modules.reduce((sum, m) => sum + (m.totalTestCases || 0), 0);

    // Pill: Tất cả
    const allPill = document.createElement('button');
    allPill.type = 'button';
    allPill.className = `module-pill module-tab ${this.activeModule === '' ? 'active' : ''}`;
    allPill.setAttribute('data-module', '');
    allPill.innerHTML = `
      <span>Tất cả</span>
      <span class="module-pill-badge module-tab-badge">${totalAll}</span>
    `;
    allPill.addEventListener('click', () => {
      if (this.activeModule === '') return;
      this.activeModule = '';
      this.applyFilterChange();
    });
    pillList.appendChild(allPill);

    // Pills for each module
    this.modules.forEach((mod) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `module-pill module-tab ${this.activeModule === mod.module ? 'active' : ''}`;
      pill.setAttribute('data-module', mod.module);
      pill.innerHTML = `
        <span>${mod.module}</span>
        <span class="module-pill-badge module-tab-badge">${mod.totalTestCases}</span>
      `;
      pill.addEventListener('click', () => {
        if (this.activeModule === mod.module) return;
        this.activeModule = mod.module;
        this.applyFilterChange();
      });
      pillList.appendChild(pill);
    });

    this.moduleSection.appendChild(pillList);
  }

  renderModuleInfoBanner() {
    this.moduleStripContainer.innerHTML = '';

    if (!this.modules || this.modules.length === 0) {
      return;
    }

    let moduleTitle = 'Tất cả mô-đun';
    let moduleSub = '';
    let total = 0;
    let automated = 0;
    let notAutomated = 0;

    if (this.activeModule) {
      const mod = this.modules.find((m) => m.module === this.activeModule);
      if (mod) {
        moduleTitle = `Mô-đun: ${mod.module}`;
        const subMap = {
          'Authentication': '(Xác thực & Tài khoản)',
          'Profile': '(Hồ sơ người dùng)',
          'Home': '(Trang chủ & Tìm kiếm)',
          'Ranking': '(Xếp hạng & Điểm hiển thị tin)',
          'Listings': '(Bất động sản đăng tin)',
          'Appointments': '(Đặt lịch hẹn xem nhà)',
          'Transactions': '(Lịch sử giao dịch)',
          'Packages': '(Gói tin & Thanh toán)',
          'Chat': '(Nhắn tin trực tuyến)'
        };
        moduleSub = subMap[mod.module] || '';
        total = mod.totalTestCases;
        automated = mod.automatedCount;
        notAutomated = mod.notAutomatedCount;
      }
    } else {
      total = this.modules.reduce((sum, m) => sum + (m.totalTestCases || 0), 0);
      automated = this.modules.reduce((sum, m) => sum + (m.automatedCount || 0), 0);
      notAutomated = this.modules.reduce((sum, m) => sum + (m.notAutomatedCount || 0), 0);
    }

    const rate = total > 0 ? Math.round((automated / total) * 100) : 0;

    const banner = document.createElement('div');
    banner.className = 'module-summary-strip';
    banner.innerHTML = `
      <div class="module-strip-title">
        <span class="module-info-title">${moduleTitle}</span>
        <span class="module-strip-title-sub">${moduleSub}</span>
      </div>
      <div class="module-strip-stats">
        <span class="strip-stat-item">Tổng: <span class="strip-stat-num">${total}</span></span>
        <span class="strip-stat-item">Tự động: <span class="strip-stat-num text-green">${automated}</span></span>
        <span class="strip-stat-item">Chưa tự động: <span class="strip-stat-num text-red">${notAutomated}</span></span>
        <div class="strip-progress-wrap" title="Tỷ lệ tự động hóa: ${rate}%">
          <div class="strip-progress-bar">
            <div class="strip-progress-fill" style="width: ${rate}%;"></div>
          </div>
          <span class="strip-progress-percent">${rate}%</span>
        </div>
      </div>
    `;

    this.moduleStripContainer.appendChild(banner);
  }

  async fetchAndRender() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.contentArea.innerHTML = '';
    this.contentArea.appendChild(LoadingState('Đang tải dữ liệu test case...'));

    try {
      let data;
      if (!this.modulesLoaded) {
        const [modulesData, summaryData, testCasesData] = await Promise.all([
          api.getModules({ signal }),
          api.getSummary({ signal }).catch(() => null),
          api.getTestCases(this.page, this.pageSize, this.getFilters(), { signal }),
        ]);
        this.modules = modulesData || [];
        this.summaryData = summaryData;
        this.modulesLoaded = true;

        this.renderKpiCards();
        this.renderModuleTabs();
        this.renderToolbar();
        data = testCasesData;
      } else {
        data = await api.getTestCases(this.page, this.pageSize, this.getFilters(), { signal });
        this.renderKpiCards();
      }

      this.currentItems = data.items || [];
      this.renderModuleInfoBanner();
      this.contentArea.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        this.contentArea.appendChild(EmptyState('Không tìm thấy test case nào.'));
        return;
      }

      const tableCard = document.createElement('div');
      tableCard.className = 'data-table-card';

      this.visibleTestCaseIds = data.items.map((testCase) => testCase.test_case_id);

      // Bulk Action Toolbar
      const bulkActionBar = this.createBulkActionBar();
      tableCard.appendChild(bulkActionBar);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'table-responsive';

      const table = document.createElement('table');
      table.className = 'testcase-table';
      table.setAttribute('aria-label', 'Danh sách test case');

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th style="width: 44px; text-align: center;">
            <input type="checkbox" class="table-checkbox" aria-label="Chọn test case trang hiện tại">
          </th>
          <th style="width: 140px;">MÃ</th>
          <th style="width: 130px;">MÔ-ĐUN</th>
          <th>TIÊU ĐỀ & MỤC TIÊU KIỂM THỬ</th>
          <th style="width: 140px;">TRẠNG THÁI</th>
          <th style="width: 140px;">LẦN CHẠY TRƯỚC</th>
          <th style="width: 90px; text-align: right; padding-right: 20px;">THAO TÁC</th>
        </tr>
      `;
      this.selectVisibleCheckbox = thead.querySelector('input[aria-label="Chọn test case trang hiện tại"]');
      this.selectVisibleCheckbox.addEventListener('change', (event) => {
        const isSelected = event.target.checked;
        this.visibleTestCaseIds.forEach((testCaseId) => {
          if (isSelected) {
            this.selectedTestCaseIds.add(testCaseId);
          } else {
            this.selectedTestCaseIds.delete(testCaseId);
          }
        });
        this.updateSelectionControls();
      });
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.items.forEach((tc) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-test-case-id', tc.test_case_id);

        // 1. Checkbox
        const tdSelection = document.createElement('td');
        tdSelection.style.textAlign = 'center';
        const selectionCheckbox = document.createElement('input');
        const selectionId = `select-test-case-${tc.test_case_id}`;
        selectionCheckbox.type = 'checkbox';
        selectionCheckbox.className = 'table-checkbox';
        selectionCheckbox.id = selectionId;
        selectionCheckbox.checked = this.selectedTestCaseIds.has(tc.test_case_id);
        selectionCheckbox.setAttribute('aria-label', `Chọn ${tc.test_case_id}`);
        selectionCheckbox.addEventListener('change', (event) => {
          if (event.target.checked) {
            this.selectedTestCaseIds.add(tc.test_case_id);
          } else {
            this.selectedTestCaseIds.delete(tc.test_case_id);
          }
          this.updateSelectionControls();
        });
        tdSelection.appendChild(selectionCheckbox);

        // 2. MÃ
        const tdId = document.createElement('td');
        const aId = document.createElement('a');
        aId.href = `#test-cases/${encodeURIComponent(tc.test_case_id)}`;
        aId.textContent = tc.test_case_id;
        aId.className = 'test-code-link';
        tdId.appendChild(aId);

        // 3. MÔ-ĐUN
        const tdModule = document.createElement('td');
        const moduleBadge = document.createElement('span');
        moduleBadge.className = 'module-badge-chip';
        moduleBadge.textContent = tc.module;
        tdModule.appendChild(moduleBadge);

        // 4. TIÊU ĐỀ
        const tdTitle = document.createElement('td');
        const titleDiv = document.createElement('div');
        titleDiv.className = 'test-title-text';
        titleDiv.textContent = tc.title;
        tdTitle.appendChild(titleDiv);

        // 5. TRẠNG THÁI
        const tdStatus = document.createElement('td');
        const statusPill = document.createElement('span');
        const isAutomated = tc.automation_status === 'AUTOMATED';
        statusPill.className = `status-pill ${isAutomated ? 'automated' : 'not-automated'}`;
        statusPill.innerHTML = `
          <span class="status-dot-circle"></span>
          <span>${tc.automation_status}</span>
        `;
        tdStatus.appendChild(statusPill);

        // 6. LẦN CHẠY TRƯỚC
        const tdLatestRun = document.createElement('td');
        this.renderLatestRunCell(tdLatestRun, tc.latest_run_status, tc.latest_run_duration_ms);

        // 7. THAO TÁC
        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'right';
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'action-buttons-group';
        actionsGroup.style.justifyContent = 'flex-end';

        if (isAutomated) {
          // Row Browser Select
          const rowBrowserSelect = document.createElement('select');
          rowBrowserSelect.className = 'row-browser-select';
          rowBrowserSelect.style.cssText = 'padding: 4px 6px; font-size: 0.75rem; font-weight: 500; border-radius: 4px; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; cursor: pointer; max-width: 105px;';
          rowBrowserSelect.title = `Chọn trình duyệt chạy cho ${tc.test_case_id}`;

          [
            { value: 'chromium', label: '🌐 Chrome' },
            { value: 'firefox', label: '🦊 Firefox' },
            { value: 'webkit', label: '🧭 Safari' },
          ].forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            opt.selected = value === (this.executionBrowser || 'chromium');
            rowBrowserSelect.appendChild(opt);
          });

          rowBrowserSelect.addEventListener('change', (e) => {
            this.executionBrowser = e.target.value;
          });

          // Play button (Run this test)
          const runBtn = document.createElement('button');
          runBtn.type = 'button';
          runBtn.className = 'action-icon-button';
          runBtn.title = `Chạy kiểm thử ${tc.test_case_id}`;
          runBtn.setAttribute('aria-label', `Chạy ${tc.test_case_id}`);
          runBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          `;
          runBtn.addEventListener('click', async () => {
            if (runBtn.disabled) return;
            runBtn.disabled = true;
            rowBrowserSelect.disabled = true;
            const originalIcon = runBtn.innerHTML;
            runBtn.innerHTML = `
              <svg class="spinner" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
              </svg>
            `;
            const selectedBrowser = rowBrowserSelect.value || this.executionBrowser || 'chromium';
            const bNames = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'WebKit' };
            const bDisplay = bNames[selectedBrowser] || selectedBrowser;
            this.showToast(`Đang chạy ${tc.test_case_id} bằng Playwright (${bDisplay} - Headed)...`);

            try {
              const res = await api.runTestCase(tc.test_case_id, { browser: selectedBrowser });
              if (res.status === 'PASSED') {
                this.showToast(`✓ ${tc.test_case_id} chạy THÀNH CÔNG (${this.formatDuration(res.durationMs)})`);
                this.renderLatestRunCell(tdLatestRun, 'PASSED', res.durationMs);
              } else if (res.status === 'SKIPPED') {
                this.showToast(`⚠️ ${tc.test_case_id}: SKIPPED (Bỏ qua do chính sách an toàn)`);
                this.renderLatestRunCell(tdLatestRun, 'SKIPPED', res.durationMs);
              } else if (res.status === 'FAILED') {
                this.showToast(`✕ ${tc.test_case_id} chạy THẤT BẠI: ${res.errorMessage || 'Lỗi kiểm thử'}`);
                this.renderLatestRunCell(tdLatestRun, 'FAILED', res.durationMs);
              } else {
                this.showToast(`⚠️ ${tc.test_case_id}: ${res.status}`);
                this.renderLatestRunCell(tdLatestRun, res.status, res.durationMs);
              }
            } catch (err) {
              this.showToast(`✕ Lỗi thực thi ${tc.test_case_id}: ${err.message || 'Lỗi không xác định'}`);
            } finally {
              runBtn.disabled = false;
              rowBrowserSelect.disabled = false;
              runBtn.innerHTML = originalIcon;
            }
          });

          // Code button (View script path)
          const codeBtn = document.createElement('button');
          codeBtn.type = 'button';
          codeBtn.className = 'action-icon-button';
          codeBtn.title = 'Xem script code';
          codeBtn.setAttribute('aria-label', `Xem mã nguồn ${tc.test_case_id}`);
          codeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          `;
          codeBtn.addEventListener('click', () => {
            this.openScriptModal(tc);
          });

          // More button
          const moreBtn = document.createElement('button');
          moreBtn.type = 'button';
          moreBtn.className = 'action-icon-button';
          moreBtn.title = 'Tùy chọn khác';
          moreBtn.setAttribute('aria-label', `Tùy chọn ${tc.test_case_id}`);
          moreBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          `;
          moreBtn.addEventListener('click', () => {
            window.location.hash = `#test-cases/${encodeURIComponent(tc.test_case_id)}`;
          });

          actionsGroup.appendChild(rowBrowserSelect);
          actionsGroup.appendChild(runBtn);
          actionsGroup.appendChild(codeBtn);
          actionsGroup.appendChild(moreBtn);
        } else {
          // + Viết Script
          const writeScriptBtn = document.createElement('button');
          writeScriptBtn.type = 'button';
          writeScriptBtn.className = 'btn-write-script-link';
          writeScriptBtn.setAttribute('aria-label', `Viết script ${tc.test_case_id}`);
          writeScriptBtn.innerHTML = `+ Viết Script`;
          writeScriptBtn.addEventListener('click', () => {
            this.openWriteScriptModal(tc);
          });

          // More button
          const moreBtn = document.createElement('button');
          moreBtn.type = 'button';
          moreBtn.className = 'action-icon-button';
          moreBtn.title = 'Tùy chọn khác';
          moreBtn.setAttribute('aria-label', `Tùy chọn ${tc.test_case_id}`);
          moreBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          `;
          moreBtn.addEventListener('click', () => {
            window.location.hash = `#test-cases/${encodeURIComponent(tc.test_case_id)}`;
          });

          actionsGroup.appendChild(writeScriptBtn);
          actionsGroup.appendChild(moreBtn);
        }

        tdActions.appendChild(actionsGroup);

        tr.appendChild(tdSelection);
        tr.appendChild(tdId);
        tr.appendChild(tdModule);
        tr.appendChild(tdTitle);
        tr.appendChild(tdStatus);
        tr.appendChild(tdLatestRun);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
      tableCard.appendChild(tableWrap);

      this.updateSelectionControls();
      this.contentArea.appendChild(tableCard);

      const paginationEl = Pagination(data.pagination, (newPage) => {
        this.page = newPage;
        this.selectedTestCaseIds.clear();
        this.fetchAndRender();
      });
      this.contentArea.appendChild(paginationEl);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      this.contentArea.innerHTML = '';
      this.contentArea.appendChild(ErrorState(error));
    }
  }

  getFilters() {
    return {
      search: this.searchQuery,
      module: this.activeModule,
      automationStatus: this.automationStatus,
      latestRunStatus: this.latestRunStatus,
    };
  }

  createBulkActionBar() {
    const bulkActionBar = document.createElement('div');
    bulkActionBar.className = 'bulk-action-bar';
    bulkActionBar.id = 'bulk-action-bar';
    if (this.selectedTestCaseIds.size === 0) {
      bulkActionBar.style.display = 'none';
    }

    this.selectedCountElement = document.createElement('span');
    this.selectedCountElement.className = 'bulk-action-status';
    this.selectedCountElement.setAttribute('role', 'status');
    this.selectedCountElement.setAttribute('aria-label', 'Số test case đã chọn');
    bulkActionBar.appendChild(this.selectedCountElement);

    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'center';
    rightControls.style.gap = '10px';

    this.runSelectedButton = document.createElement('button');
    this.runSelectedButton.type = 'button';
    this.runSelectedButton.className = 'btn bulk-run-button';
    this.runSelectedButton.textContent = 'Chạy test đã chọn';
    this.runSelectedButton.addEventListener('click', () => {
      this.root.dispatchEvent(
        new CustomEvent('test-cases:run-selected', {
          detail: { testCaseIds: [...this.selectedTestCaseIds] },
        }),
      );
      this.showToast(`Đã gửi lệnh chạy cho ${this.selectedTestCaseIds.size} test case đã chọn.`);
    });
    rightControls.appendChild(this.runSelectedButton);

    bulkActionBar.appendChild(rightControls);

    return bulkActionBar;
  }

  updateSelectionControls() {
    const selectedCount = this.selectedTestCaseIds.size;
    const bulkBar = this.contentArea ? this.contentArea.querySelector('#bulk-action-bar') : null;
    if (bulkBar) {
      bulkBar.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
    if (this.selectedCountElement) {
      this.selectedCountElement.textContent = `${selectedCount} test case đã chọn`;
    }
    if (this.runSelectedButton) {
      this.runSelectedButton.disabled = selectedCount === 0;
    }

    const selectedVisibleCount = this.visibleTestCaseIds.filter((testCaseId) =>
      this.selectedTestCaseIds.has(testCaseId),
    ).length;
    this.selectVisibleCheckbox.checked =
      this.visibleTestCaseIds.length > 0 && selectedVisibleCount === this.visibleTestCaseIds.length;
    this.selectVisibleCheckbox.indeterminate =
      selectedVisibleCount > 0 && selectedVisibleCount < this.visibleTestCaseIds.length;

    this.contentArea.querySelectorAll('tr[data-test-case-id]').forEach((row) => {
      row.classList.toggle('is-selected', this.selectedTestCaseIds.has(row.dataset.testCaseId));
    });
  }

  formatDuration(ms) {
    if (!ms || ms <= 0) return '0ms';
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  }

  renderLatestRunCell(tdLatestRun, status, durationMs) {
    tdLatestRun.innerHTML = '';
    const runOutcome = document.createElement('div');
    if (status === 'PASSED') {
      runOutcome.className = 'run-outcome-cell passed';
      const duration = this.formatDuration(durationMs || 940);
      runOutcome.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Passed (${duration})</span>
      `;
    } else if (status === 'FAILED') {
      runOutcome.className = 'run-outcome-cell failed';
      const duration = this.formatDuration(durationMs || 1200);
      runOutcome.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>Failed (${duration})</span>
      `;
    } else {
      runOutcome.className = 'run-outcome-cell unrun';
      runOutcome.textContent = status === 'SKIPPED' ? 'Skipped' : 'Chưa thực thi';
    }
    tdLatestRun.appendChild(runOutcome);
  }

  exportCurrentData() {
    if (!this.currentItems || this.currentItems.length === 0) {
      this.showToast('Không có dữ liệu test case để xuất file.');
      return;
    }

    const headers = ['Mã Test', 'Mô-đun', 'Tiêu Đề', 'Trạng Thái', 'Lần Chạy Trước', 'Script Path'];
    const rows = this.currentItems.map((tc) => [
      tc.test_case_id,
      tc.module,
      `"${(tc.title || '').replace(/"/g, '""')}"`,
      tc.automation_status,
      tc.latest_run_status || 'NOT_RUN',
      `"${(tc.script_path || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${this.activeModule || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast(`Đã xuất ${this.currentItems.length} test case thành công!`);
  }

  openScriptModal(tc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const scriptPath = tc.script_path || `tests/${tc.module.toLowerCase()}/${tc.test_case_id.toLowerCase()}.spec.ts`;
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <h3>Kịch Bản Kiểm Thử: ${this.escapeHtml(tc.test_case_id)}</h3>
          <button type="button" class="modal-close" aria-label="Đóng">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 12px; font-weight: 500; color: #0f172a;">${this.escapeHtml(tc.title)}</p>
          <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 6px;">Đường dẫn tệp script Playwright:</div>
          <div class="code-block">${this.escapeHtml(scriptPath)}</div>
          <div style="margin-top: 16px;">
            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 6px;">Lệnh chạy trực tiếp qua Terminal:</div>
            <div class="code-block">npx playwright test ${this.escapeHtml(scriptPath)} --grep "${this.escapeHtml(tc.test_case_id)}"</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-copy-path">Sao chép đường dẫn</button>
          <button type="button" class="btn btn-close-modal">Đóng</button>
        </div>
      </div>
    `;

    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('.btn-copy-path').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(scriptPath);
        this.showToast('Đã sao chép đường dẫn script vào clipboard!');
      } catch (e) {
        this.showToast('Không thể sao chép vào clipboard');
      }
    });

    document.body.appendChild(modal);
  }

  openWriteScriptModal(tc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const samplePath = `tests/${tc.module.toLowerCase()}/${tc.test_case_id.toLowerCase()}.spec.ts`;
    const templateCode = `import { test, expect } from '../../fixtures/test.fixture';

test('${tc.test_case_id} - ${tc.title}', async ({ page }) => {
  // 1. Arrange: Điều hướng tới trang mục tiêu
  await page.goto('/');

  // 2. Act: Thực hiện các bước kiểm thử giao diện
  // TODO: Tương tác qua Page Object

  // 3. Assert: Kiểm tra kết quả mong đợi
  await expect(page).toHaveTitle(/Propify/);
});
`;

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 720px;">
        <div class="modal-header">
          <h3>Tạo Kịch Bản Mới: ${this.escapeHtml(tc.test_case_id)}</h3>
          <button type="button" class="modal-close" aria-label="Đóng">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 8px; font-weight: 600; color: #0f172a;">${this.escapeHtml(tc.title)}</p>
          <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 14px;">Mẫu mã nguồn Playwright chuẩn kiến trúc 4 tầng:</p>
          <div class="code-block">${this.escapeHtml(templateCode)}</div>
          <p style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 10px;">Lưu file tại: <code>${this.escapeHtml(samplePath)}</code></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-copy-template">Sao chép mã mẫu</button>
          <button type="button" class="btn btn-close-modal">Đóng</button>
        </div>
      </div>
    `;

    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-close-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('.btn-copy-template').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(templateCode);
        this.showToast('Đã sao chép template kịch bản kiểm thử!');
      } catch (e) {
        this.showToast('Không thể sao chép vào clipboard');
      }
    });

    document.body.appendChild(modal);
  }

  showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${this.escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const TestCasesView = new TestCasesViewClass();
