import { expect, test } from '../../fixtures/test.fixture';
import {
  googleOAuthLoginTestCase,
  requiredLoginFieldsTestCase,
} from '../../test-cases/authentication/login.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

const missingFieldVariants = requiredLoginFieldsTestCase.missingFieldVariants;
if (missingFieldVariants === undefined) {
  throw new Error('Required-fields login case is missing its variants.');
}

for (const variant of missingFieldVariants) {
  test(
    `${requiredLoginFieldsTestCase.id} ${requiredLoginFieldsTestCase.title} - ${variant}`,
    { tag: [...requiredLoginFieldsTestCase.tags] },
    async ({ authRequestObserver, defaultUser, loginPage }) => {
      await loginPage.openHome();
      await loginPage.open();

      if (variant === 'email-or-phone') {
        await loginPage.fillEmail('');
        await loginPage.fillPassword(defaultUser.password);
        await loginPage.blurEmail();
      } else {
        await loginPage.fillEmail(defaultUser.email);
        await loginPage.fillPassword('');
        await loginPage.blurPassword();
      }

      const submitEnabled = await loginPage.isSubmitEnabled();
      if (variant === 'email-or-phone') {
        const loginRequestCount = await authRequestObserver.countDuring('login', () =>
          loginPage.submitFromPasswordField(),
        );

        expect(submitEnabled).toBe(false);
        expect(loginRequestCount).toBe(0);
        return;
      }

      if (submitEnabled) {
        await loginPage.submit();
        await expect.poll(async () => loginPage.serverMessage()).not.toBe('');
      } else {
        expect(submitEnabled).toBe(false);
      }
    },
  );
}

test(
  `${googleOAuthLoginTestCase.id} ${googleOAuthLoginTestCase.title}`,
  { tag: [...googleOAuthLoginTestCase.tags] },
  () => {
    test.skip(
      true,
      'EXCLUDED/BLOCKED: no repository-owned deterministic Google OAuth mock contract is available; real Google OAuth must not run.',
    );
  },
);
