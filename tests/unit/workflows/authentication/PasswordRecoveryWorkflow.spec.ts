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

const createDependencies = (calls: string[]) => ({
  loginPage: {
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
  },
  forgotPasswordPage: {
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
  },
  otpProvider: {
    getOtp: (query: OtpQuery) => {
      calls.push(`wait for password recovery OTP after ${query.requestedAfter.toISOString()}`);
      return Promise.resolve('654321');
    },
  },
  clock: {
    now: () => {
      calls.push('capture request time');
      return requestTime;
    },
  },
});

test('begins password recovery with a query timestamp captured immediately before the request', async () => {
  const calls: string[] = [];
  const dependencies = createDependencies(calls);
  const workflow = new PasswordRecoveryWorkflow(
    dependencies.loginPage,
    dependencies.forgotPasswordPage,
    dependencies.otpProvider,
    dependencies.clock,
  );

  const query = await workflow.beginPasswordRecovery(passwordReset.email);

  expect(query).toEqual({
    email: passwordReset.email,
    purpose: 'passwordRecovery',
    requestedAfter: requestTime,
  });
  expect(calls).toEqual([
    'open home',
    'open modal',
    'open password recovery',
    'capture request time',
    `request reset ${passwordReset.email}`,
  ]);
});

test('submits the supplied OTP through the password recovery page', async () => {
  const calls: string[] = [];
  const dependencies = createDependencies(calls);
  const workflow = new PasswordRecoveryWorkflow(
    dependencies.loginPage,
    dependencies.forgotPasswordPage,
    dependencies.otpProvider,
    dependencies.clock,
  );

  await workflow.submitOtp('654321');

  expect(calls).toEqual(['enter OTP 654321', 'verify OTP']);
});

test('composes password recovery steps before setting the password and returning to Login', async () => {
  const calls: string[] = [];
  const dependencies = createDependencies(calls);
  class ComposedPasswordRecoveryWorkflow extends PasswordRecoveryWorkflow {
    public override beginPasswordRecovery(email: string): Promise<OtpQuery> {
      calls.push(`begin password recovery ${email}`);
      return Promise.resolve({
        email,
        purpose: 'passwordRecovery',
        requestedAfter: requestTime,
      });
    }

    public override submitOtp(code: string): Promise<void> {
      calls.push(`submit OTP ${code}`);
      return Promise.resolve();
    }
  }
  const workflow = new ComposedPasswordRecoveryWorkflow(
    dependencies.loginPage,
    dependencies.forgotPasswordPage,
    dependencies.otpProvider,
    dependencies.clock,
  );

  await workflow.resetPassword(passwordReset);

  expect(calls).toEqual([
    `begin password recovery ${passwordReset.email}`,
    `wait for password recovery OTP after ${requestTime.toISOString()}`,
    'submit OTP 654321',
    'fill new password',
    'set new password',
    'return to Login',
  ]);
});
