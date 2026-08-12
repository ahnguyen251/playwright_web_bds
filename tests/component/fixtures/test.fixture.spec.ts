import type { BrowserContext } from '@playwright/test';

import { DisabledOtpProvider } from '../../../fixtures/auth.fixture';
import { ForgotPasswordPage } from '../../../pages/authentication/ForgotPasswordPage';
import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';
import { ListingWorkflow } from '../../../workflows/listings/ListingWorkflow';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { RegisterPage } from '../../../pages/authentication/RegisterPage';
import { ProfilePage } from '../../../pages/profile/ProfilePage';
import { LoginWorkflow } from '../../../workflows/authentication/LoginWorkflow';
import { PasswordRecoveryWorkflow } from '../../../workflows/authentication/PasswordRecoveryWorkflow';
import { ProfileWorkflow } from '../../../workflows/authentication/ProfileWorkflow';
import { RegistrationWorkflow } from '../../../workflows/authentication/RegistrationWorkflow';
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
});

test('disabled OTP provider reports only safe activation guidance', async () => {
  const provider = new DisabledOtpProvider();
  const recipient = 'private-mailbox+fixture@example.test';

  const result = await provider
    .waitForOtp({
      recipient,
      purpose: 'registration',
      requestedAfter: new Date('2026-08-05T00:00:00.000Z'),
      timeoutMs: 5_000,
      pollIntervalMs: 500,
    })
    .catch((error: unknown) => error);

  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe(
    'OTP automation is disabled. Enable RUN_OTP_E2E with valid Gmail configuration.',
  );
  expect((result as Error).message).not.toContain(recipient);
});

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
