import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const requiredEnvironmentPath = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the isolated persistent evidence probe.`);
  return path.resolve(value);
};

const repositoryRoot = path.resolve(__dirname, '../..');
const evidenceRoot = requiredEnvironmentPath('PERSISTENT_EVIDENCE_ROOT');
const transientRoot = requiredEnvironmentPath('PERSISTENT_EVIDENCE_TRANSIENT_ROOT');

export default defineConfig({
  testDir: path.join(repositoryRoot, 'tests', 'support'),
  testMatch: /persistent-evidence-(?:browser|framework)-probe\.spec\.ts/u,
  outputDir: transientRoot,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    [path.join(repositoryRoot, 'reporters', 'test-tracking-reporter.ts'), { evidenceRoot }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'persistent-evidence-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
