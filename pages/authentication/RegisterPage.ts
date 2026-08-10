import type { Locator, Page } from '@playwright/test';

import type { RegistrationData } from '../../types/user.types';
import { BasePage } from '../base/BasePage';

export class RegisterPage extends BasePage {
  private readonly openRegistrationButton: Locator;
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.openRegistrationButton = page.getByRole('button', {
      name: 'Đăng ký ngay',
      exact: true,
    });
    this.fullNameInput = page.getByLabel('Họ và tên');
    this.emailInput = page.getByPlaceholder('Email của bạn', { exact: true });
    this.phoneInput = page.getByLabel('Số điện thoại');
    this.passwordInput = page.getByPlaceholder('Mật khẩu', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Xác nhận mật khẩu');
    this.submitButton = page.getByRole('button', { name: 'Đăng ký', exact: true });
  }

  public async open(): Promise<void> {
    await this.openRegistrationButton.click();
    await this.fullNameInput.waitFor({ state: 'visible' });
  }

  public async register(data: RegistrationData): Promise<void> {
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.phoneInput.fill(data.phone);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
    await this.submitButton.click();
  }
}
