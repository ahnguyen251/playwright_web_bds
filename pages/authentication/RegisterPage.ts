import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { RegistrationData } from '../../types/user.types';
import { BasePage } from '../base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';

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
  private readonly completeRegistrationButton: Locator;

  public constructor(page: Page) {
    super(page);
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
    this.otpHeading = page.getByRole('heading', { name: 'Xác thực email', exact: true });
    this.registrationSuccessHeading = page.getByRole('heading', {
      name: 'Đăng ký thành công!',
      exact: true,
    });
    this.completeRegistrationButton = page.getByRole('button', {
      name: 'Khám phá ngay',
      exact: true,
    });
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
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.passwordConfirmation);
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async waitForOtpScreen(): Promise<void> {
    await this.otpHeading.waitFor({ state: 'visible' });
  }

  public enterOtp(code: string): Promise<void> {
    if (!/^\d{6}$/.test(code)) {
      return Promise.reject(new Error('OTP must contain exactly six digits.'));
    }

    return Promise.reject(
      new Error(
        'OTP entry is blocked: Propify must expose six unique accessible textbox names: "Mã OTP 1" through "Mã OTP 6".',
      ),
    );
  }

  public async waitForRegistrationSuccess(): Promise<void> {
    await this.registrationSuccessHeading.waitFor({ state: 'visible' });
  }

  public async completeRegistration(): Promise<void> {
    await this.registrationSuccessHeading.waitFor({ state: 'visible' });
    await this.completeRegistrationButton.click();
  }
}
