import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type {
  ListingFilterCriteria,
  ListingRangeField,
  ListingRangeSelection,
  ListingSearchCriteria,
  ListingSummary,
  TransactionType,
} from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import { ListingCardComponent } from '../components/ListingCardComponent';
import { ListingDetailPage } from './ListingDetailPage';

export class ListingListPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly listingCards: Locator;
  private readonly resultCountText: Locator;
  private readonly emptyState: Locator;
  private readonly validation: Locator;
  private readonly posterControls: Locator;
  private readonly priceScope: Locator;
  private readonly areaScope: Locator;
  private readonly sortTrigger: Locator;
  private readonly nextButton: Locator;
  private readonly previousButton: Locator;
  private readonly resetButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Tìm kiếm theo tên, địa chỉ, dự án...', {
      exact: true,
    });
    this.searchButton = page.getByRole('button', { name: 'Tìm kiếm', exact: true });
    this.listingCards = page.locator('a[href^="/listings/"]');
    this.resultCountText = page
      .locator('[data-result-count]')
      .or(page.getByText(/Hiện có\s+\d+\s+bất động sản/i))
      .first();
    this.emptyState = page
      .locator('[data-empty]')
      .or(page.getByText(/Không có bất động sản|Không tìm thấy/i))
      .first();
    this.validation = page.locator('[data-filter-validation]').or(page.getByRole('alert')).first();
    this.posterControls = page.getByRole('region', { name: /Người đăng/i });
    this.priceScope = page
      .locator('[data-range="price"]')
      .or(page.getByText(/^Mức giá$/i).locator('xpath=..'))
      .first();
    this.areaScope = page
      .locator('[data-range="area"]')
      .or(page.getByText(/^Diện tích$/i).locator('xpath=..'))
      .first();
    this.sortTrigger = page.locator('[data-sort-trigger], button.sort-trigger').first();
    this.nextButton = page.getByRole('button', { name: /Trang tiếp theo|Tiếp/i }).first();
    this.previousButton = page.getByRole('button', { name: /Trang trước|Trước/i }).first();
    this.resetButton = page.getByRole('button', { name: /Đặt lại bộ lọc|Xóa bộ lọc/i }).first();
  }

  public async open(transactionType: TransactionType): Promise<void> {
    await this.navigate(transactionType === 'sale' ? ROUTES.sales : ROUTES.rent);
  }

  public async search(criteria: ListingSearchCriteria): Promise<void> {
    if (criteria.keyword !== undefined) await this.searchInput.fill(criteria.keyword);
    await this.searchButton.click();
    if (criteria.sortLabel !== undefined) await this.sort(criteria.sortLabel);
  }

  public async applyFilters(criteria: ListingFilterCriteria): Promise<void> {
    if (criteria.poster !== undefined) await this.selectPoster(criteria.poster);
    if (criteria.price !== undefined) await this.setRange(this.priceScope, criteria.price);
    if (criteria.area !== undefined) await this.setRange(this.areaScope, criteria.area);
  }

  public async resetFilters(): Promise<void> {
    if ((await this.resetButton.count()) > 0) {
      await this.resetButton.click();
      return;
    }
    await this.searchInput.fill('');
    await this.selectPoster('all');
    await this.priceScope.getByLabel(/Tất cả/i).check();
    await this.areaScope.getByLabel(/Tất cả/i).check();
  }

  public async sort(label: string): Promise<void> {
    await this.sortTrigger.click();
    await this.page
      .getByRole('menuitem', { name: label, exact: true })
      .or(this.page.getByRole('button', { name: label, exact: true }))
      .last()
      .click();
  }

  public async nextPage(): Promise<void> {
    await this.nextButton.click();
  }

  public async previousPage(): Promise<void> {
    await this.previousButton.click();
  }

  public async summaries(): Promise<readonly ListingSummary[]> {
    const roots = await this.listingCards.all();
    const visibleRoots: Locator[] = [];
    for (const root of roots) {
      if (await root.isVisible()) visibleRoots.push(root);
    }
    return Promise.all(visibleRoots.map(async (root) => new ListingCardComponent(root).summary()));
  }

  public async resultCount(): Promise<number> {
    const text = await this.resultCountText.innerText();
    return Number.parseInt(/\d+/.exec(text)?.[0] ?? '0', 10);
  }

  public async emptyMessage(): Promise<string> {
    return (await this.emptyState.innerText()).trim();
  }

  public async validationMessage(): Promise<string> {
    return (await this.validation.innerText()).trim();
  }

  public async normalizedRangeValue(field: ListingRangeField): Promise<number> {
    const locator = this.rangeInput(field);
    return Number(await locator.inputValue());
  }

  public async openListingByTitle(title: string): Promise<ListingDetailPage> {
    const root = this.listingCards.filter({ has: this.page.getByRole('heading', { name: title }) });
    await new ListingCardComponent(root.first()).open();
    return new ListingDetailPage(this.page);
  }

  private async selectPoster(poster: NonNullable<ListingFilterCriteria['poster']>): Promise<void> {
    const labels = { all: 'Tất cả', owner: 'Chủ nhà', broker: 'Môi giới' } as const;
    const scope = (await this.posterControls.count()) > 0 ? this.posterControls : this.page;
    await scope.getByRole('button', { name: labels[poster], exact: true }).click();
  }

  private async setRange(scope: Locator, selection: ListingRangeSelection): Promise<void> {
    if (selection.kind === 'preset') {
      await scope.getByLabel(selection.label, { exact: true }).check();
      return;
    }
    await scope.getByLabel(/Tùy chỉnh|Tùy chọn/i).check();
    await scope.getByPlaceholder('Từ', { exact: true }).fill(String(selection.from));
    await scope.getByPlaceholder('Đến', { exact: true }).fill(String(selection.to));
  }

  private rangeInput(field: ListingRangeField): Locator {
    const scope = field.startsWith('price') ? this.priceScope : this.areaScope;
    return scope.getByPlaceholder(field.endsWith('From') ? 'Từ' : 'Đến', { exact: true });
  }
}
