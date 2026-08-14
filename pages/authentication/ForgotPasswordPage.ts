import { expect, type Locator, type Page } from '@playwright/test';

import type { PasswordResetData } from '../../types/user.types';
import { BasePage } from '../base/BasePage';

export type PasswordRecoveryStage = 'email' | 'otp' | 'newPassword' | 'login';

export class ForgotPasswordPage extends BasePage {
  private readonly emailHeading: Locator;
  private readonly legacyEmailHeading: Locator;
  private readonly emailInput: Locator;
  private readonly requestResetButton: Locator;
  private readonly otpInputs: Locator;
  private readonly submitOtpButton: Locator;
  private readonly resendOtpButton: Locator;
  private readonly newPasswordInput: Locator;
  private readonly passwordConfirmationInput: Locator;
  private readonly submitNewPasswordButton: Locator;
  private readonly successHeading: Locator;
  private readonly backToLoginButton: Locator;
  private readonly feedbackMessage: Locator;

  public constructor(page: Page) {
    super(page);
    this.emailHeading = page.getByRole('heading', { name: 'Quên mật khẩu?', exact: true });
    this.legacyEmailHeading = page.getByRole('heading', { name: 'Quên mật khẩu', exact: true });
    this.emailInput = this.emailHeading
      .locator('..')
      .getByPlaceholder('Email của bạn', { exact: true });
    this.requestResetButton = this.emailHeading.locator('..').getByRole('button', {
      name: 'Gửi mã OTP',
      exact: true,
    });
    this.submitOtpButton = page.getByRole('button', { name: 'Xác nhận OTP', exact: true });
    this.otpInputs = this.submitOtpButton
      .locator('..')
      .locator('input[type="text"][inputmode="numeric"][maxlength="1"]');
    this.resendOtpButton = this.submitOtpButton.locator('..').getByRole('button', {
      name: 'Gửi lại',
      exact: true,
    });
    this.submitNewPasswordButton = page.getByRole('button', {
      name: 'Đặt mật khẩu mới',
      exact: true,
    });
    this.newPasswordInput = this.submitNewPasswordButton
      .locator('..')
      .getByPlaceholder('Mật khẩu mới', { exact: true });
    this.passwordConfirmationInput = this.submitNewPasswordButton
      .locator('..')
      .getByPlaceholder('Nhập lại mật khẩu', { exact: true });
    this.successHeading = page.getByRole('heading', { name: 'Thành công!', exact: true });
    this.backToLoginButton = page.getByRole('button', {
      name: '← Quay lại đăng nhập',
      exact: true,
    });
    const emailStage = this.emailHeading.locator('..');
    this.feedbackMessage = emailStage
      .getByRole('alert')
      .or(emailStage.locator('p.text-red-500.text-xs.mb-3.flex.items-center.gap-1'));
  }

  public async requestReset(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.requestResetButton.click();
  }

  public async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  public async blurEmail(): Promise<void> {
    await this.emailInput.blur();
  }

  public async isRequestEnabled(): Promise<boolean> {
    return this.requestResetButton.isEnabled();
  }

  public async enterOtp(code: string): Promise<void> {
    await this.requireSixOtpInputs();
    const otpDigits = Array.from(code).slice(0, 6);

    if (otpDigits.length !== 6 || otpDigits.some((digit) => !/^\d$/.test(digit))) {
      throw new Error('Expected a six-digit OTP.');
    }

    for (const [index, digit] of otpDigits.entries()) {
      await this.otpInputs.nth(index).fill(digit);
    }
  }

  public async submitOtp(): Promise<void> {
    await this.requireSixOtpInputs();
    const otpValues = await Promise.all(
      Array.from({ length: 6 }, async (_, index) => this.otpInputs.nth(index).inputValue()),
    );

    if (otpValues.some((value) => !/^\d$/.test(value))) {
      throw new Error('Cannot submit an incomplete OTP.');
    }

    await this.submitOtpButton.click();
  }

  public async resendOtp(): Promise<void> {
    await this.resendOtpButton.click();
  }

  public async isResendEnabled(): Promise<boolean> {
    return this.resendOtpButton.isEnabled();
  }

  public async waitForResendEnabled(): Promise<void> {
    await expect(this.resendOtpButton).toBeEnabled();
  }

  public async fillNewPassword(
    data: Pick<PasswordResetData, 'newPassword' | 'passwordConfirmation'>,
  ): Promise<void> {
    await this.newPasswordInput.fill(data.newPassword);
    await this.passwordConfirmationInput.fill(data.passwordConfirmation);
  }

  public async submitNewPassword(): Promise<void> {
    await this.submitNewPasswordButton.click();
  }

  public async backToLogin(): Promise<void> {
    await this.backToLoginButton.click();
  }

  public async currentStage(): Promise<PasswordRecoveryStage> {
    const stageMarkers: readonly (readonly [PasswordRecoveryStage, Locator])[] = [
      ['email', this.emailHeading],
      ['otp', this.submitOtpButton],
      ['newPassword', this.submitNewPasswordButton],
      ['login', this.successHeading],
    ];
    const visibleStages: PasswordRecoveryStage[] = [];

    for (const [stage, marker] of stageMarkers) {
      if (await marker.isVisible()) {
        visibleStages.push(stage);
      }
    }

    const visibleStage = visibleStages[0];

    if (visibleStages.length !== 1 || visibleStage === undefined) {
      throw new Error('Expected exactly one visible password recovery stage.');
    }

    return visibleStage;
  }

  public async visibleMessage(): Promise<string> {
    if (await this.successHeading.isVisible()) {
      return (await this.successHeading.textContent()) ?? '';
    }

    return (await this.feedbackMessage.textContent())?.trim() ?? '';
  }

  public async isOpen(): Promise<boolean> {
    return (await this.emailHeading.isVisible()) || this.legacyEmailHeading.isVisible();
  }

  private async requireSixOtpInputs(): Promise<void> {
    const otpInputCount = await this.otpInputs.count();

    if (otpInputCount !== 6) {
      throw new Error(`Expected six OTP inputs, found ${String(otpInputCount)}.`);
    }
  }
}
