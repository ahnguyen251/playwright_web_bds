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
  private lastResultPageSize: number | undefined;

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
    this.posterControls = page
      .locator('div:has(> button:has-text("Môi giới"))')
      .or(page.getByRole('region', { name: /Người đăng/i }))
      .first();
    this.priceScope = page
      .locator('[data-range="price"]')
      .or(page.getByRole('heading', { name: /Khoảng giá|Mức giá/i }).locator('xpath=..'));
    this.areaScope = page
      .locator('[data-range="area"]')
      .or(page.getByRole('heading', { name: 'Diện tích', exact: true }).locator('xpath=..'));
    this.sortTrigger = page.locator('[data-sort-trigger], button.sort-trigger').first();
    this.nextButton = page.getByRole('button', { name: /Trang tiếp theo|Tiếp/i }).first();
    this.previousButton = page.getByRole('button', { name: /Trang trước|Trước/i }).first();
    this.resetButton = page.getByRole('button', { name: /Đặt lại bộ lọc|Xóa bộ lọc/i }).first();
  }

  public async open(transactionType: TransactionType): Promise<void> {
    this.transactionType = transactionType;
    this.lastResultTotal = undefined;
    this.lastResultPageSize = undefined;
    const responsePromise = this.page
      .waitForResponse(
        (response) => {
          const url = new URL(response.url());
          return (
            response.request().method() === 'GET' &&
            url.pathname === '/api/v1/listings' &&
            url.searchParams.get('demand_type') === this.transactionType.toUpperCase()
          );
        },
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.navigate(transactionType === 'sale' ? ROUTES.sales : ROUTES.rent);
    const response = await responsePromise;
    if (response) {
      const payload: unknown = await response.json().catch(() => null);
      const pagination = this.listingPagination(payload);
      if (pagination !== undefined) {
        this.lastResultTotal = pagination.total;
        this.lastResultPageSize = pagination.perPage;
      }
    }
  }

  public async search(criteria: ListingSearchCriteria): Promise<void> {
    if (criteria.keyword !== undefined) await this.searchInput.fill(criteria.keyword);
    await this.runAndWaitForListings(
      async () => {
        if ((await this.searchButton.count()) > 0 && (await this.searchButton.isVisible())) {
          await this.searchButton.click({ force: true });
          return;
        }
        await this.searchInput.press('Enter');
      },
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
    if ((await this.resetButton.count()) > 0 && (await this.resetButton.isVisible())) {
      await this.runAndWaitForListings(
        () => this.resetButton.click(),
        (parameters) =>
          !parameters.has('poster_type') &&
          !parameters.has('min_price') &&
          !parameters.has('max_price') &&
          !parameters.has('min_area') &&
          !parameters.has('max_area'),
      );
      return;
    }
    await this.searchInput.fill('');
    const activePoster = this.posterControls
      .locator('button[class*="bg-"]')
      .filter({ hasText: /Chính chủ|Chủ nhà|Môi giới/i });
    if ((await activePoster.count()) > 0 && (await activePoster.first().isVisible())) {
      await this.selectPoster('all');
    }
    if ((await this.priceScope.count()) > 0) {
      const priceAll = this.priceScope.locator('input[type="radio"][value="all"]').filter({ visible: true });
      if ((await priceAll.count()) > 0 && !(await priceAll.first().isChecked())) {
        await this.runAndWaitForListings(
          () => priceAll.first().check({ force: true }),
          (parameters) => !parameters.has('min_price') && !parameters.has('max_price'),
        );
      }
      const priceFrom = this.priceScope.locator('input[placeholder*="Từ"], input[name*="from"]').first();
      const priceTo = this.priceScope.locator('input[placeholder*="Đến"], input[name*="to"]').first();
      if ((await priceFrom.count()) > 0 && (await priceFrom.inputValue()) !== '') await priceFrom.fill('');
      if ((await priceTo.count()) > 0 && (await priceTo.inputValue()) !== '') await priceTo.fill('');
    }
    if ((await this.areaScope.count()) > 0) {
      const areaAll = this.areaScope.locator('input[type="radio"][value="all"]').filter({ visible: true });
      if ((await areaAll.count()) > 0 && !(await areaAll.first().isChecked())) {
        await this.runAndWaitForListings(
          () => areaAll.first().check({ force: true }),
          (parameters) => !parameters.has('min_area') && !parameters.has('max_area'),
        );
      }
      const areaFrom = this.areaScope.locator('input[placeholder*="Từ"], input[name*="from"]').first();
      const areaTo = this.areaScope.locator('input[placeholder*="Đến"], input[name*="to"]').first();
      if ((await areaFrom.count()) > 0 && (await areaFrom.inputValue()) !== '') await areaFrom.fill('');
      if ((await areaTo.count()) > 0 && (await areaTo.inputValue()) !== '') await areaTo.fill('');
    }
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
    await this.listingCards.first().waitFor({ timeout: 10_000 }).catch(() => null);
    const roots = await this.listingCards.all();
    const visibleRoots: Locator[] = [];
    for (const root of roots) {
      if (await root.isVisible()) visibleRoots.push(root);
    }
    const currentPageSize = Math.min(total, this.lastResultPageSize ?? total);
    return Promise.all(
      visibleRoots
        .slice(0, currentPageSize)
        .map(async (root) => new ListingCardComponent(root).summary()),
    );
  }

  public async listingTitles(): Promise<readonly string[]> {
    await this.listingCards.first().waitFor({ timeout: 10_000 }).catch(() => null);
    const roots = await this.listingCards.all();
    const titles: string[] = [];
    for (const root of roots) {
      if (await root.isVisible()) {
        const heading = root.getByRole('heading').first();
        titles.push((await heading.innerText()).trim());
      }
    }
    return Object.freeze(titles);
  }

  public async indexOfListing(title: string): Promise<number> {
    const titles = await this.listingTitles();
    return titles.findIndex((t) => t.includes(title));
  }

  public async listingOrder(
    firstTitle: string,
    secondTitle: string,
  ): Promise<'before' | 'after' | 'not_found'> {
    const index1 = await this.indexOfListing(firstTitle);
    const index2 = await this.indexOfListing(secondTitle);
    if (index1 === -1 || index2 === -1) return 'not_found';
    return index1 < index2 ? 'before' : 'after';
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
    const labels = { all: /Tất cả/i, owner: /Chính chủ|Chủ nhà/i, broker: /Môi giới/i } as const;
    const values = { all: 'ALL', owner: 'OWNER', broker: 'BROKER' } as const;
    const scope = (await this.posterControls.count()) > 0 ? this.posterControls : this.page;
    await this.runAndWaitForListings(
      () => scope.getByRole('button', { name: labels[poster] }).first().click({ force: true }),
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
      await this.runAndWaitForListings(
        () =>
          scope
            .getByLabel(selection.label, { exact: true })
            .filter({ visible: true })
            .first()
            .check({ force: true }),
        (parameters) =>
          field === 'price'
            ? parameters.has('min_price') || parameters.has('max_price')
            : parameters.has('min_area') || parameters.has('max_area'),
      );
      return;
    }
    await scope
      .locator('input[type="radio"][value="custom"]')
      .filter({ visible: true })
      .first()
      .check({ force: true });
    await scope
      .getByPlaceholder('Từ', { exact: true })
      .filter({ visible: true })
      .first()
      .fill(String(selection.from));
    await this.runAndWaitForListings(
      () =>
        scope
          .getByPlaceholder('Đến', { exact: true })
          .filter({ visible: true })
          .first()
          .fill(String(selection.to)),
      (parameters) => this.matchesRange(parameters, field, selection),
    );
  }

  private rangeInput(field: ListingRangeField): Locator {
    switch (field) {
      case 'priceFrom':
        return this.priceScope.getByPlaceholder('Từ', { exact: true }).first();
      case 'priceTo':
        return this.priceScope.getByPlaceholder('Đến', { exact: true }).first();
      case 'areaFrom':
        return this.areaScope.getByPlaceholder('Từ', { exact: true }).first();
      case 'areaTo':
        return this.areaScope.getByPlaceholder('Đến', { exact: true }).first();
    }
  }

  private matchesRange(
    parameters: URLSearchParams,
    field: 'price' | 'area',
    selection: Extract<ListingRangeSelection, { readonly kind: 'custom' }>,
  ): boolean {
    const multiplier =
      field === 'price'
        ? this.transactionType === 'sale'
          ? 1_000_000_000
          : 1_000_000
        : 1;
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
    if (this.page.url().includes('/rent')) {
      this.transactionType = 'rent';
    } else if (this.page.url().includes('/sales')) {
      this.transactionType = 'sale';
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
    const pagination = this.listingPagination(payload);
    if (pagination !== undefined) {
      this.lastResultTotal = pagination.total;
      this.lastResultPageSize = pagination.perPage;
      await this.resultCountText
        .filter({ hasText: new RegExp(`\\b${String(pagination.total)}\\b`) })
        .waitFor({ timeout: 5000 })
        .catch(() => null);
    }
    await this.page.waitForLoadState('networkidle');
  }

  private listingPagination(
    payload: unknown,
  ): { readonly total: number; readonly perPage: number } | undefined {
    if (typeof payload !== 'object' || payload === null) return undefined;
    const meta = (payload as Record<string, unknown>).meta;
    if (typeof meta !== 'object' || meta === null) return undefined;
    const total = (meta as Record<string, unknown>).total;
    const perPage = (meta as Record<string, unknown>).per_page;
    return typeof total === 'number' && typeof perPage === 'number'
      ? Object.freeze({ total, perPage })
      : undefined;
  }
}
