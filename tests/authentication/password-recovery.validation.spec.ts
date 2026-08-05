import { expect, test } from '../../fixtures/test.fixture';
import { invalidEmailPasswordRecoveryTestCase } from '../../test-cases/authentication/password-recovery.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${invalidEmailPasswordRecoveryTestCase.id} ${invalidEmailPasswordRecoveryTestCase.title}`,
  { tag: [...invalidEmailPasswordRecoveryTestCase.tags] },
  async ({ loginPage }) => {
    test.fail(
      true,
      'Known product defect: invalid recovery email is validated only after the OTP request is clicked.',
    );

    await loginPage.openHome();
    await loginPage.open();
    const forgotPasswordPage = await loginPage.openForgotPassword();

    expect(await forgotPasswordPage.currentStage()).toBe('email');
    await forgotPasswordPage.fillEmail(invalidEmailPasswordRecoveryTestCase.email);
    await forgotPasswordPage.blurEmail();

    expect(await forgotPasswordPage.isRequestEnabled()).toBe(
      invalidEmailPasswordRecoveryTestCase.expectedRequestEnabled,
    );
  },
);
