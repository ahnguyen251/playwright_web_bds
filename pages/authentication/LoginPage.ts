import type { Locator, Page } from '@playwright/test';

import type { UserCredentials } from '../../types/user.types';
import { ROUTES } from '../../constants/routes';
import { BasePage } from '../base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';
import { ForgotPasswordPage } from './ForgotPasswordPage';

export class LoginPage extends BasePage {
  private readonly header: HeaderComponent;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly continueButton: Locator;
  private readonly forgotPasswordButton: Locator;

  public constructor(page: Page) {
    super(page);
    const dialog = page.getByRole('dialog');
    this.header = new HeaderComponent(page);
    this.emailInput = dialog.getByPlaceholder('Email của bạn', { exact: true });
    this.passwordInput = dialog.getByPlaceholder('Mật khẩu', { exact: true });
    this.continueButton = dialog.getByRole('button', { name: 'Tiếp tục', exact: true });
    this.forgotPasswordButton = dialog.getByRole('button', {
      name: 'Quên mật khẩu?',
      exact: true,
    });
  }

  public async open(): Promise<void> {
    await this.header.openLogin();
    await this.emailInput.waitFor({ state: 'visible' });
  }

  public async openHome(): Promise<void> {
    await this.navigate(ROUTES.home);
  }

  public async submitCredentials(credentials: UserCredentials): Promise<void> {
    await this.emailInput.fill(credentials.email);
    await this.passwordInput.fill(credentials.password);
    await this.continueButton.click();
  }

  public async openForgotPassword(): Promise<ForgotPasswordPage> {
    await this.forgotPasswordButton.click();
    return new ForgotPasswordPage(this.page);
  }
}
