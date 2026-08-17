import { Router } from './router.js';
import { SummaryView } from './views/SummaryView.js';
import { TestCasesView } from './views/TestCasesView.js';
import { RunsView } from './views/RunsView.js';
import { RunDetailsView } from './views/RunDetailsView.js';

document.addEventListener('DOMContentLoaded', () => {
  const routes = {
    'summary': { view: SummaryView, title: 'Summary - Playwright APM' },
    'test-cases': { view: TestCasesView, title: 'Test Cases - Playwright APM' },
    'runs': { view: RunsView, title: 'Test Runs - Playwright APM' },
    'runs/:runId': { view: RunDetailsView, title: 'Run Details - Playwright APM' }
  };

  const router = new Router(routes, 'summary');
  router.init();
});
