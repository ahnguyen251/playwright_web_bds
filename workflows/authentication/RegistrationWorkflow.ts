import type { RegistrationCorrelation, OtpProvider } from '../../types/otp.types';
import type { RegistrationData } from '../../types/user.types';

export interface RegistrationPageActions {
  openHome(): Promise<void>;
  open(): Promise<void>;
  fillRegistration(data: RegistrationData): Promise<void>;
  submitAndObserveTransition(): Promise<RegistrationSubmitState>;
  waitForOtpScreen(): Promise<void>;
  enterOtp(code: string): Promise<void>;
  waitForRegistrationSuccess(): Promise<void>;
  completeRegistration(): Promise<void>;
}

export interface RegistrationSubmitState {
  readonly disabledObserved: boolean;
  readonly loadingTextObserved: boolean;
}

export interface RegistrationSubmission extends RegistrationCorrelation {
  readonly submitState: RegistrationSubmitState;
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

  public async register(data: RegistrationData): Promise<RegistrationSubmission> {
    const context = await this.submitRegistration(data);
    await this.verifyRegistration(context);
    return context;
  }

  public async registerAndVerify(data: RegistrationData): Promise<RegistrationSubmission> {
    return this.register(data);
  }

  public async submitRegistration(data: RegistrationData): Promise<RegistrationSubmission> {
    await this.registerPage.openHome();
    await this.registerPage.open();
    await this.registerPage.fillRegistration(data);

    const correlation = Object.freeze({
      email: data.email,
      requestedAfter: this.now(),
    });
    const submitState = await this.registerPage.submitAndObserveTransition();
    await this.registerPage.waitForOtpScreen();
    return Object.freeze({ ...correlation, submitState });
  }

  public async verifyRegistration(context: RegistrationCorrelation): Promise<void> {
    const correlation: RegistrationCorrelation = Object.freeze({
      email: context.email,
      requestedAfter: context.requestedAfter,
    });
    const otp = await this.otpProvider.getOtp(correlation);
    await this.verifyRegistrationWithOtp(context, otp);
  }

  public async verifyRegistrationWithOtp(
    context: RegistrationCorrelation,
    otp: string,
  ): Promise<void> {
    await this.registerPage.enterOtp(otp);
    await this.registerPage.waitForRegistrationSuccess();
    await this.registerPage.completeRegistration();
    await this.header.openAccountMenu();
    await this.header.waitForAccountEmail(context.email);
  }
}
