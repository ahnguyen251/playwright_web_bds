import { api } from '../api.js';
import { Badge } from '../components/Badge.js';
import { Pagination } from '../components/Pagination.js';
import { LoadingState } from '../components/LoadingState.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';

export class TestCasesViewClass {
  constructor() {
    this.root = null;
    this.page = 1;
    this.searchQuery = '';
    this.activeModule = '';
    this.modules = [];
    this.modulesLoaded = false;
    this.debouncer = null;
    this.abortController = null;
  }

  async mount(rootElement) {
    this.root = rootElement;
    this.page = 1;
    this.searchQuery = '';
    this.activeModule = '';
    this.modules = [];
    this.modulesLoaded = false;
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

    // Filter section for Module Tabs
    this.moduleSection = document.createElement('div');
    this.moduleSection.className = 'module-filter-section';
    this.root.appendChild(this.moduleSection);

    // Search controls
    const controls = document.createElement('div');
    controls.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'input';
    searchInput.placeholder = 'Search Test Cases...';
    searchInput.value = this.searchQuery;

    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(this.debouncer);
      this.debouncer = setTimeout(() => {
        this.page = 1; // Reset to page 1 on new search
        this.fetchAndRender();
      }, 500);
    });

    controls.appendChild(searchInput);
    this.root.appendChild(controls);

    // Info banner for active module
    this.infoBannerContainer = document.createElement('div');
    this.root.appendChild(this.infoBannerContainer);

    // Main content area
    this.contentArea = document.createElement('div');
    this.root.appendChild(this.contentArea);
  }

  renderModuleTabs() {
    this.moduleSection.innerHTML = '';

    if (!this.modules || this.modules.length === 0) {
      return;
    }

    const header = document.createElement('div');
    header.className = 'module-tabs-header';
    const label = document.createElement('span');
    label.className = 'module-tabs-label';
    label.textContent = 'Phân Loại Theo Mô-Đun';
    header.appendChild(label);
    this.moduleSection.appendChild(header);

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'module-tabs';
    this.tabsContainer = tabsContainer;

    const totalAll = this.modules.reduce((sum, m) => sum + (m.totalTestCases || 0), 0);

    // "Tất cả" tab
    const allTab = document.createElement('button');
    allTab.type = 'button';
    allTab.className = `module-tab ${this.activeModule === '' ? 'active' : ''}`;
    allTab.setAttribute('data-module', '');
    allTab.innerHTML = `
      <span class="module-tab-name">Tất cả</span>
      <span class="module-tab-badge">${totalAll}</span>
    `;
    allTab.addEventListener('click', () => {
      if (this.activeModule === '') return;
      this.activeModule = '';
      this.page = 1;
      this.updateActiveTab();
      this.fetchAndRender();
    });
    tabsContainer.appendChild(allTab);

    // Tabs for each module
    this.modules.forEach((mod) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `module-tab ${this.activeModule === mod.module ? 'active' : ''}`;
      tab.setAttribute('data-module', mod.module);

      const percent =
        mod.totalTestCases > 0 ? Math.round((mod.automatedCount / mod.totalTestCases) * 100) : 0;

      tab.innerHTML = `
        <span class="module-tab-name">${mod.module}</span>
        <span class="module-tab-badge" title="${mod.automatedCount}/${mod.totalTestCases} automated (${percent}%)">${mod.totalTestCases}</span>
      `;

      tab.addEventListener('click', () => {
        if (this.activeModule === mod.module) return;
        this.activeModule = mod.module;
        this.page = 1;
        this.updateActiveTab();
        this.fetchAndRender();
      });

      tabsContainer.appendChild(tab);
    });

    this.moduleSection.appendChild(tabsContainer);
  }

  updateActiveTab() {
    if (!this.tabsContainer) return;
    const tabs = this.tabsContainer.querySelectorAll('.module-tab');
    tabs.forEach((tab) => {
      const mod = tab.getAttribute('data-module');
      if (mod === this.activeModule) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  renderModuleInfoBanner() {
    this.infoBannerContainer.innerHTML = '';

    if (!this.modules || this.modules.length === 0) {
      return;
    }

    let moduleTitle = 'Tất cả mô-đun';
    let total = 0;
    let automated = 0;
    let notAutomated = 0;

    if (this.activeModule) {
      const mod = this.modules.find((m) => m.module === this.activeModule);
      if (mod) {
        moduleTitle = `Mô-đun: ${mod.module}`;
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
    banner.className = 'module-info-banner';
    banner.innerHTML = `
      <div class="module-info-title">
        <span>${moduleTitle}</span>
      </div>
      <div class="module-info-stats">
        <span class="module-stat-item">Tổng: <span class="module-stat-value">${total}</span></span>
        <span class="module-stat-item">Tự động: <span class="module-stat-value text-success">${automated}</span></span>
        <span class="module-stat-item">Chưa tự động: <span class="module-stat-value text-warning">${notAutomated}</span></span>
        <div class="module-progress-wrapper" title="Tỷ lệ tự động hóa: ${rate}%">
          <div class="module-progress-bar">
            <div class="module-progress-fill" style="width: ${rate}%;"></div>
          </div>
          <span class="module-stat-value">${rate}%</span>
        </div>
      </div>
    `;

    this.infoBannerContainer.appendChild(banner);
  }

  async fetchAndRender() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.contentArea.innerHTML = '';
    this.contentArea.appendChild(LoadingState('Đang tải danh sách test cases...'));

    try {
      let data;
      if (!this.modulesLoaded) {
        const [modulesData, testCasesData] = await Promise.all([
          api.getModules({ signal }),
          api.getTestCases(this.page, 20, this.searchQuery, this.activeModule, { signal }),
        ]);
        this.modules = modulesData || [];
        this.modulesLoaded = true;
        this.renderModuleTabs();
        data = testCasesData;
      } else {
        data = await api.getTestCases(this.page, 20, this.searchQuery, this.activeModule, {
          signal,
        });
      }

      this.renderModuleInfoBanner();
      this.contentArea.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        this.contentArea.appendChild(EmptyState('Không tìm thấy test case nào.'));
        return;
      }

      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Mã</th>
          <th>Mô-đun</th>
          <th>Tiêu Đề</th>
          <th>Trạng Thái</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.items.forEach((tc) => {
        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        const aId = document.createElement('a');
        aId.href = `#test-cases/${encodeURIComponent(tc.test_case_id)}`;
        aId.textContent = tc.test_case_id;
        aId.className = 'link';
        tdId.appendChild(aId);

        const tdModule = document.createElement('td');
        tdModule.textContent = tc.module;

        const tdTitle = document.createElement('td');
        tdTitle.textContent = tc.title;

        const tdStatus = document.createElement('td');
        tdStatus.appendChild(Badge(tc.automation_status, tc.automation_status));

        tr.appendChild(tdId);
        tr.appendChild(tdModule);
        tr.appendChild(tdTitle);
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);
      this.contentArea.appendChild(tableContainer);

      const paginationEl = Pagination(data.pagination, (newPage) => {
        this.page = newPage;
        this.fetchAndRender();
      });
      this.contentArea.appendChild(paginationEl);
    } catch (error) {
      if (error.name === 'AbortError') {
        // Ignored because a new request is taking over
        return;
      }
      this.contentArea.innerHTML = '';
      this.contentArea.appendChild(ErrorState(error));
    }
  }
}

export const TestCasesView = new TestCasesViewClass();
