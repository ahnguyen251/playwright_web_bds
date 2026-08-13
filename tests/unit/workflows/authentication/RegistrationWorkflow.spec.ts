import { expect, test } from '@playwright/test';

import { RegistrationWorkflow } from '../../../../workflows/authentication/RegistrationWorkflow';
import type { OtpQuery } from '../../../../types/otp.types';
import type { RegistrationData } from '../../../../types/user.types';

const registration: RegistrationData = {
  fullName: 'Registration Automation',
  email: 'registration@example.test',
  password: 'StrongPassword1',
  passwordConfirmation: 'StrongPassword1',
};
const requestTime = new Date('2026-08-13T02:03:04.000Z');

test('captures registration correlation immediately before observed submit and returns its state', async () => {
  const calls: string[] = [];
  const registerPage = {
    openHome: () => {
      calls.push('open home');
      return Promise.resolve();
    },
    open: () => {
      calls.push('open registration');
      return Promise.resolve();
    },
    fillRegistration: (data: RegistrationData) => {
      expect(data).toEqual(registration);
      calls.push('fill registration');
      return Promise.resolve();
    },
    submitAndObserveTransition: () => {
      calls.push('submit and observe');
      return Promise.resolve({ disabledObserved: true, loadingTextObserved: true });
    },
    waitForOtpScreen: () => {
      calls.push('wait for OTP screen');
      return Promise.resolve();
    },
    enterOtp: () => Promise.resolve(),
    waitForRegistrationSuccess: () => Promise.resolve(),
    completeRegistration: () => Promise.resolve(),
  };
  const header = {
    openAccountMenu: () => Promise.resolve(),
    waitForAccountEmail: () => Promise.resolve(),
  };
  const otpProvider = {
    getOtp: (query: OtpQuery) => {
      void query;
      return Promise.resolve('654321');
    },
  };
  const now = (): Date => {
    calls.push('capture request time');
    return requestTime;
  };
  const workflow = new RegistrationWorkflow(registerPage, header, otpProvider, now);

  const submission = await workflow.submitRegistration(registration);

  expect(submission).toEqual({
    email: registration.email,
    requestedAfter: requestTime,
    submitState: { disabledObserved: true, loadingTextObserved: true },
  });
  expect(calls).toEqual([
    'open home',
    'open registration',
    'fill registration',
    'capture request time',
    'submit and observe',
    'wait for OTP screen',
  ]);
});

test('keeps submit observation out of the OTP provider correlation', async () => {
  let otpQuery: OtpQuery | undefined;
  const registerPage = {
    openHome: () => Promise.resolve(),
    open: () => Promise.resolve(),
    fillRegistration: () => Promise.resolve(),
    submitAndObserveTransition: () =>
      Promise.resolve({ disabledObserved: true, loadingTextObserved: true }),
    waitForOtpScreen: () => Promise.resolve(),
    enterOtp: () => Promise.resolve(),
    waitForRegistrationSuccess: () => Promise.resolve(),
    completeRegistration: () => Promise.resolve(),
  };
  const header = {
    openAccountMenu: () => Promise.resolve(),
    waitForAccountEmail: () => Promise.resolve(),
  };
  const otpProvider = {
    getOtp: (query: OtpQuery) => {
      otpQuery = query;
      return Promise.resolve('654321');
    },
  };
  const workflow = new RegistrationWorkflow(registerPage, header, otpProvider, () => requestTime);

  const submission = await workflow.submitRegistration(registration);
  await workflow.verifyRegistration(submission);

  expect(otpQuery).toEqual({ email: registration.email, requestedAfter: requestTime });
  expect(Object.keys(otpQuery ?? {}).sort()).toEqual(['email', 'requestedAfter']);
});

test('returns the observed submission from register and registerAndVerify', async () => {
  const registerPage = {
    openHome: () => Promise.resolve(),
    open: () => Promise.resolve(),
    fillRegistration: () => Promise.resolve(),
    submitAndObserveTransition: () =>
      Promise.resolve({ disabledObserved: true, loadingTextObserved: true }),
    waitForOtpScreen: () => Promise.resolve(),
    enterOtp: () => Promise.resolve(),
    waitForRegistrationSuccess: () => Promise.resolve(),
    completeRegistration: () => Promise.resolve(),
  };
  const header = {
    openAccountMenu: () => Promise.resolve(),
    waitForAccountEmail: () => Promise.resolve(),
  };
  const otpProvider = {
    getOtp: () => Promise.resolve('654321'),
  };
  const workflow = new RegistrationWorkflow(registerPage, header, otpProvider, () => requestTime);
  const expectedSubmission = {
    email: registration.email,
    requestedAfter: requestTime,
    submitState: { disabledObserved: true, loadingTextObserved: true },
  };

  await expect(workflow.register(registration)).resolves.toEqual(expectedSubmission);
  await expect(workflow.registerAndVerify(registration)).resolves.toEqual(expectedSubmission);
});
