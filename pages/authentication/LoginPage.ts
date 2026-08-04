import type { Locator, Page } from '@playwright/test';

import type { UserCredentials } from '../../types/user.types';
import { BasePage } from '../base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';

export class LoginPage extends BasePage {
  private readonly header: HeaderComponent;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly continueButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.emailInput = page.getByPlaceholder('Email của bạn', { exact: true });
    this.passwordInput = page.getByPlaceholder('Mật khẩu', { exact: true });
    this.continueButton = page.getByRole('button', { name: 'Tiếp tục', exact: true });
  }

  public async open(): Promise<void> {
    await this.header.openLogin();
    await this.emailInput.waitFor({ state: 'visible' });
  }

  public async submitCredentials(credentials: UserCredentials): Promise<void> {
    await this.emailInput.fill(credentials.email);
    await this.passwordInput.fill(credentials.password);
    await this.continueButton.click();
  }

  public async isOpen(): Promise<boolean> {
    return this.emailInput.isVisible();
  }
}
