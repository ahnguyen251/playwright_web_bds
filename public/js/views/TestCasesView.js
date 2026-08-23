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
    this.debouncer = null;
    this.abortController = null;
  }

  async mount(rootElement) {
    this.root = rootElement;
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

    this.contentArea = document.createElement('div');
    this.root.appendChild(this.contentArea);
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
      const data = await api.getTestCases(this.page, 20, this.searchQuery, { signal });
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
      data.items.forEach(tc => {
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
