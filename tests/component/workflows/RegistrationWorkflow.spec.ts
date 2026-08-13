import { expect, test } from '@playwright/test';

import { RegisterPage } from '../../../pages/authentication/RegisterPage';
import type { OtpProvider, OtpQuery, RegistrationCorrelation } from '../../../types/otp.types';
import type { RegistrationData } from '../../../types/user.types';
import {
  RegistrationWorkflow,
  type RegistrationHeaderActions,
  type RegistrationPageActions,
} from '../../../workflows/authentication/RegistrationWorkflow';

const data: RegistrationData = {
  fullName: 'Registration Automation',
  email: 'registration+run-1@example.test',
  password: 'StrongPassword1',
  passwordConfirmation: 'StrongPassword1',
};

class StatefulRegistrationPage implements RegistrationPageActions {
  public screen: 'initial' | 'home' | 'form' | 'otp' | 'success' | 'complete' = 'initial';
  public filledData?: RegistrationData;
  public enteredOtp?: string;

  public openHome(): Promise<void> {
    this.screen = 'home';
    return Promise.resolve();
  }

  public open(): Promise<void> {
    if (this.screen !== 'home') return Promise.reject(new Error('Home must be open first.'));
    this.screen = 'form';
    return Promise.resolve();
  }

  public fillRegistration(registrationData: RegistrationData): Promise<void> {
    if (this.screen !== 'form') return Promise.reject(new Error('Registration form is not open.'));
    this.filledData = registrationData;
    return Promise.resolve();
  }

  public submitAndObserveTransition(): Promise<{
    readonly disabledObserved: boolean;
    readonly loadingTextObserved: boolean;
  }> {
    if (this.filledData === undefined)
      return Promise.reject(new Error('Registration data missing.'));
    this.screen = 'otp';
    return Promise.resolve({ disabledObserved: true, loadingTextObserved: true });
  }

  public waitForOtpScreen(): Promise<void> {
    return this.screen === 'otp'
      ? Promise.resolve()
      : Promise.reject(new Error('OTP screen is not visible.'));
  }

  public enterOtp(code: string): Promise<void> {
    if (this.screen !== 'otp') return Promise.reject(new Error('OTP screen is not active.'));
    this.enteredOtp = code;
    this.screen = 'success';
    return Promise.resolve();
  }

  public waitForRegistrationSuccess(): Promise<void> {
    return this.screen === 'success'
      ? Promise.resolve()
      : Promise.reject(new Error('Registration success is not visible.'));
  }

  public completeRegistration(): Promise<void> {
    if (this.screen !== 'success') {
      return Promise.reject(new Error('Registration success must be visible first.'));
    }
    this.screen = 'complete';
    return Promise.resolve();
  }
}

class StatefulRegistrationHeader implements RegistrationHeaderActions {
  public verifiedEmail?: string;
  private accountMenuOpen = false;

  public constructor(private readonly registrationPage: StatefulRegistrationPage) {}

  public openAccountMenu(): Promise<void> {
    if (this.registrationPage.screen !== 'complete') {
      return Promise.reject(new Error('Registration must be complete first.'));
    }
    this.accountMenuOpen = true;
    return Promise.resolve();
  }

  public waitForAccountEmail(email: string): Promise<void> {
    if (!this.accountMenuOpen) return Promise.reject(new Error('Account menu is closed.'));
    this.verifiedEmail = email;
    return Promise.resolve();
  }
}

class RecordingOtpProvider implements OtpProvider {
  public lastQuery?: OtpQuery;

  public constructor(private readonly otp = '123456') {}

  public getOtp(query: OtpQuery): Promise<string> {
    this.lastQuery = query;
    return Promise.resolve(this.otp);
  }
}

test('submits registration and correlates OTP from immediately before submit', async () => {
  const registrationPage = new StatefulRegistrationPage();
  const header = new StatefulRegistrationHeader(registrationPage);
  const otpProvider = new RecordingOtpProvider();
  const requestedAfter = new Date('2026-08-11T01:02:03.000Z');
  const workflow = new RegistrationWorkflow(
    registrationPage,
    header,
    otpProvider,
    () => requestedAfter,
  );

  const context = await workflow.submitRegistration(data);

  expect(context).toEqual({
    email: data.email,
    requestedAfter,
    submitState: { disabledObserved: true, loadingTextObserved: true },
  });
  expect(Object.isFrozen(context)).toBe(true);
  expect(registrationPage.screen).toBe('otp');
  expect(registrationPage.filledData).toBe(data);
  expect(otpProvider.lastQuery).toBeUndefined();
});

test('orchestrates OTP retrieval through authenticated identity verification', async () => {
  const registrationPage = new StatefulRegistrationPage();
  const header = new StatefulRegistrationHeader(registrationPage);
  const otpProvider = new RecordingOtpProvider();
  const workflow = new RegistrationWorkflow(
    registrationPage,
    header,
    otpProvider,
    () => new Date('2026-08-11T01:02:03.000Z'),
  );

  await workflow.register(data);

  expect(otpProvider.lastQuery).toEqual({
    email: data.email,
    requestedAfter: new Date('2026-08-11T01:02:03.000Z'),
  });
  expect(registrationPage.enteredOtp).toBe('123456');
  expect(registrationPage.screen).toBe('complete');
  expect(header.verifiedEmail).toBe(data.email);
});

test('propagates the real RegisterPage accessibility blocker after OTP retrieval', async ({
  page,
}) => {
  const registerPage = new RegisterPage(page);
  const otpProvider = new RecordingOtpProvider();
  const unusedHeader: RegistrationHeaderActions = {
    openAccountMenu: () => Promise.reject(new Error('Header must not be reached.')),
    waitForAccountEmail: () => Promise.reject(new Error('Header must not be reached.')),
  };
  const workflow = new RegistrationWorkflow(registerPage, unusedHeader, otpProvider);
  const context: RegistrationCorrelation = Object.freeze({
    email: data.email,
    requestedAfter: new Date('2026-08-11T01:02:03.000Z'),
  });

  await expect(workflow.verifyRegistration(context)).rejects.toThrow(
    'OTP entry is blocked: Propify must expose six unique accessible textbox names: "Mã OTP 1" through "Mã OTP 6".',
  );
  expect(otpProvider.lastQuery).toEqual(context);
});
