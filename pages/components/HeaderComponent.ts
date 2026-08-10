import type { Locator, Page } from '@playwright/test';

export class HeaderComponent {
  public readonly authenticatedUserControl: Locator;
  private readonly loginButton: Locator;
  private readonly profileLink: Locator;
  private readonly logoutButton: Locator;
  private readonly createListingButton: Locator;

  public constructor(private readonly page: Page) {
    this.loginButton = page.getByRole('button', { name: 'Đăng nhập', exact: true });
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
}
