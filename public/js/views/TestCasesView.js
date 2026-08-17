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
  }

  async mount(rootElement) {
    this.root = rootElement;
    this.renderContainer();
    await this.fetchAndRender();
  }

  unmount() {
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
    this.contentArea.innerHTML = '';
    this.contentArea.appendChild(LoadingState('Loading test cases...'));

    try {
      const data = await api.getTestCases(this.page, 20, this.searchQuery);
      this.contentArea.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        this.contentArea.appendChild(EmptyState('No test cases found.'));
        return;
      }

      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>ID</th>
          <th>Module</th>
          <th>Title</th>
          <th>Status</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.items.forEach(tc => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.textContent = tc.test_case_id;
        
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
      this.contentArea.innerHTML = '';
      this.contentArea.appendChild(ErrorState(error));
    }
  }
}

export const TestCasesView = new TestCasesViewClass();
