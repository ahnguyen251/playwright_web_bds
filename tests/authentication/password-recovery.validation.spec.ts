import { expect, test } from '../../fixtures/test.fixture';
import { emptyPasswordRecoveryTestCase } from '../../test-cases/authentication/password-recovery.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${emptyPasswordRecoveryTestCase.id} ${emptyPasswordRecoveryTestCase.title}`,
  { tag: [...emptyPasswordRecoveryTestCase.tags] },
  async ({ loginPage }) => {
    await loginPage.openHome();
    await loginPage.open();
    const forgotPasswordPage = await loginPage.openForgotPassword();

    expect(await forgotPasswordPage.currentStage()).toBe('email');
  },
);
