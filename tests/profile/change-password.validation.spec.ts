import { expect, test } from '../../fixtures/test.fixture';
import { getProfileTestCase } from '../../test-cases/authentication/profile.test-cases';

const changePasswordConfirmationTestCase = getProfileTestCase('TC-PROFILE-CHANGEPW-004');
const invalidNewPasswordTestCase = getProfileTestCase('TC-PROFILE-CHANGEPW-003');

test(
  `${invalidNewPasswordTestCase.id} ${invalidNewPasswordTestCase.title}`,
  { tag: [...invalidNewPasswordTestCase.tags] },
  async ({ profilePage }) => {
    await profilePage.open();
    const changePasswordForm = profilePage.changePassword();
    await changePasswordForm.open();

    for (const invalidPassword of ['1234567', 'admin123', 'ADMIN123', 'AdminAsdf']) {
      await test.step(`rejects ${String(invalidPassword.length)}-character invalid rule variant`, async () => {
        await changePasswordForm.fill({
          currentPassword: 'ValidPassword123',
          newPassword: invalidPassword,
          passwordConfirmation: invalidPassword,
        });

        const messages = await changePasswordForm.validationMessages();
        expect(messages).toHaveLength(1);
        expect(
          messages[0] === 'Mật khẩu mới phải có ít nhất 8 ký tự.' ||
            messages[0] === 'Mật khẩu phải chứa chữ hoa, chữ thường và chữ số.',
        ).toBe(true);
        expect(await changePasswordForm.isSubmitEnabled()).toBe(false);
      });
    }
  },
);

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
      'Xác nhận mật khẩu mới không khớp.',
    ]);
  },
);
