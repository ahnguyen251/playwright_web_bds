import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

export class ForgotPasswordPage extends BasePage {
  private readonly heading: Locator;
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Quên mật khẩu', exact: true });
    this.emailInput = page.getByPlaceholder('Email của bạn', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Gửi liên kết', exact: true });
  }

  public async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  public async isOpen(): Promise<boolean> {
    return this.heading.isVisible();
  }
}
