import { expect, test } from '../../fixtures/test.fixture';
import { belowMinimumRegistrationPasswordTestCase } from '../../test-cases/authentication/registration.test-cases';

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

    expect(await registerPage.validationMessages()).toEqual(
      belowMinimumRegistrationPasswordTestCase.expectedMessages,
    );
  },
);
