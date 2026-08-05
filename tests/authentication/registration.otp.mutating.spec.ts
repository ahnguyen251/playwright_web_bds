import { TAGS } from '../../constants/tags';
import { expect, test } from '../../fixtures/test.fixture';

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test.beforeEach(({ executionPolicy }) => {
  test.skip(
    !executionPolicy.runOtpE2e || !executionPolicy.runMutatingE2e,
    'Requires Gmail OTP and mutating E2E flags',
  );
});

test(
  'AUTH-REGISTER-OTP-001 registers a fresh Gmail alias and verifies its OTP',
  { tag: [TAGS.regression, TAGS.authentication, TAGS.otp, TAGS.mutating] },
  async ({ registrationWorkflow, authenticationWorkflow, authenticationData }) => {
    await registrationWorkflow.registerAndVerify(authenticationData.registration);

    expect(await authenticationWorkflow.isAuthenticated()).toBe(true);
  },
);
