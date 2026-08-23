import { expect, test } from '../../fixtures/test.fixture';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const changePasswordConfirmationTestCase = getProfileTestCase('TC-PROFILE-CHANGEPW-004');

test(
  `${changePasswordConfirmationTestCase.id} ${changePasswordConfirmationTestCase.title}`,
  { tag: [...changePasswordConfirmationTestCase.tags] },
  async ({ profilePage }) => {
    await profilePage.open();
    const changePasswordForm = profilePage.changePassword();
    await changePasswordForm.open();
    await changePasswordForm.fill({
      currentPassword: 'ValidPassword123!',
      newPassword: 'NewPassword123!',
      passwordConfirmation: 'MismatchPassword123!',
    });

    expect(await changePasswordForm.validationMessages()).toEqual([
      'Mật khẩu xác nhận không khớp',
    ]);
  },
);
