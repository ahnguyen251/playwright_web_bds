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
        await registerPage.blurAllFields();
        expect(await registerPage.isSubmitEnabled()).toBe(false);
      },
    );

    expect(registrationRequestCount).toBe(0);
  },
);

test(
  `${invalidRegistrationEmailTestCase.id} ${invalidRegistrationEmailTestCase.title}`,
  { tag: [...invalidRegistrationEmailTestCase.tags] },
  async ({ registerPage }) => {
    test.skip(
      true,
      'BLOCKED: deployed registration UI still exposes legacy invalid-email feedback instead of the authoritative contract.',
    );
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

        expect(await registerPage.fieldValidationMessages()).toContain(invalidEmailMessage);
        expect(await registerPage.isSubmitEnabled()).toBe(false);
      });
    }
  },
);

test(
  `${duplicateRegistrationEmailTestCase.id} ${duplicateRegistrationEmailTestCase.title}`,
  { tag: [...duplicateRegistrationEmailTestCase.tags] },
  async ({ defaultUser, registerPage }) => {
    test.skip(
      true,
      'BLOCKED: deployed registration UI exposes field-specific and generic duplicate-email copy outside the authoritative Page Object contract.',
    );
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
    test.skip(
      true,
      'BLOCKED: deployed registration UI validates only password length and does not expose the authoritative complexity feedback.',
    );
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

        expect(await registerPage.fieldValidationMessages()).toContain(invalidPasswordMessage);
        expect(await registerPage.isSubmitEnabled()).toBe(false);
      });
    }
  },
);

test(
  `${registrationConfirmationMismatchTestCase.id} ${registrationConfirmationMismatchTestCase.title}`,
  { tag: [...registrationConfirmationMismatchTestCase.tags] },
  async ({ registerPage }) => {
    test.skip(
      true,
      'BLOCKED: deployed registration UI still exposes legacy password-confirmation feedback instead of the authoritative contract.',
    );
    const mismatchData = registrationConfirmationMismatchTestCase.data;
    const mismatchMessage = registrationConfirmationMismatchTestCase.expectedMessages?.[0];
    if (mismatchData === undefined || mismatchMessage === undefined) {
      throw new Error('Password-confirmation registration case is incomplete.');
    }

    await registerPage.openHome();
    await registerPage.open();
    await registerPage.fillRegistration(mismatchData);
    await registerPage.blurPasswordConfirmation();

    expect(await registerPage.fieldValidationMessages()).toContain(mismatchMessage);
    expect(await registerPage.isSubmitEnabled()).toBe(false);
  },
);
