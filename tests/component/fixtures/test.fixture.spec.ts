import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';
import { RegistrationWorkflow } from '../../../workflows/authentication/RegistrationWorkflow';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { expect, test } from '../../../fixtures/test.fixture';
import type { OtpProvider, OtpQuery, RegistrationCorrelation } from '../../../types/otp.types';

test('BaseTest composition provides real Page Objects and Workflows', ({
  loginPage,
  authenticationWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(authenticationWorkflow).toBeInstanceOf(AuthenticationWorkflow);
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
  'BaseTest lazily composes RegistrationWorkflow with the requested OTP provider',
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
