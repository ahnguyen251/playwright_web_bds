import { TAGS } from '../../constants/tags';
import { expect, test } from '../../fixtures/test.fixture';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

test.beforeEach(({ executionPolicy }) => {
  test.skip(
    !executionPolicy.runOtpE2e || !executionPolicy.runMutatingE2e,
    'Requires Gmail OTP, mutating E2E, and production approval flags',
  );
  test.skip(
    executionPolicy.environment === 'production' && !executionPolicy.runProductionRegistrationE2e,
    'Requires explicit production authentication mutation approval',
  );
});

test(
  'AUTH-RECOVERY-OTP-001 recovers the dedicated account and restores its baseline password',
  { tag: [TAGS.regression, TAGS.authentication, TAGS.otp, TAGS.mutating] },
  async ({ passwordRecoveryWorkflow, authenticationWorkflow, mutatingUser }) => {
    const validationData = AuthenticationDataFactory.getValidationData();
    const passwordUnderTest =
      validationData.validPassword === mutatingUser.password
        ? validationData.mismatchedPassword
        : validationData.validPassword;
    const baselineReset = {
      email: mutatingUser.email,
      newPassword: mutatingUser.password,
      passwordConfirmation: mutatingUser.password,
    };

    await passwordRecoveryWorkflow.resetPassword(baselineReset);

    try {
      await passwordRecoveryWorkflow.resetPassword({
        email: mutatingUser.email,
        newPassword: passwordUnderTest,
        passwordConfirmation: passwordUnderTest,
      });
      await authenticationWorkflow.login({ ...mutatingUser, password: passwordUnderTest });

      expect(await authenticationWorkflow.isAuthenticated()).toBe(true);
    } finally {
      if (await authenticationWorkflow.isAuthenticated()) {
        await authenticationWorkflow.logout();
      }
      await passwordRecoveryWorkflow.resetPassword(baselineReset);
    }
  },
);
