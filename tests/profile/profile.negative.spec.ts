import { expect, test } from '../../fixtures/test.fixture';
import { AUTH_COOKIE_NAMES } from '../../constants/authentication';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const invalidTokenTestCase = getProfileTestCase('TC-PROFILE-VIEW-002');

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${invalidTokenTestCase.id} ${invalidTokenTestCase.title}`,
  { tag: [...invalidTokenTestCase.tags] },
  async ({ page, profilePage }) => {
    test.fail(
      true,
      'Known product gap: an invalid token currently redirects to home instead of the documented login route.',
    );
    await page.goto('/');
    const applicationOrigin = new URL(page.url()).origin;
    await page.context().addCookies(
      AUTH_COOKIE_NAMES.map((name) => ({
        name,
        value: 'invalid-profile-test-token',
        url: applicationOrigin,
      })),
    );

    await profilePage.open();

    await expect(page).toHaveURL((url) => url.pathname === '/login');
  },
);
