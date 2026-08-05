import { expect, test } from '../../fixtures/test.fixture';
import {
  belowMinimumRegistrationPasswordTestCase,
  minimumRegistrationPasswordTestCase,
  registrationPasswordMismatchTestCase,
} from '../../test-cases/authentication/registration.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(
  `${belowMinimumRegistrationPasswordTestCase.id} ${belowMinimumRegistrationPasswordTestCase.title}`,
  { tag: [...belowMinimumRegistrationPasswordTestCase.tags] },
  async ({ loginPage, registerPage }) => {
    await loginPage.openHome();
    await loginPage.open();
    await registerPage.open();
    await registerPage.fillRegistration(belowMinimumRegistrationPasswordTestCase.data);
    await registerPage.blurAllFields();

    expect(await registerPage.visibleValidationMessages()).toEqual(
      belowMinimumRegistrationPasswordTestCase.expectedMessages,
    );
    expect(await registerPage.isSubmitEnabled()).toBe(
      belowMinimumRegistrationPasswordTestCase.expectedSubmitEnabled,
    );
  },
);

test(
  `${minimumRegistrationPasswordTestCase.id} ${minimumRegistrationPasswordTestCase.title}`,
  { tag: [...minimumRegistrationPasswordTestCase.tags] },
  async ({ loginPage, registerPage }) => {
    await loginPage.openHome();
    await loginPage.open();
    await registerPage.open();
    await registerPage.fillRegistration(minimumRegistrationPasswordTestCase.data);
    await registerPage.blurAllFields();

    expect(await registerPage.visibleValidationMessages()).toEqual(
      minimumRegistrationPasswordTestCase.expectedMessages,
    );
    expect(await registerPage.isSubmitEnabled()).toBe(
      minimumRegistrationPasswordTestCase.expectedSubmitEnabled,
    );
  },
);

test(
  `${registrationPasswordMismatchTestCase.id} ${registrationPasswordMismatchTestCase.title}`,
  { tag: [...registrationPasswordMismatchTestCase.tags] },
  async ({ loginPage, registerPage }) => {
    await loginPage.openHome();
    await loginPage.open();
    await registerPage.open();
    await registerPage.fillRegistration(registrationPasswordMismatchTestCase.data);
    await registerPage.blurAllFields();

    expect(await registerPage.visibleValidationMessages()).toEqual(
      registrationPasswordMismatchTestCase.expectedMessages,
    );
    expect(await registerPage.isSubmitEnabled()).toBe(
      registrationPasswordMismatchTestCase.expectedSubmitEnabled,
    );
  },
);
