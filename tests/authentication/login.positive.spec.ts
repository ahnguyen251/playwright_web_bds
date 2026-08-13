import { expect, test } from '../../fixtures/test.fixture';
import { ROUTES } from '../../constants/routes';
import { activeAccountLoginTestCase } from '../../test-cases/authentication/login.test-cases';
import { BrowserHelper } from '../../utils/BrowserHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${activeAccountLoginTestCase.id} ${activeAccountLoginTestCase.title}`,
  { tag: [...activeAccountLoginTestCase.tags] },
  async ({ authRequestObserver, defaultUser, header, loginPage, page }) => {
    await loginPage.openHome();
    await loginPage.open();
    const loginStatus = await authRequestObserver.waitForStatus('login', () =>
      loginPage.submitCredentials(defaultUser),
    );

    expect(loginStatus.status).toBe(200);
    await header.waitForAuthenticated();
    await expect(page).toHaveURL((url) => url.pathname === ROUTES.home && url.search === '');
    await expect(header.authenticatedUserControl).toBeVisible();
    expect(await BrowserHelper.hasAuthenticationCookies(page.context())).toBe(true);
  },
);
