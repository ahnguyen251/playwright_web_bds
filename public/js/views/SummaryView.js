import { api } from '../api.js';
import { MetricCard } from '../components/MetricCard.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const SummaryView = {
  mount: async (rootElement) => {
    rootElement.innerHTML = '';
    rootElement.appendChild(LoadingState('Đang tải báo cáo chung...'));

    try {
      const data = await api.getSummary();
      
      rootElement.innerHTML = ''; // clear loading
      
      const tcGrid = document.createElement('div');
      tcGrid.className = 'metrics-grid';
      
      tcGrid.appendChild(MetricCard('Tổng Số Test Case', data.testCases.total));
      tcGrid.appendChild(MetricCard('Đã Tự Động Hóa', data.testCases.automated));
      tcGrid.appendChild(MetricCard('Chưa Tự Động Hóa', data.testCases.notAutomated));
      tcGrid.appendChild(MetricCard(
        'Độ Phủ Tự Động Hóa', 
        `${data.testCases.coveragePercent.toFixed(1)}%`,
        true,
        data.testCases.coveragePercent
      ));
      
      rootElement.appendChild(tcGrid);

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = 'Lần Thực Thi Mới Nhất';
      sectionTitle.style.marginBottom = '16px';
      sectionTitle.style.color = 'var(--text-muted)';
      rootElement.appendChild(sectionTitle);

      const runGrid = document.createElement('div');
      runGrid.className = 'metrics-grid';

      if (!data.latestRun || !data.latestRun.runId) {
        // Handle empty DB for runs gracefully
        runGrid.appendChild(MetricCard('Lần Chạy Mới Nhất', 'Không có'));
        runGrid.appendChild(MetricCard('Tổng Số Lần Chạy', 0));
      } else {
        runGrid.appendChild(MetricCard('Lần Chạy Mới Nhất', data.latestRun.runId));
        runGrid.appendChild(MetricCard('Tổng Số Lần Chạy', data.latestRun.totalExecutions));
        runGrid.appendChild(MetricCard('Thành Công', data.latestRun.passed));
        runGrid.appendChild(MetricCard('Thất Bại', data.latestRun.failed));
        runGrid.appendChild(MetricCard('Đã Map', data.latestRun.mapped));
        runGrid.appendChild(MetricCard('Chưa Map', data.latestRun.unmapped));
        runGrid.appendChild(MetricCard('ID Không Rõ', data.latestRun.unknown));
        runGrid.appendChild(MetricCard('Số Test Case Đã Chạy (Unique)', data.latestRun.uniqueMappedTestCaseIds));
      }

      rootElement.appendChild(runGrid);

    } catch (error) {
      rootElement.innerHTML = '';
      rootElement.appendChild(ErrorState(error));
    }
  },

  unmount: () => {}
};
