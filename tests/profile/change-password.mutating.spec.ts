import { expect, test } from '../../fixtures/test.fixture';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const successfulChangeTestCase = getProfileTestCase('TC-PROFILE-CHANGEPW-001');
const wrongCurrentPasswordTestCase = getProfileTestCase('TC-PROFILE-CHANGEPW-002');

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
  `${successfulChangeTestCase.id} ${successfulChangeTestCase.title}`,
  { tag: [...successfulChangeTestCase.tags] },
  async ({
    authRequestObserver,
    page,
    passwordRecoveryWorkflow,
    authenticationWorkflow,
    profileWorkflow,
    mutatingUser,
  }) => {
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
      const response = await authRequestObserver.waitForStatus('changePassword', async () =>
        profileWorkflow.changePassword({
          currentPassword: mutatingUser.password,
          newPassword: passwordUnderTest,
          passwordConfirmation: passwordUnderTest,
        }),
      );
      expect(response.status >= 200 && response.status < 300).toBe(true);
      await expect.poll(async () => authenticationWorkflow.isAuthenticated()).toBe(false);
      await expect(page).toHaveURL((url) => url.pathname === '/login');
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

test(
  `${wrongCurrentPasswordTestCase.id} ${wrongCurrentPasswordTestCase.title}`,
  { tag: [...wrongCurrentPasswordTestCase.tags] },
  async ({
    authRequestObserver,
    passwordRecoveryWorkflow,
    authenticationWorkflow,
    profileWorkflow,
    profilePage,
    mutatingUser,
  }) => {
    const baselineReset = {
      email: mutatingUser.email,
      newPassword: mutatingUser.password,
      passwordConfirmation: mutatingUser.password,
    };
    const rejectedData = {
      currentPassword: 'DefinitelyWrongPassword1',
      newPassword: AuthenticationDataFactory.getValidationData().mismatchedPassword,
      passwordConfirmation: AuthenticationDataFactory.getValidationData().mismatchedPassword,
    };

    await passwordRecoveryWorkflow.resetPassword(baselineReset);
    await authenticationWorkflow.login(mutatingUser);

    try {
      const response = await authRequestObserver.waitForStatus('changePassword', async () =>
        profileWorkflow.changePassword(rejectedData),
      );

      expect(response.status >= 400 && response.status < 500).toBe(true);
      expect(await profilePage.changePassword().currentPasswordError()).toBe(
        'Mật khẩu hiện tại không chính xác',
      );
      expect(await profilePage.changePassword().matches(rejectedData)).toBe(true);

      await authenticationWorkflow.logout();
      await authenticationWorkflow.login(mutatingUser);
      expect(await authenticationWorkflow.isAuthenticated()).toBe(true);
    } finally {
      if (await authenticationWorkflow.isAuthenticated()) {
        await authenticationWorkflow.logout();
      }
      await passwordRecoveryWorkflow.resetPassword(baselineReset);
    }
  },
);
