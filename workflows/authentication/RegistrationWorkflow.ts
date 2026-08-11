import type { RegistrationCorrelation, OtpProvider } from '../../types/otp.types';
import type { RegistrationData } from '../../types/user.types';

export interface RegistrationPageActions {
  openHome(): Promise<void>;
  open(): Promise<void>;
  fillRegistration(data: RegistrationData): Promise<void>;
  submit(): Promise<void>;
  waitForOtpScreen(): Promise<void>;
  enterOtp(code: string): Promise<void>;
  waitForRegistrationSuccess(): Promise<void>;
  completeRegistration(): Promise<void>;
}

export interface RegistrationHeaderActions {
  openAccountMenu(): Promise<void>;
  waitForAccountEmail(email: string): Promise<void>;
}

export class RegistrationWorkflow {
  public constructor(
    private readonly registerPage: RegistrationPageActions,
    private readonly header: RegistrationHeaderActions,
    private readonly otpProvider: OtpProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async register(data: RegistrationData): Promise<void> {
    const context = await this.submitRegistration(data);
    await this.verifyRegistration(context);
  }

  public async submitRegistration(data: RegistrationData): Promise<RegistrationCorrelation> {
    await this.registerPage.openHome();
    await this.registerPage.open();
    await this.registerPage.fillRegistration(data);

    const context = Object.freeze({
      email: data.email,
      requestedAfter: this.now(),
    });
    await this.registerPage.submit();
    await this.registerPage.waitForOtpScreen();
    return context;
  }

  public async verifyRegistration(context: RegistrationCorrelation): Promise<void> {
    const otp = await this.otpProvider.getOtp(context);
    await this.registerPage.enterOtp(otp);
    await this.registerPage.waitForRegistrationSuccess();
    await this.registerPage.completeRegistration();
    await this.header.openAccountMenu();
    await this.header.waitForAccountEmail(context.email);
  }
}
