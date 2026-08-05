import { expect, test } from '../../fixtures/test.fixture';
import {
  emptyLoginFieldsTestCase,
  invalidEmailLoginTestCase,
} from '../../test-cases/authentication/login.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${invalidEmailLoginTestCase.id} ${invalidEmailLoginTestCase.title}`,
  { tag: [...invalidEmailLoginTestCase.tags] },
  async ({ loginPage }) => {
    await loginPage.openHome();
    await loginPage.open();
    await loginPage.fillCredentials(invalidEmailLoginTestCase.credentials);
    await loginPage.blurEmail();

    expect(await loginPage.validationMessage()).toBe(invalidEmailLoginTestCase.expectedMessage);
    expect(await loginPage.isSubmitEnabled()).toBe(false);
  },
);

test(
  `${emptyLoginFieldsTestCase.id} ${emptyLoginFieldsTestCase.title}`,
  { tag: [...emptyLoginFieldsTestCase.tags] },
  async ({ loginPage }) => {
    await loginPage.openHome();
    await loginPage.open();

    expect(await loginPage.isSubmitEnabled()).toBe(false);
  },
);
