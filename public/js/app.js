import { Router } from './router.js';
import { SummaryView } from './views/SummaryView.js';
import { TestCasesView } from './views/TestCasesView.js';
import { RunsView } from './views/RunsView.js';
import { RunDetailsView } from './views/RunDetailsView.js';

import { TestCaseDetailsView } from './views/TestCaseDetailsView.js';

document.addEventListener('DOMContentLoaded', () => {
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
