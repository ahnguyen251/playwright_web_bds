import { expect, test } from '../../fixtures/test.fixture';
import { requireProfileAccountSnapshot } from '../../helpers/network/ProfileResponseContract';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const profileViewTestCase = getProfileTestCase('TC-PROFILE-VIEW-001');

test(
  `${profileViewTestCase.id} ${profileViewTestCase.title}`,
  { tag: [...profileViewTestCase.tags] },
  async ({ authRequestObserver, profilePage }) => {
    test.fail(
      true,
      'Known product gap: the deployed Profile view does not render the documented Active badge.',
    );
    const response = await authRequestObserver.waitForResponse('profileView', async () =>
      profilePage.open(),
    );
    const expectedProfile = requireProfileAccountSnapshot(response);
    await profilePage.openAccountInformation();

    const profile = await profilePage.profile().read();
    expect(
      profile.fullName === expectedProfile.fullName &&
        profile.email === expectedProfile.email &&
        profile.phone === expectedProfile.phone,
    ).toBe(true);
    expect(await profilePage.profile().hasAvatar()).toBe(expectedProfile.hasAvatar);
    expect(expectedProfile.accountStatus.toUpperCase()).toBe('ACTIVE');
    expect(await profilePage.profile().isActiveBadgeVisible()).toBe(true);
    expect(await profilePage.profile().isEmailDisabled()).toBe(true);
    expect(await profilePage.profile().isPhoneDisabled()).toBe(true);
  },
);
