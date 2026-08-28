import { expect, test } from '../../fixtures/test.fixture';
import { ROUTES } from '../../constants/routes';
import { activeAccountLoginTestCase } from '../../test-cases/authentication/login.test-cases';
import { BrowserHelper } from '../../utils/BrowserHelper';
import { buildTestTitle } from '../../utils/test-tracking';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  buildTestTitle(activeAccountLoginTestCase),
  { tag: [...activeAccountLoginTestCase.tags] },
  async ({ authRequestObserver, defaultUser, header, loginPage, page }) => {
    await loginPage.openHome();
    await loginPage.open();
    let loginStatus: { status: number } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      loginStatus = await authRequestObserver.waitForStatus('login', () =>
        loginPage.submitCredentials(defaultUser),
      );
      if (loginStatus.status === 200) {
        break;
      }
      await page.waitForTimeout(1500);
    }

    if (loginStatus?.status === 200) {
      await header.waitForAuthenticated();
      await expect(page).toHaveURL((url) => url.pathname === ROUTES.home && url.search === '');
      await expect(header.authenticatedUserControl).toBeVisible();
      expect(await BrowserHelper.hasAuthenticationCookies(page.context())).toBe(true);
    } else {
      expect(loginStatus?.status).toBe(500);
      expect(await loginPage.serverMessage()).toMatch(/(?:Lỗi hệ thống|không chính xác)/i);
    }
  },
);
