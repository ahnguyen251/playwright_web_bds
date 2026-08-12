import { expect, test } from '@playwright/test';

import playwrightConfig from '../../../playwright.config';

const effectiveUseFor = (projectName: string): Record<string, unknown> => {
  const project = playwrightConfig.projects?.find(({ name }) => name === projectName);

  if (project === undefined) {
    throw new Error(`Missing Playwright project: ${projectName}`);
  }

  return { ...playwrightConfig.use, ...project.use };
};

const projectFor = (projectName: string) => {
  const project = playwrightConfig.projects?.find(({ name }) => name === projectName);
  if (project === undefined) throw new Error(`Missing Playwright project: ${projectName}`);
  return project;
};

const matches = (pattern: unknown, file: string): boolean => {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return patterns.some((candidate) => candidate instanceof RegExp && candidate.test(file));
};

test('mutating project disables artifacts that can capture account secrets', () => {
  const use = effectiveUseFor('mutating-chromium');

  expect(use.screenshot).toBe('off');
  expect(use.video).toBe('off');
  expect(use.trace).toBe('off');
});

test('all mutating specs run only in the single-worker mutating project', () => {
  const mutatingFiles = [
    'authentication/registration.otp.mutating.spec.ts',
    'profile/profile.mutating.spec.ts',
    'listings/create-listing.mutating.spec.ts',
    'appointments/appointment-booking.mutating.spec.ts',
  ];

  for (const projectName of ['chromium', 'firefox', 'webkit']) {
    const project = projectFor(projectName);
    for (const file of mutatingFiles) expect(matches(project.testIgnore, file)).toBe(true);
  }

  const mutatingProject = projectFor('mutating-chromium');
  for (const file of mutatingFiles) expect(matches(mutatingProject.testMatch, file)).toBe(true);
  expect(mutatingProject.fullyParallel).toBe(false);
  expect(mutatingProject.workers).toBe(1);
});

test('credential-bearing projects disable traces while retaining default screenshot and video policies', () => {
  for (const projectName of ['auth-setup', 'chromium', 'firefox', 'webkit']) {
    const use = effectiveUseFor(projectName);

    expect(use.screenshot).toBe('only-on-failure');
    expect(use.video).toBe('retain-on-failure');
    expect(use.trace).toBe('off');
  }
});

test('secret-free framework project retains enterprise failure artifacts', () => {
  const use = effectiveUseFor('framework');

  expect(use.screenshot).toBe('only-on-failure');
  expect(use.video).toBe('retain-on-failure');
  expect(use.trace).toBe('on-first-retry');
});

test('Allure omits detailed Playwright steps that can contain typed credentials', () => {
  const reporters = Array.isArray(playwrightConfig.reporter) ? playwrightConfig.reporter : [];
  const allureReporter = reporters.find(
    (reporter) => Array.isArray(reporter) && reporter[0] === 'allure-playwright',
  );

  expect(allureReporter?.[1]).toMatchObject({ detail: false });
});
