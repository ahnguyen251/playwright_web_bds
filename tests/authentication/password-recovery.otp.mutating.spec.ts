import { expect, test } from '../../fixtures/test.fixture';
import { test as blockedTest } from '../../fixtures/test.fixture';
import {
  invalidOrExpiredPasswordRecoveryOtpTestCase,
  successfulPasswordRecoveryTestCase,
} from '../../test-cases/authentication/password-recovery.test-cases';
import type { ForgotPasswordPage } from '../../pages/authentication/ForgotPasswordPage';
import type { LoginPage } from '../../pages/authentication/LoginPage';
import type { OtpProvider } from '../../types/otp.types';
import type { PasswordResetData } from '../../types/user.types';
import type { PasswordRecoveryWorkflow } from '../../workflows/authentication/PasswordRecoveryWorkflow';

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: 'serial' });

const deriveIncorrectOtp = (otp: string): string => {
  if (!/^\d{6}$/.test(otp)) {
    throw new Error('OTP provider returned a value outside the six-digit contract.');
  }

  const changedFirstDigit = String((Number(otp.charAt(0)) + 1) % 10);
  return `${changedFirstDigit}${otp.slice(1)}`;
};

const setPasswordAndAssertSuccess = async (
  passwordRecoveryWorkflow: PasswordRecoveryWorkflow,
  forgotPasswordPage: ForgotPasswordPage,
  loginPage: LoginPage,
  otpProvider: OtpProvider,
  data: PasswordResetData,
): Promise<void> => {
  const otpQuery = await passwordRecoveryWorkflow.beginPasswordRecovery(data.email);
  const deliveredOtp = await otpProvider.getOtp(otpQuery);
  await passwordRecoveryWorkflow.submitOtp(deliveredOtp);
  await forgotPasswordPage.fillNewPassword(data);
  await forgotPasswordPage.submitNewPassword();

  await expect.poll(async () => forgotPasswordPage.currentStage()).toBe('login');
  expect(await forgotPasswordPage.visibleMessage()).toBe('Thành công!');

  await forgotPasswordPage.backToLogin();
  await expect.poll(async () => loginPage.isOpen()).toBe(true);
};

test.describe('gated password-recovery OTP scenarios', () => {
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
    `${successfulPasswordRecoveryTestCase.id} ${successfulPasswordRecoveryTestCase.title}`,
    { tag: [...successfulPasswordRecoveryTestCase.tags] },
    async ({
      authenticationWorkflow,
      forgotPasswordPage,
      loginPage,
      mutatingUser,
      otpProvider,
      passwordRecoveryWorkflow,
    }) => {
      const catalogPassword = successfulPasswordRecoveryTestCase.newPassword;
      if (catalogPassword === undefined) {
        throw new Error('Successful password recovery test data requires a new password.');
      }
      const passwordUnderTest =
        catalogPassword === mutatingUser.password ? `${catalogPassword}A` : catalogPassword;
      const baselineReset = {
        email: mutatingUser.email,
        newPassword: mutatingUser.password,
        passwordConfirmation: mutatingUser.password,
      };

      await passwordRecoveryWorkflow.resetPassword(baselineReset);

      try {
        await setPasswordAndAssertSuccess(
          passwordRecoveryWorkflow,
          forgotPasswordPage,
          loginPage,
          otpProvider,
          {
            email: mutatingUser.email,
            newPassword: passwordUnderTest,
            passwordConfirmation: passwordUnderTest,
          },
        );
        await authenticationWorkflow.login({ ...mutatingUser, password: passwordUnderTest });

        await expect.poll(async () => authenticationWorkflow.isAuthenticated()).toBe(true);
      } finally {
        try {
          if (await authenticationWorkflow.isAuthenticated()) {
            await authenticationWorkflow.logout();
          }
        } finally {
          await passwordRecoveryWorkflow.resetPassword(baselineReset);
        }
      }
    },
  );

  test(
    `${invalidOrExpiredPasswordRecoveryOtpTestCase.id} - OTP sai`,
    { tag: [...invalidOrExpiredPasswordRecoveryOtpTestCase.tags] },
    async ({ forgotPasswordPage, mutatingUser, otpProvider, passwordRecoveryWorkflow }) => {
      const otpQuery = await passwordRecoveryWorkflow.beginPasswordRecovery(mutatingUser.email);
      const deliveredOtp = await otpProvider.getOtp(otpQuery);

      await passwordRecoveryWorkflow.submitOtp(deriveIncorrectOtp(deliveredOtp));

      await expect.poll(async () => forgotPasswordPage.currentStage()).toBe('otp');
      await passwordRecoveryWorkflow.submitOtp(deliveredOtp);
      await expect.poll(async () => forgotPasswordPage.currentStage()).toBe('newPassword');
    },
  );
});

blockedTest(
  `${invalidOrExpiredPasswordRecoveryOtpTestCase.id} - OTP hết hạn`,
  { tag: [...invalidOrExpiredPasswordRecoveryOtpTestCase.tags] },
  () => {
    blockedTest.skip(
      true,
      'BLOCKED: no server clock, TTL override, expired-OTP seed, or fault injection.',
    );
  },
);
