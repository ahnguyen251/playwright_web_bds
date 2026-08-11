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
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REFRESH_TOKEN: 'refresh-token',
  GMAIL_OTP_PATTERN: 'Mã OTP: (?<otp>\\d{6})',
  GMAIL_OTP_TIMEOUT_MS: '60000',
  GMAIL_OTP_POLL_INTERVAL_MS: '2000',
};

test('keeps production registration disabled by default', () => {
  expect(isProductionRegistrationEnabled({})).toBe(false);
});

test('enables production registration only for the exact true value', () => {
  expect(isProductionRegistrationEnabled(completeSource)).toBe(true);
  expect(isProductionRegistrationEnabled({ RUN_PRODUCTION_REGISTRATION_E2E: 'TRUE' })).toBe(false);
});

test('fails fast with missing key names and no configured secret values', () => {
  const source = { ...completeSource };
  delete source.GMAIL_CLIENT_ID;

  expect(() => loadProductionRegistrationConfig(source)).toThrow(
    'Invalid production registration configuration: GMAIL_CLIENT_ID',
  );

  try {
    loadProductionRegistrationConfig(source);
  } catch (error) {
    expect(String(error)).not.toContain('client-secret');
    expect(String(error)).not.toContain('refresh-token');
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

test('requires a compilable OTP pattern with a named otp capture', () => {
  expect(() =>
    loadProductionRegistrationConfig({
      ...completeSource,
      GMAIL_OTP_PATTERN: '\\d{6}',
    }),
  ).toThrow(/GMAIL_OTP_PATTERN/);
});
