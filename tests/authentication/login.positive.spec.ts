import { expect, test } from '../../fixtures/test.fixture';
import { validLoginTestCase } from '../../test-cases/authentication/login.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${validLoginTestCase.id} ${validLoginTestCase.title}`,
  { tag: [...validLoginTestCase.tags] },
  async ({ loginWorkflow, defaultUser }) => {
    await loginWorkflow.login(defaultUser);

    await expect.poll(async () => loginWorkflow.isAuthenticated()).toBe(true);
  },
);
