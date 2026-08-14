import { expect, type Locator, type Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import { TIMEOUTS } from '../../constants/timeouts';
import type { RegistrationData } from '../../types/user.types';
import { BasePage } from '../base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';

export interface RegistrationSubmitTransition {
  readonly disabledObserved: boolean;
  readonly loadingTextObserved: boolean;
}

export interface RegistrationPageTiming {
  readonly resendEnabledMs?: number;
}

export type RegistrationSubmitActivation = 'activated' | 'blocked';

export class RegisterPage extends BasePage {
  public readonly otpHeading: Locator;
  public readonly registrationSuccessHeading: Locator;
  private readonly header: HeaderComponent;
  private readonly openRegistrationButton: Locator;
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;
  private readonly registrationForm: Locator;
  private readonly validationMessageLocators: readonly Locator[];
  private readonly serverFeedbackMessage: Locator;
  private readonly completeRegistrationButton: Locator;
  private readonly otpStage: Locator;
  private readonly otpInputs: readonly Locator[];
  private readonly otpRejectionFeedback: Locator;
  private readonly verifyOtpButton: Locator;
  private readonly resendOtpButton: Locator;
  private readonly resendEnabledMs: number;

  public constructor(page: Page, timing: RegistrationPageTiming = {}) {
    super(page);
    this.resendEnabledMs = timing.resendEnabledMs ?? TIMEOUTS.registrationOtpResend;
    this.header = new HeaderComponent(page);
    this.openRegistrationButton = page.getByRole('button', {
      name: 'Đăng ký ngay',
      exact: true,
    });
    this.fullNameInput = page.getByPlaceholder('Họ và tên', { exact: true });
    this.emailInput = page.getByPlaceholder('Email của bạn', { exact: true });
    this.passwordInput = page.getByPlaceholder('Mật khẩu', { exact: true });
    this.confirmPasswordInput = page.getByPlaceholder('Nhập lại mật khẩu', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Tạo tài khoản', exact: true });
    this.registrationForm = this.submitButton.locator('..');
    this.validationMessageLocators = [
      this.registrationForm.getByText('Vui lòng nhập họ và tên', { exact: true }),
      this.registrationForm.getByText('Email không hợp lệ', { exact: true }),
      this.registrationForm.getByText('Vui lòng nhập email hợp lệ', { exact: true }),
      this.registrationForm.getByText('Mật khẩu phải có ít nhất 8 ký tự', { exact: true }),
      this.registrationForm.getByText('Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số', {
        exact: true,
      }),
      this.registrationForm.getByText('Mật khẩu xác nhận không khớp', { exact: true }),
      this.registrationForm.getByText('Phải trùng khớp với mật khẩu đã nhập', { exact: true }),
    ];
    this.serverFeedbackMessage = this.registrationForm.locator(
      'p.text-red-500.text-xs.mb-3.flex.items-center.gap-1',
    );
    this.otpHeading = page.getByRole('heading', { name: 'Xác thực email', exact: true });
    this.registrationSuccessHeading = page.getByRole('heading', {
      name: 'Đăng ký thành công!',
      exact: true,
    });
    this.completeRegistrationButton = page.getByRole('button', {
      name: 'Khám phá ngay',
      exact: true,
    });
    this.otpInputs = Array.from({ length: 6 }, (_, index) =>
      page.getByRole('textbox', { name: `Mã OTP ${String(index + 1)}`, exact: true }),
    );
    this.verifyOtpButton = page.getByRole('button', { name: 'Xác nhận', exact: true });
    this.resendOtpButton = page.getByRole('button', {
      name: /^Gửi lại(?: OTP)?(?:\s+(?:sau\s+)?\(?\d+\s*(?:s|gi\u00e2y)\)?)?$/i,
    });
    this.otpStage = this.otpHeading.locator('..');
    this.otpRejectionFeedback = this.otpStage
      .getByRole('alert')
      .or(
        this.otpStage.getByText(
          /(?:OTP|m\u00e3 x\u00e1c th\u1ef1c).*(?:sai|kh\u00f4ng (?:\u0111\u00fang|h\u1ee3p l\u1ec7|ch\u00ednh x\u00e1c)|invalid|incorrect)/i,
        ),
      );
  }

  public async openHome(): Promise<void> {
    await this.navigate(ROUTES.home);
  }

  public async open(): Promise<void> {
    await this.header.openLogin();
    await this.openRegistrationButton.click();
    await this.fullNameInput.waitFor({ state: 'visible' });
  }

  public async fillRegistration(data: RegistrationData): Promise<void> {
    await this.fillFullName(data.fullName);
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillPasswordConfirmation(data.passwordConfirmation);
  }

  public async fillFullName(fullName: string): Promise<void> {
    await this.fullNameInput.fill(fullName);
  }

  public async blurFullName(): Promise<void> {
    await this.fullNameInput.blur();
  }

  public async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  public async blurEmail(): Promise<void> {
    await this.emailInput.blur();
  }

  public async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  public async blurPassword(): Promise<void> {
    await this.passwordInput.blur();
  }

  public async fillPasswordConfirmation(passwordConfirmation: string): Promise<void> {
    await this.confirmPasswordInput.fill(passwordConfirmation);
  }

  public async blurPasswordConfirmation(): Promise<void> {
    await this.confirmPasswordInput.blur();
  }

  public async blurAllFields(): Promise<void> {
    await this.blurFullName();
    await this.blurEmail();
    await this.blurPassword();
    await this.blurPasswordConfirmation();
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async activateSubmit(): Promise<RegistrationSubmitActivation> {
    if (!(await this.submitButton.isEnabled())) {
      return 'blocked';
    }

    await this.submitButton.click();
    return 'activated';
  }

  public async visibleValidationMessages(): Promise<string[]> {
    const visibleMessages: string[] = [];
    for (const message of this.validationMessageLocators) {
      if (await message.isVisible()) {
        visibleMessages.push(((await message.textContent()) ?? '').trim());
      }
    }
    return visibleMessages;
  }

  public async validationMessages(): Promise<string[]> {
    return this.visibleValidationMessages();
  }

  public async fieldValidationMessages(): Promise<string[]> {
    return this.visibleValidationMessages();
  }

  public async serverMessage(): Promise<string> {
    return (await this.serverFeedbackMessage.textContent())?.trim() ?? '';
  }

  public async submitAndObserveTransition(): Promise<RegistrationSubmitTransition> {
    const submitButtonHandle = await this.submitButton.elementHandle();

    try {
      const observation = this.page.evaluate((button) => {
        return new Promise<RegistrationSubmitTransition>((resolve) => {
          const submitButton = button as HTMLButtonElement;
          let transitionArmed = false;
          let transitionObserved = false;
          let settled = false;
          let timeoutId: number | undefined;

          const finish = (): void => {
            if (settled) return;

            settled = true;
            observer.disconnect();
            button.removeEventListener('auth-transition-observation-cancel', cancel);
            button.removeEventListener('click', arm, true);
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
            resolve({
              disabledObserved: transitionObserved,
              loadingTextObserved: transitionObserved,
            });
          };
          const capture = (): void => {
            if (
              transitionArmed &&
              submitButton.disabled &&
              submitButton.textContent.trim() === 'Đang xử lý...'
            ) {
              transitionObserved = true;
              finish();
            }
          };
          const observer = new MutationObserver(capture);
          const cancel = (): void => finish();
          const arm = (): void => {
            transitionArmed = submitButton.textContent.trim() === 'Tạo tài khoản';
            timeoutId = window.setTimeout(finish, 1_000);
          };

          observer.observe(button, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
          });
          button.addEventListener('auth-transition-observation-cancel', cancel, { once: true });
          button.addEventListener('click', arm, true);
        });
      }, submitButtonHandle);

      try {
        await this.submitButton.click();
      } catch (error) {
        await this.page.evaluate((button) => {
          button.dispatchEvent(new Event('auth-transition-observation-cancel'));
        }, submitButtonHandle);
        await observation;
        throw error;
      }
      return await observation;
    } finally {
      await submitButtonHandle.dispose();
    }
  }

  public async isSubmitEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled();
  }

  public async isResendEnabled(): Promise<boolean> {
    return this.resendOtpButton.isEnabled();
  }

  public async otpRejectionMessage(): Promise<string> {
    return (await this.otpRejectionFeedback.textContent())?.trim() ?? '';
  }

  public async resendCountdownSeconds(): Promise<number | undefined> {
    const otpStageText = await this.otpStage.innerText();
    const countdown = /(\d+)\s*(?:s|gi\u00e2y)\b/i.exec(otpStageText)?.[1];
    if (countdown === undefined) {
      return undefined;
    }

    return Number(countdown);
  }

  public async waitForResendEnabled(): Promise<void> {
    await expect(this.resendOtpButton).toBeEnabled({ timeout: this.resendEnabledMs });
  }

  public async waitForOtpScreen(): Promise<void> {
    await this.otpHeading.waitFor({ state: 'visible' });
  }

  public async enterOtp(code: string): Promise<void> {
    if (!/^\d{6}$/.test(code)) {
      throw new Error('OTP must contain exactly six digits.');
    }

    const otpInputCounts = await Promise.all(this.otpInputs.map((input) => input.count()));
    if (otpInputCounts.some((count) => count !== 1)) {
      throw new Error(
        'OTP entry is blocked: Propify must expose six unique accessible textbox names: "Mã OTP 1" through "Mã OTP 6".',
      );
    }

    for (const [index, input] of this.otpInputs.entries()) {
      await input.fill(code.charAt(index));
    }

    await this.verifyOtpButton.click();
  }

  public async waitForRegistrationSuccess(): Promise<void> {
    await this.registrationSuccessHeading.waitFor({ state: 'visible' });
  }

  public async completeRegistration(): Promise<void> {
    await this.registrationSuccessHeading.waitFor({ state: 'visible' });
    await this.completeRegistrationButton.click();
  }
}
