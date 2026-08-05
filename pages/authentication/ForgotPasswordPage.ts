import type { Locator, Page } from '@playwright/test';

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
    this.emailInput = this.emailHeading.locator('..').getByPlaceholder('Email của bạn', { exact: true });
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
    this.feedbackMessage = page.getByRole('alert');
  }

  public async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.requestResetButton.click();
  }

  public async enterOtp(code: string): Promise<void> {
    for (const [index, digit] of Array.from(code).entries()) {
      await this.otpInputs.nth(index).fill(digit);
    }
  }

  public async submitOtp(): Promise<void> {
    await this.submitOtpButton.click();
  }

  public async resendOtp(): Promise<void> {
    await this.resendOtpButton.click();
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
    const stageMarkers: ReadonlyArray<readonly [PasswordRecoveryStage, Locator]> = [
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

    if (visibleStages.length !== 1) {
      throw new Error('Expected exactly one visible password recovery stage.');
    }

    return visibleStages[0] as PasswordRecoveryStage;
  }

  public async visibleMessage(): Promise<string> {
    if (await this.successHeading.isVisible()) {
      return (await this.successHeading.textContent()) ?? '';
    }

    return (await this.feedbackMessage.textContent()) ?? '';
  }

  public async isOpen(): Promise<boolean> {
    return (await this.emailHeading.isVisible()) || this.legacyEmailHeading.isVisible();
  }
}
