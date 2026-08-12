import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  public readonly authenticatedUserControl: Locator;
  private readonly headerNavigation: Locator;
  private readonly loginButton: Locator;
  private readonly profileLink: Locator;
  private readonly logoutButton: Locator;
  private readonly createListingButton: Locator;

  public constructor(private readonly page: Page) {
    this.headerNavigation = page.getByRole('navigation').filter({
      has: page.getByRole('link', { name: 'Propify', exact: true }),
    });
    this.loginButton = this.headerNavigation.getByRole('button', {
      name: 'Đăng nhập',
      exact: true,
    });
    this.authenticatedUserControl = page.getByRole('button', {
      name: 'Tài khoản',
      exact: true,
    });
    this.profileLink = page.getByRole('link', { name: 'Thông tin tài khoản', exact: true });
    this.logoutButton = page.getByRole('button', { name: 'Đăng xuất', exact: true });
    this.createListingButton = page.getByRole('button', { name: 'Đăng tin', exact: true });
  }

  public async openLogin(): Promise<void> {
    await this.loginButton.click();
  }

  public accountEmail(email: string): Locator {
    return this.page.getByText(email, { exact: true });
  }

  public async waitForAccountEmail(email: string): Promise<void> {
    await this.accountEmail(email).waitFor({ state: 'visible' });
  }

  public async openAccountMenu(): Promise<void> {
    await this.authenticatedUserControl.click();
  }

  public async navigateToProfile(): Promise<void> {
    await this.openAccountMenu();
    await this.profileLink.click();
  }

  public async logout(): Promise<void> {
    await this.openAccountMenu();
    await this.logoutButton.click();
  }

  public async openCreateListing(): Promise<void> {
    await this.createListingButton.click();
  }

  public async waitForAuthenticated(): Promise<void> {
    await this.authenticatedUserControl.waitFor({ state: 'visible' });
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.authenticatedUserControl.isVisible();
  }
}
