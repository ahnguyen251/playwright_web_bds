import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import { BasePage } from '../base/BasePage';
import { ListingCardComponent } from '../components/ListingCardComponent';

export class HomePage extends BasePage {
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly saleTabButton: Locator;
  private readonly rentTabButton: Locator;
  private readonly saleSection: Locator;
  private readonly rentSection: Locator;
  private readonly favoriteSection: Locator;
  private readonly favoriteEmptyMessage: Locator;
  private readonly viewAllSalesLink: Locator;
  private readonly viewAllRentLink: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Nhập địa điểm, quận, đường...', { exact: true });
    this.searchButton = page.getByRole('button', { name: 'Tìm kiếm', exact: true });
    this.saleTabButton = page.getByRole('button', { name: 'Mua bán', exact: true });
    this.rentTabButton = page.getByRole('button', { name: 'Cho thuê', exact: true });

    const saleHeading = page.getByRole('heading', { name: 'Tin mua bán bất động sản', level: 2 });
    this.saleSection = saleHeading.locator('xpath=ancestor::div[2]');

    const rentHeading = page.getByRole('heading', { name: 'Tin cho thuê bất động sản', level: 2 });
    this.rentSection = rentHeading.locator('xpath=ancestor::div[2]');

    const favoriteHeading = page.getByRole('heading', { name: 'Tin đăng yêu thích', level: 2 });
    this.favoriteSection = favoriteHeading.locator('xpath=parent::*');

    this.favoriteEmptyMessage = page.getByText('Bạn chưa lưu tin yêu thích nào.').first();
    this.viewAllSalesLink = this.saleSection
      .getByRole('link', { name: /Xem tất cả/i })
      .or(this.saleSection.locator('a[href="/sales"]'))
      .or(page.locator('a[href="/sales"]'))
      .first();
    this.viewAllRentLink = this.rentSection
      .getByRole('link', { name: /Xem tất cả/i })
      .or(this.rentSection.locator('a[href="/rent"]'))
      .or(page.locator('a[href="/rent"]'))
      .first();
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.home);
  }

  public async selectDemand(type: 'sale' | 'rent'): Promise<void> {
    const targetButton = type === 'sale' ? this.saleTabButton : this.rentTabButton;
    await targetButton.click();
  }

  public async isDemandSelected(type: 'sale' | 'rent'): Promise<boolean> {
    const targetButton = type === 'sale' ? this.saleTabButton : this.rentTabButton;
    const classes = (await targetButton.getAttribute('class')) ?? '';
    return classes.includes('bg-primary');
  }

  public async search(keyword: string, demand?: 'sale' | 'rent'): Promise<void> {
    if (demand !== undefined) {
      await this.selectDemand(demand);
    }
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    await this.page.waitForURL(/\/(sales|rent)/, { timeout: 15_000 }).catch(() => null);
  }

  public async viewAll(type: 'sale' | 'rent'): Promise<void> {
    const link = type === 'sale' ? this.viewAllSalesLink : this.viewAllRentLink;
    await link.click();
    await this.page.waitForURL(type === 'sale' ? /\/sales/ : /\/rent/, { timeout: 15_000 });
  }

  public async getSaleCards(): Promise<ListingCardComponent[]> {
    await this.saleSection.locator('a[href^="/listings/"]:has(article)').first().waitFor({ timeout: 10_000 }).catch(() => null);
    const roots = await this.saleSection.locator('a[href^="/listings/"]:has(article)').all();
    return roots.map((root) => new ListingCardComponent(root));
  }

  public async getRentCards(): Promise<ListingCardComponent[]> {
    await this.rentSection.locator('a[href^="/listings/"]:has(article)').first().waitFor({ timeout: 10_000 }).catch(() => null);
    const roots = await this.rentSection.locator('a[href^="/listings/"]:has(article)').all();
    return roots.map((root) => new ListingCardComponent(root));
  }

  public async getFavoriteCards(): Promise<ListingCardComponent[]> {
    const roots = await this.favoriteSection.locator('a[href^="/listings/"]:has(article)').all();
    return roots.map((root) => new ListingCardComponent(root));
  }

  public async isFavoritesEmpty(): Promise<boolean> {
    return this.favoriteEmptyMessage.isVisible();
  }

  public async favoriteEmptyText(): Promise<string> {
    return (await this.favoriteEmptyMessage.innerText()).trim();
  }
}
