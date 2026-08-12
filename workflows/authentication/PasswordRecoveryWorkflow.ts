import type { ForgotPasswordPage } from '../../pages/authentication/ForgotPasswordPage';
import type { LoginPage } from '../../pages/authentication/LoginPage';
import type { OtpProvider } from '../../types/otp.types';
import type { PasswordResetData } from '../../types/user.types';

type PasswordRecoveryEntryPort = Pick<LoginPage, 'openHome' | 'open'> & {
  openForgotPassword(): Promise<unknown>;
};
type ForgotPasswordPagePort = Pick<
  ForgotPasswordPage,
  | 'requestReset'
  | 'enterOtp'
  | 'submitOtp'
  | 'fillNewPassword'
  | 'submitNewPassword'
  | 'backToLogin'
>;
export class PasswordRecoveryWorkflow {
  public constructor(
    private readonly loginPage: PasswordRecoveryEntryPort,
    private readonly forgotPasswordPage: ForgotPasswordPagePort,
    private readonly otpProvider: OtpProvider,
    private readonly clock: { readonly now: () => Date },
  ) {}

  public async resetPassword(data: PasswordResetData): Promise<void> {
    await this.loginPage.openHome();
    await this.loginPage.open();
    await this.loginPage.openForgotPassword();

    const requestedAfter = this.clock.now();
    await this.forgotPasswordPage.requestReset(data.email);
    const code = await this.otpProvider.getOtp({
      email: data.email,
      purpose: 'passwordRecovery',
      requestedAfter,
    });

    await this.forgotPasswordPage.enterOtp(code);
    await this.forgotPasswordPage.submitOtp();
    await this.forgotPasswordPage.fillNewPassword({
      newPassword: data.newPassword,
      passwordConfirmation: data.passwordConfirmation,
    });
    await this.forgotPasswordPage.submitNewPassword();
    await this.forgotPasswordPage.backToLogin();
  }
}
