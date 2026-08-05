import { expect, test } from '../../fixtures/test.fixture';
import { changePasswordConfirmationTestCase } from '../../test-cases/authentication/profile.test-cases';

test(
  `${changePasswordConfirmationTestCase.id} ${changePasswordConfirmationTestCase.title}`,
  { tag: [...changePasswordConfirmationTestCase.tags] },
  async ({ profilePage }) => {
    await profilePage.open();
    const changePasswordForm = profilePage.changePassword();
    await changePasswordForm.open();
    await changePasswordForm.fill(changePasswordConfirmationTestCase.data);

    expect(await changePasswordForm.validationMessages()).toEqual(
      changePasswordConfirmationTestCase.expectedMessages,
    );
  },
);
