import type { Locator, Page } from '@playwright/test';

import type { RegistrationData } from '../../types/user.types';
import { BasePage } from '../base/BasePage';
import { AuthenticationModalComponent } from '../components/AuthenticationModalComponent';

export class RegisterPage extends BasePage {
  private readonly authenticationModal: AuthenticationModalComponent;
  private readonly registrationHeading: Locator;
  private readonly registrationView: Locator;
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;
  private readonly validationMessageLocators: readonly Locator[];
  private readonly otpVerificationHeading: Locator;
  private readonly otpVerificationView: Locator;
  private readonly otpInputs: Locator;
  private readonly otpSubmitButton: Locator;
  private readonly resendOtpButton: Locator;
  private readonly otpErrorMessage: Locator;
  private readonly otpExpiryFeedback: Locator;

  public constructor(page: Page) {
    super(page);
    this.authenticationModal = new AuthenticationModalComponent(page);
    this.registrationHeading = page.getByRole('heading', { name: 'Tạo tài khoản', exact: true });
    this.registrationView = this.registrationHeading.locator('..');
    this.fullNameInput = this.registrationView.getByPlaceholder('Họ và tên', { exact: true });
    this.emailInput = this.registrationView.getByPlaceholder('Email của bạn', { exact: true });
    this.passwordInput = this.registrationView.getByPlaceholder('Mật khẩu', { exact: true });
    this.confirmPasswordInput = this.registrationView.getByPlaceholder('Nhập lại mật khẩu', {
      exact: true,
    });
    this.submitButton = this.registrationView.getByRole('button', {
      name: 'Tạo tài khoản',
      exact: true,
    });
    this.validationMessageLocators = [
      this.registrationView.getByText('Vui lòng nhập email hợp lệ', { exact: true }),
      this.registrationView.getByText('Mật khẩu phải có ít nhất 8 ký tự', { exact: true }),
      this.registrationView.getByText('Mật khẩu xác nhận không khớp', { exact: true }),
    ];
    this.otpVerificationHeading = page.getByRole('heading', {
      name: 'Xác thực email',
      exact: true,
    });
    this.otpVerificationView = this.otpVerificationHeading.locator('..');
    this.otpInputs = this.otpVerificationView.locator(
      'input[type="text"][inputmode="numeric"][maxlength="1"]',
    );
    this.otpSubmitButton = this.otpVerificationView.getByRole('button', {
      name: 'Xác nhận OTP',
      exact: true,
    });
    this.resendOtpButton = this.otpVerificationView.getByText('Gửi lại', { exact: true });
    this.otpErrorMessage = this.otpVerificationView.getByRole('alert');
    this.otpExpiryFeedback = this.otpVerificationView.getByText('Mã OTP đã hết hạn', {
      exact: true,
    });
  }

  public async open(): Promise<void> {
    await this.authenticationModal.switchToRegister();
    await this.registrationHeading.waitFor({ state: 'visible' });
  }

  public async fillRegistration(data: RegistrationData): Promise<void> {
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.passwordConfirmation);
  }

  public async blurAllFields(): Promise<void> {
    await this.fullNameInput.blur();
    await this.emailInput.blur();
    await this.passwordInput.blur();
    await this.confirmPasswordInput.blur();
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async register(data: RegistrationData): Promise<void> {
    await this.fillRegistration(data);
    await this.submit();
  }

  public async switchToLogin(): Promise<void> {
    await this.authenticationModal.switchToLogin();
  }

  public async enterOtp(code: string): Promise<void> {
    const otpInputCount = await this.otpInputs.count();
    if (otpInputCount !== 6) {
      throw new Error(`Expected six OTP inputs, found ${String(otpInputCount)}.`);
    }

    for (const [index, digit] of Array.from(code).entries()) {
      if (index === otpInputCount) {
        break;
      }
      await this.otpInputs.nth(index).fill(digit);
    }
  }

  public async submitOtp(): Promise<void> {
    await this.otpSubmitButton.click();
  }

  public async resendOtp(): Promise<void> {
    await this.resendOtpButton.click();
  }

  public async visibleValidationMessages(): Promise<string[]> {
    const visibleMessages: string[] = [];

    for (const messageLocator of this.validationMessageLocators) {
      if (await messageLocator.isVisible()) {
        visibleMessages.push(((await messageLocator.textContent()) ?? '').trim());
      }
    }

    return visibleMessages;
  }

  public async validationMessages(): Promise<string[]> {
    return this.visibleValidationMessages();
  }

  public async isSubmitEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled();
  }

  public async otpError(): Promise<string> {
    return (await this.otpErrorMessage.textContent()) ?? '';
  }

  public async isOtpExpired(): Promise<boolean> {
    return this.otpExpiryFeedback.isVisible();
  }
}
