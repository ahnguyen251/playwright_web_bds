import { expect, test } from '../../fixtures/test.fixture';
import { invalidCredentialsLoginTestCase } from '../../test-cases/authentication/login.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${invalidCredentialsLoginTestCase.id} ${invalidCredentialsLoginTestCase.title}`,
  { tag: [...invalidCredentialsLoginTestCase.tags] },
  async ({ loginPage, loginWorkflow, defaultUser }) => {
    await loginPage.openHome();
    await loginPage.open();
    await loginPage.submitCredentials({
      alias: defaultUser.alias,
      email: defaultUser.email,
      password: invalidCredentialsLoginTestCase.invalidPassword,
    });

    await expect.poll(async () => loginPage.serverMessage()).not.toBe('');
    await expect.poll(async () => loginWorkflow.isAuthenticated()).toBe(false);
  },
);
