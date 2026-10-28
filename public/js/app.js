import { Router } from './router.js?v=2.2.0';
import { SummaryView } from './views/SummaryView.js?v=2.2.0';
import { TestCasesView } from './views/TestCasesView.js?v=2.2.0';
import { RunsView } from './views/RunsView.js?v=2.2.0';
import { RunDetailsView } from './views/RunDetailsView.js?v=2.2.0';
import { TestCaseDetailsView } from './views/TestCaseDetailsView.js?v=2.2.0';

document.addEventListener('DOMContentLoaded', () => {
  window.selectedExecutionBrowser = 'chromium';
  const topbarBrowserSelect = document.getElementById('topbar-browser-select');
  if (topbarBrowserSelect) {
    topbarBrowserSelect.addEventListener('change', (e) => {
      window.selectedExecutionBrowser = e.target.value;
      if (TestCasesView) {
        TestCasesView.executionBrowser = e.target.value;
        const select = document.getElementById('execution-browser-select');
        if (select) select.value = e.target.value;
      }
    });
  }

  const routes = {
    'summary': { view: SummaryView, title: 'Báo Cáo Chung - Playwright APM' },
    'test-cases': { view: TestCasesView, title: 'Danh Sách Test Case - Playwright APM' },
    'test-cases/:testCaseId': { view: TestCaseDetailsView, title: 'Chi Tiết Test Case - Playwright APM' },
    'runs': { view: RunsView, title: 'Lịch Sử Chạy Test - Playwright APM' },
    'runs/:runId': { view: RunDetailsView, title: 'Chi Tiết Lần Chạy - Playwright APM' }
  };

  const router = new Router(routes, 'summary');
  router.init();
});
