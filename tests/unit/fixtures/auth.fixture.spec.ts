import { expect, test } from '@playwright/test';

import { createExecutionPolicy } from '../../../fixtures/auth.fixture';

const mutatingPolicy = {
  RUN_OTP_E2E: 'true',
  RUN_MUTATING_E2E: 'true',
} as const;

test('unified-only approval authorizes production authentication mutations', () => {
  const policy = createExecutionPolicy({
    ...mutatingPolicy,
    TEST_ENV: 'production',
    RUN_PRODUCTION_REGISTRATION_E2E: 'false',
    RUN_PRODUCTION_MUTATING_E2E: 'true',
  });

  expect(policy.productionMutationsApproved).toBe(true);
});

test('legacy-only approval remains valid for production authentication mutations', () => {
  const policy = createExecutionPolicy({
    ...mutatingPolicy,
    TEST_ENV: 'production',
    RUN_PRODUCTION_REGISTRATION_E2E: 'true',
    RUN_PRODUCTION_MUTATING_E2E: 'false',
  });

  expect(policy.productionMutationsApproved).toBe(true);
});

test('non-production authentication mutations do not require a production approval flag', () => {
  const policy = createExecutionPolicy({
    ...mutatingPolicy,
    TEST_ENV: 'staging',
    RUN_PRODUCTION_REGISTRATION_E2E: 'false',
    RUN_PRODUCTION_MUTATING_E2E: 'false',
  });

  expect(policy.productionMutationsApproved).toBe(true);
});
