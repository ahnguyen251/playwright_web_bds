import { expect, test } from '../../fixtures/test.fixture';
import { validLoginTestCase } from '../../test-cases/authentication/login.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(`${validLoginTestCase.id} ${validLoginTestCase.title} ${validLoginTestCase.tags.join(' ')}`, async ({
  authenticationWorkflow,
  defaultUser,
}) => {
  await authenticationWorkflow.login(defaultUser);

  expect(await authenticationWorkflow.isAuthenticated()).toBe(true);
});
