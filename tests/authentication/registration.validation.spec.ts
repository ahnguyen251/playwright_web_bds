import { expect, test } from '../../fixtures/test.fixture';
import {
  duplicateRegistrationEmailTestCase,
  invalidRegistrationEmailTestCase,
  invalidRegistrationPasswordTestCase,
  registrationConfirmationMismatchTestCase,
  requiredRegistrationFieldsTestCase,
} from '../../test-cases/authentication/registration.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${requiredRegistrationFieldsTestCase.id} ${requiredRegistrationFieldsTestCase.title}`,
  { tag: [...requiredRegistrationFieldsTestCase.tags] },
  async ({ authRequestObserver, registerPage }) => {
    if (requiredRegistrationFieldsTestCase.data === undefined) {
      throw new Error('Required registration case is missing its authoritative data.');
    }
    const requiredData = requiredRegistrationFieldsTestCase.data;

    await registerPage.openHome();
    await registerPage.open();

    const registrationRequestCount = await authRequestObserver.countDuring(
      'registration',
      async () => {
        await registerPage.fillRegistration(requiredData);
        expect(await registerPage.activateSubmit()).toBe('activated');
        expect(await registerPage.validationMessages()).toEqual([
          'Vui lòng nhập họ và tên',
          'Vui lòng nhập email hợp lệ',
          'Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số',
          'Phải trùng khớp với mật khẩu đã nhập',
        ]);
      },
    );

    expect(registrationRequestCount).toBe(0);
  },
);

test(
  `${invalidRegistrationEmailTestCase.id} ${invalidRegistrationEmailTestCase.title}`,
  { tag: [...invalidRegistrationEmailTestCase.tags] },
  async ({ registerPage }) => {
    const invalidEmails = invalidRegistrationEmailTestCase.invalidEmails;
    const invalidEmailMessage = invalidRegistrationEmailTestCase.expectedMessages?.[0];
    if (invalidEmails === undefined || invalidEmailMessage === undefined) {
      throw new Error('Invalid-email registration case is incomplete.');
    }

    await registerPage.openHome();
    await registerPage.open();

    for (const email of invalidEmails) {
      await test.step(email, async () => {
        await registerPage.fillEmail(email);
        await registerPage.blurEmail();

        expect(await registerPage.validationMessages()).toContain(invalidEmailMessage);
        expect(await registerPage.isSubmitEnabled()).toBe(false);
      });
    }
  },
);

test(
  `${duplicateRegistrationEmailTestCase.id} ${duplicateRegistrationEmailTestCase.title}`,
  { tag: [...duplicateRegistrationEmailTestCase.tags] },
  async ({ defaultUser, registerPage }) => {
    const duplicateEmailMessage = duplicateRegistrationEmailTestCase.expectedMessages?.[0];
    if (duplicateEmailMessage === undefined) {
      throw new Error('Duplicate-email registration case is missing its expected feedback.');
    }

    await registerPage.openHome();
    await registerPage.open();
    await registerPage.fillRegistration({
      fullName: 'Registration Duplicate Check',
      email: defaultUser.email,
      password: defaultUser.password,
      passwordConfirmation: defaultUser.password,
    });
    await registerPage.submitAndObserveTransition();

    await expect.poll(async () => registerPage.serverMessage()).toContain(duplicateEmailMessage);
  },
);

test(
  `${invalidRegistrationPasswordTestCase.id} ${invalidRegistrationPasswordTestCase.title}`,
  { tag: [...invalidRegistrationPasswordTestCase.tags] },
  async ({ registerPage }) => {
    const invalidPasswords = invalidRegistrationPasswordTestCase.invalidPasswords;
    const invalidPasswordMessage = invalidRegistrationPasswordTestCase.expectedMessages?.[0];
    if (invalidPasswords === undefined || invalidPasswordMessage === undefined) {
      throw new Error('Invalid-password registration case is incomplete.');
    }

    await registerPage.openHome();
    await registerPage.open();
    await registerPage.fillFullName('Registration Password Check');
    await registerPage.fillEmail('registration.validation@example.test');

    for (const [index, password] of invalidPasswords.entries()) {
      await test.step(`invalid password sample ${String(index + 1)}`, async () => {
        await registerPage.fillPassword(password);
        await registerPage.fillPasswordConfirmation(password);
        await registerPage.blurPassword();

        expect(await registerPage.validationMessages()).toContain(invalidPasswordMessage);
        expect(await registerPage.isSubmitEnabled()).toBe(false);
      });
    }
  },
);

test(
  `${registrationConfirmationMismatchTestCase.id} ${registrationConfirmationMismatchTestCase.title}`,
  { tag: [...registrationConfirmationMismatchTestCase.tags] },
  async ({ registerPage }) => {
    const mismatchData = registrationConfirmationMismatchTestCase.data;
    const mismatchMessage = registrationConfirmationMismatchTestCase.expectedMessages?.[0];
    if (mismatchData === undefined || mismatchMessage === undefined) {
      throw new Error('Password-confirmation registration case is incomplete.');
    }

    await registerPage.openHome();
    await registerPage.open();
    await registerPage.fillRegistration(mismatchData);
    await registerPage.blurPasswordConfirmation();

    expect(await registerPage.validationMessages()).toContain(mismatchMessage);
    expect(await registerPage.isSubmitEnabled()).toBe(false);
  },
);
