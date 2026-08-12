import { expect, test } from '@playwright/test';

import { RegistrationDataFactory } from '../../../test-data/factories/RegistrationDataFactory';
import type { ProductionRegistrationConfig } from '../../../types/otp.types';

const config = {
  fullName: 'Registration Automation',
  emailTemplate: 'registration+{unique}@example.test',
  password: 'StrongPassword1',
  gmail: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    refreshToken: 'refresh-token',
    otpPattern: 'Mã OTP: {otp}',
    subject: 'Verify registration',
    timeoutMs: 60_000,
    pollIntervalMs: 2_000,
  },
} satisfies ProductionRegistrationConfig;

test('creates immutable registration data from the explicit unique token', () => {
  const data = RegistrationDataFactory.create(config, 'run-123');

  expect(data).toEqual({
    fullName: 'Registration Automation',
    email: 'registration+run-123@example.test',
    password: 'StrongPassword1',
    passwordConfirmation: 'StrongPassword1',
  });
  expect(Object.isFrozen(data)).toBe(true);
});

test('generates a different identity for each default call', () => {
  expect(RegistrationDataFactory.create(config).email).not.toBe(
    RegistrationDataFactory.create(config).email,
  );
});
