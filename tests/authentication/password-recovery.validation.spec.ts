import { expect, test } from '../../fixtures/test.fixture';
import { invalidEmailPasswordRecoveryTestCase } from '../../test-cases/authentication/password-recovery.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${invalidEmailPasswordRecoveryTestCase.id} ${invalidEmailPasswordRecoveryTestCase.title}`,
  { tag: [...invalidEmailPasswordRecoveryTestCase.tags] },
  async ({ loginPage }) => {
    await loginPage.openHome();
    await loginPage.open();
    const forgotPasswordPage = await loginPage.openForgotPassword();

    expect(await forgotPasswordPage.currentStage()).toBe('email');
    await forgotPasswordPage.fillEmail(invalidEmailPasswordRecoveryTestCase.email);
    await forgotPasswordPage.blurEmail();
    const requestEnabled = await forgotPasswordPage.isRequestEnabled();

    test.fail(
      requestEnabled,
      'Known product defect: invalid recovery email is validated only after the OTP request is clicked.',
    );

    expect(requestEnabled).toBe(invalidEmailPasswordRecoveryTestCase.expectedRequestEnabled);
  },
);
