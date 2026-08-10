import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

export class ForgotPasswordPage extends BasePage {
  public readonly heading: Locator;
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;

  public constructor(page: Page) {
    super(page);
    const dialog = page.getByRole('dialog');
    this.heading = dialog.getByRole('heading', { name: 'Quên mật khẩu', exact: true });
    this.emailInput = dialog.getByPlaceholder('Email của bạn', { exact: true });
    this.submitButton = dialog.getByRole('button', { name: 'Gửi liên kết', exact: true });
  }

  public async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
