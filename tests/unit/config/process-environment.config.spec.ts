import { expect, test } from '@playwright/test';

import { loadProcessEnvironmentConfig } from '../../../config/process-environment.config';

test('loads process configuration only when explicitly invoked', () => {
  const controlledEnvironment = {
    TEST_ENV: 'production',
    PRODUCTION_BASE_URL: 'https://production.example.test/',
    DEFAULT_USER_EMAIL: 'default-user@example.test',
    DEFAULT_USER_PASSWORD: 'default-user-password',
  } as const;
  const previous = new Map(
    Object.keys(controlledEnvironment).map((key) => [key, process.env[key]] as const),
  );
  Object.assign(process.env, controlledEnvironment);

  try {
    const config = loadProcessEnvironmentConfig();
    expect(config.environment).toBe('production');
    expect(config.baseUrl).toBe('https://production.example.test/');
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
});
