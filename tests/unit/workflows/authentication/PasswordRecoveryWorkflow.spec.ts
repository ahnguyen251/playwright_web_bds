import { expect, test } from '@playwright/test';

import { PasswordRecoveryWorkflow } from '../../../../workflows/authentication/PasswordRecoveryWorkflow';
import type { OtpQuery } from '../../../../types/otp.types';
import type { PasswordResetData } from '../../../../types/user.types';

const passwordReset: PasswordResetData = {
  email: 'automation@example.test',
  newPassword: 'NewStrong!123',
  passwordConfirmation: 'NewStrong!123',
};
const requestTime = new Date('2026-08-05T02:03:04.000Z');

test('orchestrates password recovery through OTP and returns to Login', async () => {
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
    openForgotPassword: () => {
      calls.push('open password recovery');
      return Promise.resolve(undefined);
    },
  };
  const forgotPasswordPage = {
    requestReset: (email: string) => {
      calls.push(`request reset ${email}`);
      return Promise.resolve();
    },
    enterOtp: (code: string) => {
      calls.push(`enter OTP ${code}`);
      return Promise.resolve();
    },
    submitOtp: () => {
      calls.push('verify OTP');
      return Promise.resolve();
    },
    fillNewPassword: (data: Pick<PasswordResetData, 'newPassword' | 'passwordConfirmation'>) => {
      expect(data).toEqual({
        newPassword: passwordReset.newPassword,
        passwordConfirmation: passwordReset.passwordConfirmation,
      });
      calls.push('fill new password');
      return Promise.resolve();
    },
    submitNewPassword: () => {
      calls.push('set new password');
      return Promise.resolve();
    },
    backToLogin: () => {
      calls.push('return to Login');
      return Promise.resolve();
    },
  };
  const otpProvider = {
    waitForOtp: (query: OtpQuery) => {
      lastQuery = query;
      calls.push('wait for password recovery OTP');
      return Promise.resolve('654321');
    },
  };
  const clock = {
    now: () => {
      calls.push('capture request time');
      return requestTime;
    },
  };
  const workflow = new PasswordRecoveryWorkflow(
    loginPage,
    forgotPasswordPage,
    otpProvider,
    { timeoutMs: 60_000, pollIntervalMs: 2_000 },
    clock,
  );

  await workflow.resetPassword(passwordReset);

  expect(lastQuery).toEqual({
    recipient: passwordReset.email,
    purpose: 'passwordRecovery',
    requestedAfter: requestTime,
    timeoutMs: 60_000,
    pollIntervalMs: 2_000,
  });
  expect(calls).toEqual([
    'open home',
    'open modal',
    'open password recovery',
    'capture request time',
    `request reset ${passwordReset.email}`,
    'wait for password recovery OTP',
    'enter OTP 654321',
    'verify OTP',
    'fill new password',
    'set new password',
    'return to Login',
  ]);
});
