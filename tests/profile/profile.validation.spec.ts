import { expect, test } from '../../fixtures/test.fixture';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const unchangedProfileTestCase = getProfileTestCase('TC-PROFILE-EDIT-002');
const fullNameBoundaryTestCase = getProfileTestCase('TC-PROFILE-EDIT-003');

test(
  `${unchangedProfileTestCase.id} ${unchangedProfileTestCase.title}`,
  { tag: [...unchangedProfileTestCase.tags] },
  async ({ authRequestObserver, profilePage }) => {
    test.fail(
      true,
      'Known product gap: unchanged Profile data disables Save and does not show the required feedback.',
    );
    await profilePage.open();
    await profilePage.openAccountInformation();
    const profile = profilePage.profile();
    await profile.startEditing();

    expect(await profile.isSaveEnabled()).toBe(true);
    const updateRequests = await authRequestObserver.countDuring('profileUpdate', async () =>
      profile.save(),
    );
    expect(updateRequests).toBe(0);
    expect(await profile.noChangesMessage()).toBe('Không có thay đổi dữ liệu');
  },
);

test(
  `${fullNameBoundaryTestCase.id} ${fullNameBoundaryTestCase.title}`,
  { tag: [...fullNameBoundaryTestCase.tags] },
  async ({ profilePage }) => {
    test.fail(
      true,
      'Known product gap: the deployed full-name input currently accepts more than 50 characters.',
    );
    const pastedName = 'A'.repeat(60);
    await profilePage.open();
    await profilePage.openAccountInformation();
    const profile = profilePage.profile();
    await profile.startEditing();
    await profile.pasteFullName(pastedName);

    expect(await profile.fullNameMaximumLength()).toBe(50);
    expect((await profile.read()).fullName).toBe(pastedName.slice(0, 50));
  },
);
