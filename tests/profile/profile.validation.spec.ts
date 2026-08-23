import { expect, test } from '../../fixtures/test.fixture';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const disabledProfileFieldsTestCase = getProfileTestCase('TC-PROFILE-VIEW-001');
const unchangedProfileTestCase = getProfileTestCase('TC-PROFILE-EDIT-002');

test(
  `${disabledProfileFieldsTestCase.id} ${disabledProfileFieldsTestCase.title}`,
  { tag: [...disabledProfileFieldsTestCase.tags] },
  async ({ profilePage }) => {
    await profilePage.open();
    await profilePage.openAccountInformation();

    expect(await profilePage.profile().isEmailDisabled()).toBe(true);
    expect(await profilePage.profile().isPhoneDisabled()).toBe(true);
  },
);

test(
  `${unchangedProfileTestCase.id} ${unchangedProfileTestCase.title}`,
  { tag: [...unchangedProfileTestCase.tags] },
  async ({ profilePage }) => {
    await profilePage.open();
    await profilePage.openAccountInformation();
    await profilePage.profile().startEditing();

    expect(await profilePage.profile().isSaveEnabled()).toBe(false);
  },
);
