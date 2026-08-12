import type { BrowserContext } from '@playwright/test';

import { DisabledOtpProvider } from '../../../fixtures/auth.fixture';
import { ForgotPasswordPage } from '../../../pages/authentication/ForgotPasswordPage';
import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';
import { ListingWorkflow } from '../../../workflows/listings/ListingWorkflow';
import { AppointmentWorkflow } from '../../../workflows/appointments/AppointmentWorkflow';
import { AppointmentPage } from '../../../pages/appointments/AppointmentPage';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { RegisterPage } from '../../../pages/authentication/RegisterPage';
import { ProfilePage } from '../../../pages/profile/ProfilePage';
import { LoginWorkflow } from '../../../workflows/authentication/LoginWorkflow';
import { PasswordRecoveryWorkflow } from '../../../workflows/authentication/PasswordRecoveryWorkflow';
import { ProfileWorkflow } from '../../../workflows/authentication/ProfileWorkflow';
import { RegistrationWorkflow } from '../../../workflows/authentication/RegistrationWorkflow';
import type { OtpProvider, OtpQuery, RegistrationCorrelation } from '../../../types/otp.types';
import { FavoritesPage } from '../../../pages/listings/FavoritesPage';
import { expect, test } from '../../../fixtures/test.fixture';

test('BaseTest composition provides real Page Objects and Workflows', ({
  loginPage,
  authenticationWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(authenticationWorkflow).toBeInstanceOf(AuthenticationWorkflow);
});

test('composes focused authentication dependencies', ({
  loginPage,
  registerPage,
  forgotPasswordPage,
  profilePage,
  loginWorkflow,
  registrationWorkflow,
  passwordRecoveryWorkflow,
  profileWorkflow,
  executionPolicy,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(registerPage).toBeInstanceOf(RegisterPage);
  expect(forgotPasswordPage).toBeInstanceOf(ForgotPasswordPage);
  expect(profilePage).toBeInstanceOf(ProfilePage);
  expect(loginWorkflow).toBeInstanceOf(LoginWorkflow);
  expect(registrationWorkflow).toBeInstanceOf(RegistrationWorkflow);
  expect(passwordRecoveryWorkflow).toBeInstanceOf(PasswordRecoveryWorkflow);
  expect(profileWorkflow).toBeInstanceOf(ProfileWorkflow);
  expect(typeof executionPolicy.runOtpE2e).toBe('boolean');
  expect(typeof executionPolicy.runMutatingE2e).toBe('boolean');
  expect(executionPolicy.runProductionRegistrationE2e).toBe(false);
  expect(executionPolicy.runProductionMutatingE2e).toBe(false);
  expect(executionPolicy.productionMutationsApproved).toBe(false);
});

test('disabled OTP provider reports only safe activation guidance', async () => {
  const provider = new DisabledOtpProvider();
  const recipient = 'private-mailbox+fixture@example.test';

  const result = await provider
    .getOtp({
      email: recipient,
      purpose: 'registration',
      requestedAfter: new Date('2026-08-05T00:00:00.000Z'),
    })
    .catch((error: unknown) => error);

  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe(
    'OTP automation is disabled. Enable RUN_OTP_E2E with valid Gmail configuration.',
  );
  expect((result as Error).message).not.toContain(recipient);
});

class RecordingOtpProvider implements OtpProvider {
  public lastQuery?: OtpQuery;

  public getOtp(query: OtpQuery): Promise<string> {
    this.lastQuery = query;
    return Promise.resolve('123456');
  }
}

const registrationFixtureTest = test.extend<{ otpProvider: OtpProvider }>({
  otpProvider: async ({ page }, use) => {
    void page;
    await use(new RecordingOtpProvider());
  },
});

registrationFixtureTest(
  'lazily composes the semantic RegistrationWorkflow with the requested OTP provider',
  async ({ registrationWorkflow, otpProvider }) => {
    expect(registrationWorkflow).toBeInstanceOf(RegistrationWorkflow);
    const context: RegistrationCorrelation = Object.freeze({
      email: 'registration+fixture@example.test',
      requestedAfter: new Date('2026-08-11T01:02:03.000Z'),
    });

    await expect(registrationWorkflow.verifyRegistration(context)).rejects.toThrow(
      'OTP entry is blocked: Propify must expose six unique accessible textbox names: "Mã OTP 1" through "Mã OTP 6".',
    );
    expect((otpProvider as RecordingOtpProvider).lastQuery).toBe(context);
  },
);

test('composes a disabled OTP provider for safe default execution', ({
  executionPolicy,
  otpProvider,
}) => {
  test.skip(executionPolicy.runOtpE2e, 'Default-only fixture assertion');

  expect(otpProvider).toBeInstanceOf(DisabledOtpProvider);
});

test.describe.serial('named browser context lifecycle', () => {
  let namedContext: BrowserContext | undefined;

  test('creates a named context for a configured user alias', async ({ contextForUser }) => {
    namedContext = await contextForUser('defaultUser');

    expect(namedContext.pages()).toHaveLength(0);
  });

  test('closes the named context after its fixture consumer completes', async () => {
    if (namedContext === undefined) {
      throw new Error('Named context was not created by the lifecycle setup');
    }

    await expect(namedContext.newPage()).rejects.toThrow();
  });
});

test('cung cấp đầy đủ Page, Workflow và bộ phân giải trạng thái tin kiểm soát', ({
  favoritesPage,
  listingWorkflow,
  controlledListing,
}) => {
  expect(favoritesPage).toBeInstanceOf(FavoritesPage);
  expect(listingWorkflow).toBeInstanceOf(ListingWorkflow);
  expect(controlledListing).toBeInstanceOf(Function);
});

test('composes appointment dependencies and environment-independent data', ({
  appointmentPage,
  appointmentWorkflow,
  appointmentDataFor,
}) => {
  expect(appointmentPage).toBeInstanceOf(AppointmentPage);
  expect(appointmentWorkflow).toBeInstanceOf(AppointmentWorkflow);
  expect(appointmentDataFor(48)).not.toBe(appointmentDataFor(48));
});
