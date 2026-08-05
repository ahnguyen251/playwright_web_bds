import type { Locator, Page } from '@playwright/test';

export class AuthenticationModalComponent {
  private readonly authenticationDialog: Locator;
  private readonly closeButton: Locator;
  private readonly googleLoginButton: Locator;
  private readonly registerSwitchButton: Locator;
  private readonly loginSwitchButton: Locator;

  public constructor(page: Page) {
    this.authenticationDialog = page.getByRole('dialog').filter({
      has: page.getByRole('button', { name: 'Đăng nhập với Google', exact: true }),
    });
    this.closeButton = this.authenticationDialog.getByRole('button', { name: 'Đóng', exact: true });
    this.googleLoginButton = this.authenticationDialog.getByRole('button', {
      name: 'Đăng nhập với Google',
      exact: true,
    });
    this.registerSwitchButton = this.authenticationDialog.getByRole('button', {
      name: 'Đăng ký ngay',
      exact: true,
    });
    this.loginSwitchButton = this.authenticationDialog.getByRole('button', {
      name: 'Đăng nhập',
      exact: true,
    });
  }

  public async switchToRegister(): Promise<void> {
    await this.registerSwitchButton.click();
  }

  public async switchToLogin(): Promise<void> {
    await this.loginSwitchButton.click();
  }

  public async loginWithGoogle(): Promise<void> {
    await this.googleLoginButton.click();
  }

  public async close(): Promise<void> {
    await this.closeButton.click();
  }
}
