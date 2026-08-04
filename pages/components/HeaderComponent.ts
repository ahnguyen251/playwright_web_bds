import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  private readonly loginButton: Locator;
  private readonly accountButton: Locator;
  private readonly profileLink: Locator;
  private readonly logoutButton: Locator;

  public constructor(private readonly page: Page) {
    this.loginButton = page.getByRole('button', { name: 'Đăng nhập', exact: true });
    this.accountButton = page.getByRole('button', { name: 'Tài khoản', exact: true });
    this.profileLink = page.getByRole('link', { name: 'Thông tin tài khoản', exact: true });
    this.logoutButton = page.getByRole('button', { name: 'Đăng xuất', exact: true });
  }

  public async openLogin(): Promise<void> {
    await this.loginButton.click();
  }

  public async openAccountMenu(): Promise<void> {
    await this.accountButton.click();
  }

  public async navigateToProfile(): Promise<void> {
    await this.openAccountMenu();
    await this.profileLink.click();
  }

  public async logout(): Promise<void> {
    await this.openAccountMenu();
    await this.logoutButton.click();
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.accountButton.isVisible();
  }
}
