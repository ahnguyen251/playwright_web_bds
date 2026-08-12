import { defineConfig, devices } from '@playwright/test';

import { loadEnvironmentConfig } from './config/environment.config';
import { TIMEOUTS } from './constants/timeouts';
import { createAllureEnvironment } from './reporters/allure-environment';

const environment = loadEnvironmentConfig();
const defaultStorageState = '.auth/defaultUser.json';
const endToEndTestMatch =
  /(authentication|profile|listings|appointments|transactions)\/.*\.spec\.ts/;
const mutatingTestMatch = /(authentication|profile)\/.*\.mutating\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: environment.ci,
  retries: environment.ci ? 2 : 0,
  ...(environment.ci ? { workers: 2 } : {}),
  timeout: TIMEOUTS.test,
  expect: {
    timeout: TIMEOUTS.assertion,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        detail: false,
        suiteTitle: false,
        environmentInfo: createAllureEnvironment(environment),
      },
    ],
  ],
  use: {
    baseURL: environment.baseUrl,
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'framework',
      testMatch: /(unit|component)\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth-setup',
      testMatch: /setup\/.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
        trace: 'off',
      },
    },
    {
      name: 'chromium',
      testMatch: endToEndTestMatch,
      testIgnore: mutatingTestMatch,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: defaultStorageState,
        trace: 'off',
      },
    },
    {
      name: 'firefox',
      testMatch: endToEndTestMatch,
      testIgnore: mutatingTestMatch,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: defaultStorageState,
        trace: 'off',
      },
    },
    {
      name: 'webkit',
      testMatch: endToEndTestMatch,
      testIgnore: mutatingTestMatch,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: defaultStorageState,
        trace: 'off',
      },
    },
    {
      name: 'mutating-chromium',
      testMatch: mutatingTestMatch,
      fullyParallel: false,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
    },
  ],
});
