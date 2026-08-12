import type { Locator, Page } from '@playwright/test';

export class AuthenticationModalComponent {
  private readonly authenticationDialog: Locator;
  private readonly closeButton: Locator;
  private readonly googleLoginButton: Locator;
  private readonly registerSwitchButton: Locator;
  private readonly loginSwitchButton: Locator;

  public constructor(page: Page) {
    const googleLoginButton = page.getByRole('button', {
      name: 'Đăng nhập với Google',
      exact: true,
    });
    this.authenticationDialog = googleLoginButton.locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " fixed ")][1]',
    );
    this.closeButton = this.authenticationDialog.locator('button.absolute.top-4.right-4');
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
