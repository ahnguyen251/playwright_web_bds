import { expect, test } from '@playwright/test';

import { loadEnvironmentConfig } from '../../../config/environment.config';

const validEnvironment = {
  TEST_ENV: 'dev',
  DEV_BASE_URL: 'https://dev.example.test',
  STAGING_BASE_URL: 'https://staging.example.test',
  PRODUCTION_BASE_URL: 'https://production.example.test',
  DEFAULT_USER_EMAIL: 'user@example.test',
  DEFAULT_USER_PASSWORD: 'secret-value',
};

test('selects the base URL for the requested environment', () => {
  const config = loadEnvironmentConfig(validEnvironment);

  expect(config.environment).toBe('dev');
  expect(config.baseUrl).toBe('https://dev.example.test/');
  expect(config.ci).toBe(false);
  expect(config.runMutatingTests).toBe(false);
  expect(config.appointmentListingId).toBeUndefined();
});

test('parses appointment mutation configuration', () => {
  const config = loadEnvironmentConfig({
    ...validEnvironment,
    RUN_MUTATING_TESTS: 'true',
    APPOINTMENT_LISTING_ID: '48',
  });

  expect(config.runMutatingTests).toBe(true);
  expect(config.appointmentListingId).toBe(48);
});

test('rejects an invalid appointment listing id', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      APPOINTMENT_LISTING_ID: '0',
    }),
  ).toThrow(/APPOINTMENT_LISTING_ID/);
});

test('rejects an unsupported environment before browser launch', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      TEST_ENV: 'qa',
    }),
  ).toThrow(/TEST_ENV/);
});

test('reports a missing credential key without exposing another secret', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      DEFAULT_USER_PASSWORD: undefined,
    }),
  ).toThrow(/DEFAULT_USER_PASSWORD/);

  try {
    loadEnvironmentConfig({
      ...validEnvironment,
      DEFAULT_USER_PASSWORD: undefined,
    });
  } catch (error) {
    expect(String(error)).not.toContain('secret-value');
  }
});
