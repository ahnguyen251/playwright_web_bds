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
    !executionPolicy.productionMutationsApproved,
    'Requires explicit production authentication mutation approval',
  );
});

test(
  'AUTH-PASSWORD-MUTATING-001 changes the dedicated account password and restores its baseline',
  { tag: [TAGS.regression, TAGS.authentication, TAGS.profile, TAGS.otp, TAGS.mutating] },
  async ({ passwordRecoveryWorkflow, authenticationWorkflow, profileWorkflow, mutatingUser }) => {
    const validationData = AuthenticationDataFactory.getValidationData();
    const passwordUnderTest =
      validationData.mismatchedPassword === mutatingUser.password
        ? validationData.validPassword
        : validationData.mismatchedPassword;
    const baselineReset = {
      email: mutatingUser.email,
      newPassword: mutatingUser.password,
      passwordConfirmation: mutatingUser.password,
    };

    await passwordRecoveryWorkflow.resetPassword(baselineReset);
    await authenticationWorkflow.login(mutatingUser);

    try {
      await profileWorkflow.changePassword({
        currentPassword: mutatingUser.password,
        newPassword: passwordUnderTest,
        passwordConfirmation: passwordUnderTest,
      });
      await expect.poll(async () => authenticationWorkflow.isAuthenticated()).toBe(false);
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
