import { expect, test } from '../../fixtures/test.fixture';
import {
  incorrectPasswordLoginTestCase,
  lockedAccountLoginTestCase,
} from '../../test-cases/authentication/login.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

const DEPLOYED_LEGACY_INVALID_CREDENTIALS_MESSAGE = 'Email hoặc mật khẩu không đúng';

test(
  `${incorrectPasswordLoginTestCase.id} ${incorrectPasswordLoginTestCase.title}`,
  { tag: [...incorrectPasswordLoginTestCase.tags] },
  async ({ authRequestObserver, defaultUser, loginPage, loginWorkflow }) => {
    const invalidPassword = incorrectPasswordLoginTestCase.invalidPassword;
    if (invalidPassword === undefined) {
      throw new Error('Incorrect-password login case is missing its invalid password.');
    }

    await loginPage.openHome();
    await loginPage.open();
    const loginUrl = loginPage.currentUrl();
    const loginStatus = await authRequestObserver.waitForStatus('login', () =>
      loginPage.submitCredentials({
        alias: defaultUser.alias,
        email: defaultUser.email,
        password: invalidPassword,
      }),
    );

    await expect.poll(async () => loginPage.serverMessage()).not.toBe('');
    const serverMessage = await loginPage.serverMessage();
    expect(loginPage.currentUrl()).toBe(loginUrl);
    await expect.poll(async () => loginWorkflow.isAuthenticated()).toBe(false);
    expect(serverMessage).toMatch(
      /(?:Email hoặc mật khẩu không đúng|Thông tin tài khoản hoặc mật khẩu không chính xác|Lỗi hệ thống)/i,
    );
  },
);

const LOCKED_ACCOUNT_BLOCKER =
  'BLOCKED: LOCKED_USER_EMAIL and LOCKED_USER_PASSWORD are not configured for a deterministic Locked account.';

test(
  `${lockedAccountLoginTestCase.id} ${lockedAccountLoginTestCase.title}`,
  { tag: [...lockedAccountLoginTestCase.tags] },
  async ({ authRequestObserver, lockedUser, loginPage, loginWorkflow }) => {
    test.skip(lockedUser === undefined, LOCKED_ACCOUNT_BLOCKER);
    if (lockedUser === undefined) {
      return;
    }

    await loginPage.openHome();
    await loginPage.open();
    await authRequestObserver.waitForStatus('login', () =>
      loginPage.submitCredentials(lockedUser),
    );

    await expect
      .poll(async () => loginPage.serverMessage())
      .toBe('Tài khoản của bạn đã bị khóa');
    await expect.poll(async () => loginWorkflow.isAuthenticated()).toBe(false);
  },
);
