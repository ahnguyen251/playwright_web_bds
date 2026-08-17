import { api } from '../api.js';
import { MetricCard } from '../components/MetricCard.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';

export const SummaryView = {
  mount: async (rootElement) => {
    rootElement.innerHTML = '';
    rootElement.appendChild(LoadingState('Loading summary...'));

    try {
      const data = await api.getSummary();
      
      rootElement.innerHTML = ''; // clear loading
      
      const tcGrid = document.createElement('div');
      tcGrid.className = 'metrics-grid';
      
      tcGrid.appendChild(MetricCard('Total Test Cases', data.testCases.total));
      tcGrid.appendChild(MetricCard('Automated', data.testCases.automated));
      tcGrid.appendChild(MetricCard('Not Automated', data.testCases.notAutomated));
      tcGrid.appendChild(MetricCard(
        'Automation Coverage', 
        `${data.testCases.coveragePercent.toFixed(1)}%`,
        true,
        data.testCases.coveragePercent
      ));
      
      rootElement.appendChild(tcGrid);

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = 'Latest Execution';
      sectionTitle.style.marginBottom = '16px';
      sectionTitle.style.color = 'var(--text-muted)';
      rootElement.appendChild(sectionTitle);

      const runGrid = document.createElement('div');
      runGrid.className = 'metrics-grid';

      if (!data.latestRun || !data.latestRun.runId) {
        // Handle empty DB for runs gracefully
        runGrid.appendChild(MetricCard('Latest Run', 'None'));
        runGrid.appendChild(MetricCard('Total Executions', 0));
      } else {
        runGrid.appendChild(MetricCard('Latest Run', data.latestRun.runId));
        runGrid.appendChild(MetricCard('Total Executions', data.latestRun.totalExecutions));
        runGrid.appendChild(MetricCard('Passed', data.latestRun.passed));
        runGrid.appendChild(MetricCard('Failed', data.latestRun.failed));
        runGrid.appendChild(MetricCard('Mapped', data.latestRun.mapped));
        runGrid.appendChild(MetricCard('Unmapped', data.latestRun.unmapped));
        runGrid.appendChild(MetricCard('Unknown IDs', data.latestRun.unknown));
        runGrid.appendChild(MetricCard('Unique TCs Executed', data.latestRun.uniqueMappedTestCaseIds));
      }

      rootElement.appendChild(runGrid);

    } catch (error) {
      rootElement.innerHTML = '';
      rootElement.appendChild(ErrorState(error));
    }
  },

  unmount: () => {}
};
