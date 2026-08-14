import { expect, test } from '@playwright/test';

import {
  authTest,
  createLockedUserFixture,
  createExecutionPolicy,
  genericRegistrationSkipReason,
  passwordRecoveryConfigurationSkipReason,
} from '../../../fixtures/auth.fixture';

authTest(
  'provides a page-bound authentication request observer',
  async ({ authRequestObserver, page }) => {
    const requestCount = await authRequestObserver.countDuring('registration', async () => {
      await page.evaluate(async () => {
        await fetch('http://127.0.0.1:1/api/v1/auth/register', { method: 'POST' }).catch(
          () => undefined,
        );
      });
    });

    expect(requestCount).toBe(1);
  },
);

test('constructs the optional Locked account fixture from validated environment config', () => {
  expect(
    createLockedUserFixture({
      lockedUser: {
        email: 'locked-user@example.test',
        password: 'locked-test-password',
      },
    }),
  ).toEqual({
    alias: 'lockedUser',
    email: 'locked-user@example.test',
    password: 'locked-test-password',
  });
  expect(createLockedUserFixture({})).toBeUndefined();
});

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

test('registration-only approval cannot authorize production password recovery or profile mutations', () => {
  const policy = createExecutionPolicy({
    ...mutatingPolicy,
    TEST_ENV: 'production',
    RUN_PRODUCTION_REGISTRATION_E2E: 'true',
    RUN_PRODUCTION_MUTATING_E2E: 'false',
  });

  expect(policy.productionRegistrationApproved).toBe(true);
  expect(policy.productionMutationsApproved).toBe(false);
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

test('generic OTP registration remains rejected in production under either approval mode', () => {
  for (const approval of [
    {
      RUN_PRODUCTION_REGISTRATION_E2E: 'true',
      RUN_PRODUCTION_MUTATING_E2E: 'false',
    },
    {
      RUN_PRODUCTION_REGISTRATION_E2E: 'false',
      RUN_PRODUCTION_MUTATING_E2E: 'true',
    },
  ] as const) {
    const policy = createExecutionPolicy({
      ...mutatingPolicy,
      ...approval,
      TEST_ENV: 'production',
    });

    expect(policy.genericRegistrationAllowed).toBe(false);
    expect(genericRegistrationSkipReason(policy)).toContain(
      'dedicated production registration project',
    );
  }
});

test('generic OTP registration follows the normal OTP and mutation gates outside production', () => {
  for (const scenario of [
    { RUN_OTP_E2E: 'true', RUN_MUTATING_E2E: 'true', expected: true },
    { RUN_OTP_E2E: 'true', RUN_MUTATING_E2E: 'false', expected: false },
    { RUN_OTP_E2E: 'false', RUN_MUTATING_E2E: 'false', expected: false },
  ] as const) {
    const policy = createExecutionPolicy({
      TEST_ENV: 'staging',
      RUN_OTP_E2E: scenario.RUN_OTP_E2E,
      RUN_MUTATING_E2E: scenario.RUN_MUTATING_E2E,
      RUN_PRODUCTION_REGISTRATION_E2E: 'false',
      RUN_PRODUCTION_MUTATING_E2E: 'false',
    });

    expect(policy.genericRegistrationAllowed).toBe(scenario.expected);
    expect(genericRegistrationSkipReason(policy) === undefined).toBe(scenario.expected);
  }
});

test('blocks password recovery when the baseline already equals the authoritative new password', () => {
  expect(passwordRecoveryConfigurationSkipReason('same-password', 'same-password')).toContain(
    'baseline password must differ',
  );
  expect(
    passwordRecoveryConfigurationSkipReason('baseline-password', 'new-password'),
  ).toBeUndefined();
});
