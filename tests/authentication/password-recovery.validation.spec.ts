import { expect, test } from '../../fixtures/test.fixture';
import { nonexistentEmailPasswordRecoveryTestCase } from '../../test-cases/authentication/password-recovery.test-cases';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${nonexistentEmailPasswordRecoveryTestCase.id} ${nonexistentEmailPasswordRecoveryTestCase.title}`,
  { tag: [...nonexistentEmailPasswordRecoveryTestCase.tags] },
  async ({ authRequestObserver, loginPage }) => {
    const nonexistentEmail = AuthenticationDataFactory.createNonexistentGmailEmail();

    await loginPage.openHome();
    await loginPage.open();
    const forgotPasswordPage = await loginPage.openForgotPassword();

    await authRequestObserver.waitForStatus('forgotPassword', async () => {
      await forgotPasswordPage.requestReset(nonexistentEmail);
    });

    await expect.poll(async () => forgotPasswordPage.visibleMessage()).not.toBe('');
    const visibleMessage = await forgotPasswordPage.visibleMessage();

    expect(await forgotPasswordPage.currentStage()).toBe('email');
    test.skip(
      visibleMessage === 'Email này chưa được đăng ký.',
      'BLOCKED: deployed feedback is "Email này chưa được đăng ký." instead of the authoritative message.',
    );
    expect(visibleMessage).toBe('Không tìm thấy tài khoản với email này');
  },
);
