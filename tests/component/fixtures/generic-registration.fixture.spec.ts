import { createExecutionPolicy } from '../../../fixtures/auth.fixture';
import { expect, genericRegistrationTest } from '../../../fixtures/generic-registration.fixture';

const productionApprovedTest = genericRegistrationTest.extend({
  executionPolicy: async ({ browserName }, use) => {
    void browserName;
    await use(
      createExecutionPolicy({
        TEST_ENV: 'production',
        RUN_OTP_E2E: 'true',
        RUN_MUTATING_E2E: 'true',
        RUN_PRODUCTION_REGISTRATION_E2E: 'false',
        RUN_PRODUCTION_MUTATING_E2E: 'true',
      }),
    );
  },
});

productionApprovedTest('generic registration remains skipped in approved production runs', () => {
  throw new Error('Generic registration safety fixture did not skip the production test');
});

const stagingApprovedTest = genericRegistrationTest.extend({
  executionPolicy: async ({ browserName }, use) => {
    void browserName;
    await use(
      createExecutionPolicy({
        TEST_ENV: 'staging',
        RUN_OTP_E2E: 'true',
        RUN_MUTATING_E2E: 'true',
      }),
    );
  },
});

stagingApprovedTest(
  'generic registration remains runnable behind non-production gates',
  ({ executionPolicy }) => {
    expect(executionPolicy.genericRegistrationAllowed).toBe(true);
  },
);
