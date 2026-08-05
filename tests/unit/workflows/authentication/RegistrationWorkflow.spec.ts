import { expect, test } from '@playwright/test';

import { RegistrationWorkflow } from '../../../../workflows/authentication/RegistrationWorkflow';
import type { OtpQuery } from '../../../../types/otp.types';
import type { RegistrationData } from '../../../../types/user.types';

const registration: RegistrationData = {
  fullName: 'Propify Automation',
  email: 'automation+registration@example.test',
  password: 'Strong!123',
  passwordConfirmation: 'Strong!123',
};
const requestTime = new Date('2026-08-05T01:02:03.000Z');

test('correlates registration OTP from the instant immediately before submission', async () => {
  const calls: string[] = [];
  let lastQuery: OtpQuery | undefined;
  const loginPage = {
    openHome: () => {
      calls.push('open home');
      return Promise.resolve();
    },
    open: () => {
      calls.push('open modal');
      return Promise.resolve();
    },
  };
  const registerPage = {
    open: () => {
      calls.push('open registration');
      return Promise.resolve();
    },
    fillRegistration: (data: RegistrationData) => {
      expect(data).toEqual(registration);
      calls.push('fill registration');
      return Promise.resolve();
    },
    submit: () => {
      calls.push('submit registration');
      return Promise.resolve();
    },
    enterOtp: (code: string) => {
      calls.push(`enter OTP ${code}`);
      return Promise.resolve();
    },
    submitOtp: () => {
      calls.push('submit OTP');
      return Promise.resolve();
    },
    resendOtp: () => {
      calls.push('resend OTP');
      return Promise.resolve();
    },
  };
  const otpProvider = {
    waitForOtp: (query: OtpQuery) => {
      lastQuery = query;
      calls.push('wait for OTP');
      return Promise.resolve('123456');
    },
  };
  const clock = {
    now: () => {
      calls.push('capture request time');
      return requestTime;
    },
  };
  const workflow = new RegistrationWorkflow(
    loginPage,
    registerPage,
    otpProvider,
    { timeoutMs: 60_000, pollIntervalMs: 2_000 },
    clock,
  );

  await workflow.registerAndVerify(registration);

  expect(lastQuery).toEqual({
    recipient: registration.email,
    purpose: 'registration',
    requestedAfter: requestTime,
    timeoutMs: 60_000,
    pollIntervalMs: 2_000,
  });
  expect(calls).toEqual([
    'open home',
    'open modal',
    'open registration',
    'fill registration',
    'capture request time',
    'submit registration',
    'wait for OTP',
    'enter OTP 123456',
    'submit OTP',
  ]);
  expect(calls).not.toContain('resend OTP');
});
