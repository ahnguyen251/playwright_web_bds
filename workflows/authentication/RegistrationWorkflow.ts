import type { LoginPage } from '../../pages/authentication/LoginPage';
import type { RegisterPage } from '../../pages/authentication/RegisterPage';
import type { OtpProvider, OtpQuery } from '../../types/otp.types';
import type { RegistrationData } from '../../types/user.types';

type RegistrationEntryPort = Pick<LoginPage, 'openHome' | 'open'>;
type RegisterPagePort = Pick<
  RegisterPage,
  'open' | 'fillRegistration' | 'submit' | 'enterOtp' | 'submitOtp'
>;
type OtpQueryPolicy = Pick<OtpQuery, 'timeoutMs' | 'pollIntervalMs'>;

export class RegistrationWorkflow {
  public constructor(
    private readonly loginPage: RegistrationEntryPort,
    private readonly registerPage: RegisterPagePort,
    private readonly otpProvider: OtpProvider,
    private readonly otpQueryPolicy: OtpQueryPolicy,
    private readonly clock: { readonly now: () => Date },
  ) {}

  public async registerAndVerify(data: RegistrationData): Promise<void> {
    await this.loginPage.openHome();
    await this.loginPage.open();
    await this.registerPage.open();
    await this.registerPage.fillRegistration(data);

    const requestedAfter = this.clock.now();
    await this.registerPage.submit();
    const code = await this.otpProvider.waitForOtp({
      recipient: data.email,
      purpose: 'registration',
      requestedAfter,
      ...this.otpQueryPolicy,
    });

    await this.registerPage.enterOtp(code);
    await this.registerPage.submitOtp();
  }
}
