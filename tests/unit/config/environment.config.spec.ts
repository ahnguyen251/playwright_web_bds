import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parse } from 'dotenv';

import { loadEnvironmentConfig } from '../../../config/environment.config';
import { loadProductionRegistrationConfig } from '../../../config/registration.config';

const validEnvironment = {
  TEST_ENV: 'dev',
  DEV_BASE_URL: 'https://dev.example.test',
  STAGING_BASE_URL: 'https://staging.example.test',
  PRODUCTION_BASE_URL: 'https://production.example.test',
  DEFAULT_USER_EMAIL: 'user@example.test',
  DEFAULT_USER_PASSWORD: 'secret-value',
};

const validOtpEnvironment = {
  ...validEnvironment,
  RUN_OTP_E2E: 'true',
  GMAIL_CLIENT_ID: 'test-client-id',
  GMAIL_CLIENT_SECRET: 'test-client-secret',
  GMAIL_REFRESH_TOKEN: 'test-refresh-token',
  OTP_MAILBOX_ADDRESS: 'automation@gmail.com',
  GMAIL_OTP_SENDER: 'mailer@example.test',
  GMAIL_OTP_SUBJECT: 'Account security code',
  GMAIL_OTP_PATTERN: 'Use {otp} to continue.',
};

test('selects the base URL for the requested environment', () => {
  const config = loadEnvironmentConfig(validEnvironment);

  expect(config.environment).toBe('dev');
  expect(config.baseUrl).toBe('https://dev.example.test/');
  expect(config.ci).toBe(false);
  expect(config.appointmentListingId).toBeUndefined();
});

test('parses a controlled appointment listing reference', () => {
  const config = loadEnvironmentConfig({
    ...validEnvironment,
    APPOINTMENT_LISTING_ID: '48',
  });

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

test('requires a dedicated production approval before mutating listings', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      TEST_ENV: 'production',
      ALLOW_MUTATING_E2E: 'true',
      RUN_PRODUCTION_REGISTRATION_E2E: 'true',
    }),
  ).toThrow(/RUN_PRODUCTION_MUTATING_E2E/);
});

test('permits production listing mutation only with the dedicated approval flag', () => {
  const config = loadEnvironmentConfig({
    ...validEnvironment,
    TEST_ENV: 'production',
    ALLOW_MUTATING_E2E: 'true',
    RUN_PRODUCTION_MUTATING_E2E: 'true',
  });

  expect(config.runProductionMutatingE2e).toBe(true);
  expect(config.allowMutatingE2E).toBe(true);
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

test('loads the Locked account only when both credentials are configured', () => {
  const config = loadEnvironmentConfig({
    ...validEnvironment,
    LOCKED_USER_EMAIL: 'locked-user@example.test',
    LOCKED_USER_PASSWORD: 'locked-test-password',
  });

  expect(config.lockedUser).toEqual({
    email: 'locked-user@example.test',
    password: 'locked-test-password',
  });
});

test('keeps the optional Locked account absent when neither credential is configured', () => {
  expect(loadEnvironmentConfig(validEnvironment).lockedUser).toBeUndefined();
});

test('rejects an incomplete Locked account without exposing its configured value', () => {
  const incompleteEnvironment = {
    ...validEnvironment,
    LOCKED_USER_EMAIL: 'locked-user@example.test',
  };

  expect(() => loadEnvironmentConfig(incompleteEnvironment)).toThrow(/LOCKED_USER_PASSWORD/);

  try {
    loadEnvironmentConfig(incompleteEnvironment);
  } catch (error) {
    expect(String(error)).not.toContain('locked-user@example.test');
  }
});

test('rejects a Locked password without its email and exposes only the missing key name', () => {
  const incompleteEnvironment = {
    ...validEnvironment,
    LOCKED_USER_PASSWORD: 'locked-test-password',
  };

  expect(() => loadEnvironmentConfig(incompleteEnvironment)).toThrow(/LOCKED_USER_EMAIL/);

  try {
    loadEnvironmentConfig(incompleteEnvironment);
  } catch (error) {
    expect(String(error)).not.toContain('locked-test-password');
  }
});

test('keeps Gmail integration disabled when optional values are absent', () => {
  const config = loadEnvironmentConfig(validEnvironment);

  expect(config.runOtpE2e).toBe(false);
  expect(config.runMutatingE2e).toBe(false);
  expect(config.runProductionRegistrationE2e).toBe(false);
  expect(config.runProductionMutatingE2e).toBe(false);
  expect(config.gmail).toBeUndefined();
});

test('requires complete Gmail OAuth configuration when OTP E2E is enabled', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validEnvironment,
      RUN_OTP_E2E: 'true',
      OTP_MAILBOX_ADDRESS: 'automation@gmail.com',
    }),
  ).toThrow(/GMAIL_CLIENT_ID|GMAIL_CLIENT_SECRET|GMAIL_REFRESH_TOKEN/);
});

