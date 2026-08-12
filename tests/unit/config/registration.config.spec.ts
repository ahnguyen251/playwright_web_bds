import { expect, test } from '@playwright/test';

import {
  isProductionRegistrationEnabled,
  loadProductionRegistrationConfig,
} from '../../../config/registration.config';

const completeSource: NodeJS.ProcessEnv = {
  RUN_PRODUCTION_REGISTRATION_E2E: 'true',
  REGISTRATION_EMAIL_TEMPLATE: 'registration+{unique}@example.test',
  REGISTRATION_FULL_NAME: 'Registration Automation',
  REGISTRATION_PASSWORD: 'StrongPassword1',
};

test('keeps production registration disabled by default', () => {
  expect(isProductionRegistrationEnabled({})).toBe(false);
});

test('enables production registration only for the exact production-registration approval', () => {
  expect(isProductionRegistrationEnabled(completeSource)).toBe(true);
  expect(isProductionRegistrationEnabled({ RUN_PRODUCTION_REGISTRATION_E2E: 'TRUE' })).toBe(false);
});

test('fails fast with missing key names and no configured secret values', () => {
  const source = { ...completeSource };
  delete source.REGISTRATION_PASSWORD;

  expect(() => loadProductionRegistrationConfig(source)).toThrow(
    'Invalid production registration configuration: REGISTRATION_PASSWORD',
  );

  try {
    loadProductionRegistrationConfig(source);
  } catch (error) {
    expect(String(error)).not.toContain('StrongPassword1');
  }
});

test('requires exactly one unique token in the registration email template', () => {
  expect(() =>
    loadProductionRegistrationConfig({
      ...completeSource,
      REGISTRATION_EMAIL_TEMPLATE: 'fixed@example.test',
    }),
  ).toThrow(/REGISTRATION_EMAIL_TEMPLATE/);
});

test('loads only registration identity and leaves Gmail validation to the shared OTP contract', () => {
  const config = loadProductionRegistrationConfig({
    ...completeSource,
    GMAIL_OTP_PATTERN: 'not-a-valid-shared-pattern',
    GMAIL_OTP_TIMEOUT_MS: 'not-a-number',
  });

  expect(config).toEqual({
    fullName: 'Registration Automation',
    emailTemplate: 'registration+{unique}@example.test',
    password: 'StrongPassword1',
  });
});
