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
});

test('tắt E2E có thay đổi theo mặc định', () => {
  expect(loadEnvironmentConfig(validEnvironment).allowMutatingE2E).toBe(false);
});

test('chỉ bật E2E có thay đổi khi cờ có giá trị chính xác là true', () => {
  expect(
    loadEnvironmentConfig({
      ...validEnvironment,
      ALLOW_MUTATING_E2E: 'true',
    }).allowMutatingE2E,
  ).toBe(true);
});

test('từ chối giá trị cờ E2E có thay đổi không hợp lệ', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      ALLOW_MUTATING_E2E: 'TRUE',
    }),
  ).toThrow(/ALLOW_MUTATING_E2E/);
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
