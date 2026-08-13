import type { Locator, Page } from '@playwright/test';

import type { UserCredentials } from '../../types/user.types';
import { ROUTES } from '../../constants/routes';
import { BasePage } from '../base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';
import { ForgotPasswordPage } from './ForgotPasswordPage';

export class LoginPage extends BasePage {
  private readonly header: HeaderComponent;
  private readonly loginDialog: Locator;
  private readonly heading: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly continueButton: Locator;
  private readonly forgotPasswordButton: Locator;
  private readonly emailValidationMessage: Locator;
  private readonly serverFeedbackMessage: Locator;

  public constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.heading = page.getByRole('heading', { name: 'Xin chào,', exact: true });
    this.loginDialog = this.heading.locator('..');
    this.emailInput = this.loginDialog.getByPlaceholder('Email của bạn', { exact: true });
    this.passwordInput = this.loginDialog.getByPlaceholder('Mật khẩu', { exact: true });
    this.continueButton = this.loginDialog.getByRole('button', { name: 'Tiếp tục', exact: true });
    this.forgotPasswordButton = this.loginDialog.getByRole('button', {
      name: 'Quên mật khẩu?',
      exact: true,
    });
    this.emailValidationMessage = this.loginDialog.getByText('Vui lòng nhập email hợp lệ', {
      exact: true,
    });
    this.serverFeedbackMessage = this.loginDialog.locator(
      'p.text-red-500.text-xs.mb-3.flex.items-center.gap-1',
    );
  }

  public async open(): Promise<void> {
    await this.header.openLogin();
    await this.heading.waitFor({ state: 'visible' });
  }

  public async openHome(): Promise<void> {
    await this.navigate(ROUTES.home);
  }

  public async submitCredentials(credentials: UserCredentials): Promise<void> {
    await this.fillCredentials(credentials);
    await this.submit();
  }

  public async fillCredentials(
    credentials: Pick<UserCredentials, 'email' | 'password'>,
  ): Promise<void> {
    await this.fillEmail(credentials.email);
    await this.fillPassword(credentials.password);
  }

  public async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  public async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  public async blurEmail(): Promise<void> {
    await this.emailInput.blur();
  }

  public async blurPassword(): Promise<void> {
    await this.passwordInput.blur();
  }

  public async submit(): Promise<void> {
    await this.continueButton.click();
  }

  public async openForgotPassword(): Promise<ForgotPasswordPage> {
    await this.forgotPasswordButton.click();
    return new ForgotPasswordPage(this.page);
  }

  public async isOpen(): Promise<boolean> {
    return this.heading.isVisible();
  }

  public async validationMessage(): Promise<string> {
    return (await this.emailValidationMessage.textContent()) ?? '';
  }

  public async serverMessage(): Promise<string> {
    return (await this.serverFeedbackMessage.textContent())?.trim() ?? '';
  }

  public async isSubmitEnabled(): Promise<boolean> {
    return this.continueButton.isEnabled();
  }
}
