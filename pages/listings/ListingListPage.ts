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
  private transactionType: TransactionType = 'sale';
  private lastResultTotal: number | undefined;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Tìm kiếm theo tên, địa chỉ, dự án...', {
      exact: true,
    });
    this.searchButton = page.getByRole('button', { name: 'Tìm kiếm', exact: true });
    this.listingCards = page.getByRole('main').locator('a[href^="/listings/"]:has(h3)');
    this.resultCountText = page
      .locator('[data-result-count]')
      .or(page.getByText(/Hiện có\s+\d+\s+bất động sản/i))
      .first();
    this.emptyState = page
      .locator('[data-empty]')
      .or(
        page.getByText(/Không có bất động sản|Không tìm thấy|Chưa có tin (mua bán|cho thuê) nào/i),
      )
      .first();
    this.validation = page.locator('[data-filter-validation]').or(page.getByRole('alert')).first();
    this.posterControls = page.getByRole('region', { name: /Người đăng/i });
    this.priceScope = page
      .locator('[data-range="price"]')
      .or(page.getByRole('heading', { name: /Khoảng giá|Mức giá/i }).locator('xpath=..'))
      .first();
    this.areaScope = page
      .locator('[data-range="area"]')
      .or(page.getByRole('heading', { name: 'Diện tích', exact: true }).locator('xpath=..'))
      .first();
    this.sortTrigger = page.locator('[data-sort-trigger], button.sort-trigger').first();
    this.nextButton = page.getByRole('button', { name: /Trang tiếp theo|Tiếp/i }).first();
    this.previousButton = page.getByRole('button', { name: /Trang trước|Trước/i }).first();
    this.resetButton = page.getByRole('button', { name: /Đặt lại bộ lọc|Xóa bộ lọc/i }).first();
  }

  public async open(transactionType: TransactionType): Promise<void> {
    this.transactionType = transactionType;
    this.lastResultTotal = undefined;
    await this.navigate(transactionType === 'sale' ? ROUTES.sales : ROUTES.rent);
  }

  public async search(criteria: ListingSearchCriteria): Promise<void> {
    if (criteria.keyword !== undefined) await this.searchInput.fill(criteria.keyword);
    await this.runAndWaitForListings(
      () => this.searchButton.click(),
      (parameters) =>
        criteria.keyword === undefined ||
        [...parameters.values()].some((value) => value === criteria.keyword),
    );
    if (criteria.sortLabel !== undefined) await this.sort(criteria.sortLabel);
  }

  public async applyFilters(criteria: ListingFilterCriteria): Promise<void> {
    if (criteria.poster !== undefined) await this.selectPoster(criteria.poster);
    if (criteria.price !== undefined) await this.setRange('price', this.priceScope, criteria.price);
    if (criteria.area !== undefined) await this.setRange('area', this.areaScope, criteria.area);
  }

  public async resetFilters(): Promise<void> {
    if ((await this.resetButton.count()) > 0) {
      await this.resetButton.click();
      return;
    }
    await this.searchInput.fill('');
    await this.selectPoster('all');
    await this.priceScope.locator('input[type="radio"][value="all"]').check();
    await this.areaScope.locator('input[type="radio"][value="all"]').check();
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
    const total = await this.resultCount();
    if (total === 0) return [];
    const roots = await this.listingCards.all();
    const visibleRoots: Locator[] = [];
    for (const root of roots) {
      if (await root.isVisible()) visibleRoots.push(root);
    }
    return Promise.all(
      visibleRoots.slice(0, total).map(async (root) => new ListingCardComponent(root).summary()),
    );
  }

  public async resultCount(): Promise<number> {
    if (this.lastResultTotal !== undefined) return this.lastResultTotal;
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
    const values = { all: 'ALL', owner: 'OWNER', broker: 'BROKER' } as const;
    const scope = (await this.posterControls.count()) > 0 ? this.posterControls : this.page;
    await this.runAndWaitForListings(
      () => scope.getByRole('button', { name: labels[poster], exact: true }).click(),
      (parameters) =>
        poster === 'all'
          ? !parameters.has('poster_type')
          : parameters.get('poster_type') === values[poster],
    );
  }

  private async setRange(
    field: 'price' | 'area',
    scope: Locator,
    selection: ListingRangeSelection,
  ): Promise<void> {
    if (selection.kind === 'preset') {
      await this.runAndWaitForListings(() =>
        scope.getByLabel(selection.label, { exact: true }).check(),
      );
      return;
    }
    await scope.locator('input[type="radio"][value="custom"]').check();
    await scope.getByPlaceholder('Từ', { exact: true }).fill(String(selection.from));
    await this.runAndWaitForListings(
      () => scope.getByPlaceholder('Đến', { exact: true }).fill(String(selection.to)),
      (parameters) => this.matchesRange(parameters, field, selection),
    );
  }

  private rangeInput(field: ListingRangeField): Locator {
    const scope = field.startsWith('price') ? this.priceScope : this.areaScope;
    return scope.getByPlaceholder(field.endsWith('From') ? 'Từ' : 'Đến', { exact: true });
  }

  private matchesRange(
    parameters: URLSearchParams,
    field: 'price' | 'area',
    selection: Extract<ListingRangeSelection, { kind: 'custom' }>,
  ): boolean {
    const multiplier = field === 'price' ? 1_000_000_000 : 1;
    const from = Math.max(0, selection.from) * multiplier;
    const to = Math.max(0, selection.to) * multiplier;
    const minimumKey = field === 'price' ? 'min_price' : 'min_area';
    const maximumKey = field === 'price' ? 'max_price' : 'max_area';
    return (
      (from === 0 || parameters.get(minimumKey) === String(from)) &&
      parameters.get(maximumKey) === String(to)
    );
  }

  private async runAndWaitForListings(
    action: () => Promise<void>,
    matches: (parameters: URLSearchParams) => boolean = () => true,
  ): Promise<void> {
    if (!/^https?:/.test(this.page.url())) {
      await action();
      return;
    }
    const responsePromise = this.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === '/api/v1/listings' &&
        url.searchParams.get('demand_type') === this.transactionType.toUpperCase() &&
        matches(url.searchParams)
      );
    });
    await action();
    const response = await responsePromise;
    const payload: unknown = await response.json();
    const total = this.listingTotal(payload);
    if (total !== undefined) {
      this.lastResultTotal = total;
      await this.resultCountText
        .filter({ hasText: new RegExp(`\\b${String(total)}\\b`) })
        .waitFor();
    }
    await this.page.waitForLoadState('networkidle');
  }

  private listingTotal(payload: unknown): number | undefined {
    if (typeof payload !== 'object' || payload === null) return undefined;
    const meta = (payload as Record<string, unknown>).meta;
    if (typeof meta !== 'object' || meta === null) return undefined;
    const total = (meta as Record<string, unknown>).total;
    return typeof total === 'number' ? total : undefined;
  }
}
