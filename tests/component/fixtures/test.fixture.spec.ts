import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { expect, test } from '../../../fixtures/test.fixture';

test('BaseTest composition provides real Page Objects and Workflows', ({
  loginPage,
  authenticationWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(authenticationWorkflow).toBeInstanceOf(AuthenticationWorkflow);
});