test('loads typed sender, subject, and safe OTP extraction configuration', () => {
  const config = loadEnvironmentConfig(validOtpEnvironment);

  expect(config.gmail).toEqual({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    mailboxAddress: 'automation@gmail.com',
    otpSender: 'mailer@example.test',
    otpSubject: 'Account security code',
    otpPattern: 'Use {otp} to continue.',
  });
});

test('rejects an unsafe OTP pattern instead of compiling arbitrary regular expressions', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validOtpEnvironment,
      GMAIL_OTP_PATTERN: '(\\d+)+',
    }),
  ).toThrow(/GMAIL_OTP_PATTERN/);
});

test('requires explicit approval before mutating authentication state in production', () => {
  expect(() =>
    loadEnvironmentConfig({
      ...validOtpEnvironment,
      TEST_ENV: 'production',
      RUN_MUTATING_E2E: 'true',
      RUN_PRODUCTION_REGISTRATION_E2E: 'false',
      MUTATING_USER_EMAIL: 'automation+mutating@gmail.com',
      MUTATING_USER_BASELINE_PASSWORD: 'baseline-secret',
      MUTATING_USER_BASELINE_NAME: 'Automation User',
    }),
  ).toThrow(/RUN_PRODUCTION_REGISTRATION_E2E/);
});

test('permits production authentication mutation only with the explicit approval flag', () => {
  const config = loadEnvironmentConfig({
    ...validOtpEnvironment,
    TEST_ENV: 'production',
    RUN_MUTATING_E2E: 'true',
    RUN_PRODUCTION_REGISTRATION_E2E: 'true',
    MUTATING_USER_EMAIL: 'automation+mutating@gmail.com',
    MUTATING_USER_BASELINE_PASSWORD: 'baseline-secret',
    MUTATING_USER_BASELINE_NAME: 'Automation User',
  });

  expect(config.runProductionRegistrationE2e).toBe(true);
});

test('permits production authentication mutation with the unified approval flag', () => {
  const config = loadEnvironmentConfig({
    ...validOtpEnvironment,
    TEST_ENV: 'production',
    RUN_MUTATING_E2E: 'true',
    RUN_PRODUCTION_REGISTRATION_E2E: 'false',
    RUN_PRODUCTION_MUTATING_E2E: 'true',
    MUTATING_USER_EMAIL: 'automation+mutating@gmail.com',
    MUTATING_USER_BASELINE_PASSWORD: 'baseline-secret',
    MUTATING_USER_BASELINE_NAME: 'Automation User',
  });

  expect(config.runProductionMutatingE2e).toBe(true);
});

test('permits non-production authentication mutation without production approval flags', () => {
  const config = loadEnvironmentConfig({
    ...validOtpEnvironment,
    TEST_ENV: 'staging',
    RUN_MUTATING_E2E: 'true',
    RUN_PRODUCTION_REGISTRATION_E2E: 'false',
    RUN_PRODUCTION_MUTATING_E2E: 'false',
    MUTATING_USER_EMAIL: 'automation+mutating@gmail.com',
    MUTATING_USER_BASELINE_PASSWORD: 'baseline-secret',
    MUTATING_USER_BASELINE_NAME: 'Automation User',
  });

  expect(config.runProductionRegistrationE2e).toBe(false);
  expect(config.runProductionMutatingE2e).toBe(false);
});

test('documents one parseable runtime contract using placeholder-only identities', () => {
  const exampleEnvironment = parse(readFileSync('.env.example', 'utf8'));
  const config = loadEnvironmentConfig(exampleEnvironment);

  expect(config.gmail).toEqual({
    clientId: 'replace-with-gmail-client-id',
    clientSecret: 'replace-with-gmail-client-secret',
    refreshToken: 'replace-with-gmail-refresh-token',
    mailboxAddress: 'replace-with-gmail-mailbox@example.test',
    otpSender: 'replace-with-otp-sender@example.test',
    otpSubject: 'replace-with-exact-otp-subject',
    otpPattern: 'replace-with-exact-otp-text-{otp}',
  });
  expect(config.mutatingUser).toEqual({
    email: 'replace-with-mutating-user@example.test',
    baselinePassword: 'replace-with-mutating-baseline-password',
    baselineName: 'replace-with-mutating-baseline-name',
  });
  expect(config.lockedUser).toEqual({
    email: 'replace-with-locked-user@example.test',
    password: 'replace-with-locked-user-password',
  });
  expect(loadProductionRegistrationConfig(exampleEnvironment)).toEqual({
    fullName: 'replace-with-registration-full-name',
    emailTemplate: 'replace-with-registration+{unique}@example.test',
    password: 'replace-with-registration-password',
  });
  expect(exampleEnvironment).not.toHaveProperty('GMAIL_OTP_TIMEOUT_MS');
  expect(exampleEnvironment).not.toHaveProperty('GMAIL_OTP_POLL_INTERVAL_MS');
});
