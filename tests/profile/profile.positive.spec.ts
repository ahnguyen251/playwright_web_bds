import { expect, test } from '../../fixtures/test.fixture';
import { profileViewTestCase } from '../../test-cases/authentication/profile.test-cases';

test(
  `${profileViewTestCase.id} ${profileViewTestCase.title}`,
  { tag: [...profileViewTestCase.tags] },
  async ({ profilePage }) => {
    await profilePage.open();
    await profilePage.openAccountInformation();

    const profile = await profilePage.profile().read();
    expect(profile.fullName.trim()).not.toBe('');
  },
);
