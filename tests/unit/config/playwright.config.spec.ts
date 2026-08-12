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

test('appointment mutation has authenticated serialized isolation without changing registration state', () => {
  const generalMutationUse = effectiveUseFor('mutating-chromium');
  const appointmentMutationUse = effectiveUseFor('appointment-mutating-chromium');
  const appointmentProject = projectFor('appointment-mutating-chromium');

  expect(generalMutationUse.storageState).toEqual({ cookies: [], origins: [] });
  expect(appointmentMutationUse.storageState).toBe('.auth/defaultUser.json');
  expect(appointmentMutationUse.screenshot).toBe('off');
  expect(appointmentMutationUse.video).toBe('off');
  expect(appointmentMutationUse.trace).toBe('off');
  expect(appointmentProject.dependencies).toEqual(['auth-setup']);
  expect(appointmentProject.fullyParallel).toBe(false);
  expect(appointmentProject.workers).toBe(1);
});

test('all mutating specs run only in their single-worker mutation project', () => {
  const generalMutatingFiles = [
    'authentication/registration.otp.mutating.spec.ts',
    'profile/profile.mutating.spec.ts',
    'listings/create-listing.mutating.spec.ts',
  ];
  const appointmentMutatingFile = 'appointments/appointment-booking.mutating.spec.ts';

  for (const projectName of ['chromium', 'firefox', 'webkit']) {
    const project = projectFor(projectName);
    for (const file of [...generalMutatingFiles, appointmentMutatingFile]) {
      expect(matches(project.testIgnore, file)).toBe(true);
    }
  }

  const mutatingProject = projectFor('mutating-chromium');
  for (const file of generalMutatingFiles) {
    expect(matches(mutatingProject.testMatch, file)).toBe(true);
  }
  expect(matches(mutatingProject.testMatch, appointmentMutatingFile)).toBe(false);
  expect(mutatingProject.fullyParallel).toBe(false);
  expect(mutatingProject.workers).toBe(1);

  const appointmentProject = projectFor('appointment-mutating-chromium');
  expect(matches(appointmentProject.testMatch, appointmentMutatingFile)).toBe(true);
  for (const file of generalMutatingFiles) {
    expect(matches(appointmentProject.testMatch, file)).toBe(false);
  }
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
