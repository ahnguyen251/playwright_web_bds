import { expect, test } from '@playwright/test';

import playwrightConfig from '../../../playwright.config';

const effectiveUseFor = (projectName: string): Record<string, unknown> => {
  const project = playwrightConfig.projects?.find(({ name }) => name === projectName);

  if (project === undefined) {
    throw new Error(`Missing Playwright project: ${projectName}`);
  }

  return { ...playwrightConfig.use, ...project.use };
};

test('mutating project disables artifacts that can capture account secrets', () => {
  const use = effectiveUseFor('mutating-chromium');

  expect(use.screenshot).toBe('off');
  expect(use.video).toBe('off');
  expect(use.trace).toBe('off');
});

test('default browser projects retain enterprise failure artifacts', () => {
  for (const projectName of ['chromium', 'firefox', 'webkit']) {
    const use = effectiveUseFor(projectName);

    expect(use.screenshot).toBe('only-on-failure');
    expect(use.video).toBe('retain-on-failure');
    expect(use.trace).toBe('on-first-retry');
  }
});

test('Allure omits detailed Playwright steps that can contain typed credentials', () => {
  const reporters = Array.isArray(playwrightConfig.reporter) ? playwrightConfig.reporter : [];
  const allureReporter = reporters.find(
    (reporter) => Array.isArray(reporter) && reporter[0] === 'allure-playwright',
  );

  expect(allureReporter?.[1]).toMatchObject({ detail: false });
});
