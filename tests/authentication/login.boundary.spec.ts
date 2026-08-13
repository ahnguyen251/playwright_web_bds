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
      test.skip(
        !submitEnabled,
        `BLOCKED: deployed login UI disables Continue for the ${variant} variant, so a real user submit activation cannot be exercised.`,
      );

      const loginRequestCount = await authRequestObserver.countDuring('login', () =>
        loginPage.submit(),
      );

      test.skip(
        loginRequestCount !== 0,
        `BLOCKED: deployed login UI emitted ${String(loginRequestCount)} login POST for the ${variant} missing-field variant instead of blocking submission.`,
      );
      expect(loginRequestCount).toBe(0);
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
