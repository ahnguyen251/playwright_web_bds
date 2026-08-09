import type { Locator, Page } from '@playwright/test';

import { LISTING_STATUS_LABELS } from '../../constants/listings';
import { ROUTES } from '../../constants/routes';
import type {
  ListingReference,
  ListingStatus,
  ListingSummary,
  TransactionType,
} from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import {
  parseListingDecimal,
  parseListingPriceInBillions,
} from '../components/ListingCardComponent';
import { EditListingPage } from './EditListingPage';

export class MyListingsPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly listingTypeSelect: Locator;
  private readonly statusSelect: Locator;
  private readonly rows: Locator;
  private readonly menu: Locator;
  private readonly confirmDialog: Locator;
  private readonly emptyState: Locator;
  private readonly feedbackRegion: Locator;
  private readonly nextButton: Locator;
  private readonly previousButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Nhập giá trị tìm kiếm...', { exact: true });
    this.listingTypeSelect = page
      .getByLabel(/Loại tin/i)
      .or(page.getByRole('combobox').nth(0))
      .first();
    this.statusSelect = page
      .getByLabel(/Trạng thái/i)
      .or(page.getByRole('combobox').nth(1))
      .first();
    this.rows = page.locator('[data-listing-row], tbody tr');
    this.menu = page.getByRole('menu');
    this.confirmDialog = page.getByRole('dialog', { name: /Xác nhận gỡ tin/i });
    this.emptyState = page
      .locator('[data-empty]')
      .or(page.getByText(/Không có tin đăng|Không có kết quả|Bạn chưa có tin đăng nào/i))
      .first();
    this.feedbackRegion = page.getByRole('status').or(page.getByRole('alert')).first();
    this.nextButton = page.getByRole('button', { name: /Trang tiếp theo|Tiếp/i }).first();
    this.previousButton = page.getByRole('button', { name: /Trang trước|Trước/i }).first();
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.myListings);
  }

  public async search(keyword: string): Promise<void> {
    await this.searchInput.fill(keyword);
  }

  public async filter(
    transactionType: 'all' | TransactionType,
    status: 'all' | ListingStatus = 'all',
  ): Promise<void> {
    const transactionLabels = {
      all: 'Loại tin: Tất cả',
      sale: 'Mua bán',
      rent: 'Cho thuê',
    } as const;
    await this.listingTypeSelect.selectOption({ label: transactionLabels[transactionType] });
    if ((await this.statusSelect.count()) > 0) {
      await this.statusSelect.selectOption(
        status === 'all' ? { label: 'Tất cả trạng thái' } : { label: status },
      );
    }
  }

  public async summaries(): Promise<readonly ListingSummary[]> {
    const rows = await this.rows.all();
    const summaries: ListingSummary[] = [];
    for (const row of rows) {
      if (!(await row.isVisible())) continue;
      const priceText = await this.rowText(row, 'listing-price');
      const price = parseListingPriceInBillions(priceText);
      summaries.push(
        Object.freeze({
          id: (await row.getAttribute('data-id')) ?? (await this.rowText(row, 'listing-id')),
          title:
            (await row.getAttribute('data-title')) ?? (await this.rowText(row, 'listing-title')),
          address: await this.optionalRowText(row, 'listing-address'),
          ...(price === undefined ? {} : { price }),
          priceText,
          area: parseListingDecimal(await this.optionalRowText(row, 'listing-area')),
          bedrooms: parseListingDecimal(await this.optionalRowText(row, 'listing-bedrooms')),
          bathrooms: parseListingDecimal(await this.optionalRowText(row, 'listing-bathrooms')),
          poster: 'owner',
        }),
      );
    }
    return summaries;
  }

  public async nextPage(): Promise<void> {
    await this.nextButton.click();
  }

  public async previousPage(): Promise<void> {
    await this.previousButton.click();
  }

  public async emptyMessage(): Promise<string> {
    return (await this.emptyState.innerText()).trim();
  }

  public async openEdit(reference: ListingReference): Promise<EditListingPage> {
    await this.openActions(reference);
    await this.menu
      .getByRole('button', { name: 'Chỉnh sửa', exact: true })
      .or(this.page.getByRole('button', { name: 'Chỉnh sửa', exact: true }))
      .last()
      .click();
    return new EditListingPage(this.page);
  }

  public async requestWithdraw(reference: ListingReference): Promise<void> {
    await this.openActions(reference);
    const withdrawButton = this.menu
      .getByRole('button', { name: 'Gỡ tin đăng', exact: true })
      .or(this.page.getByRole('button', { name: 'Gỡ tin đăng', exact: true }))
      .last();
    if (!(await withdrawButton.isVisible()) || !(await withdrawButton.isEnabled())) return;
    await withdrawButton.click();
  }

  public async confirmWithdraw(): Promise<void> {
    await this.confirmDialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  }

  public async cancelWithdraw(): Promise<void> {
    await this.confirmDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
  }

  public async statusOf(reference: ListingReference): Promise<ListingStatus> {
    const text = (
      await this.rowByReference(reference).locator('[data-listing-status]').innerText()
    ).trim();
    const status = Object.values(LISTING_STATUS_LABELS).find((candidate) => candidate === text);
    if (status === undefined) throw new Error(`Unknown listing status: ${text}`);
    return status;
  }

  public async feedback(): Promise<string> {
    return (await this.feedbackRegion.innerText()).trim();
  }

  public async editListing(title: string): Promise<EditListingPage> {
    const row = this.rows.filter({ hasText: title }).first();
    await row.getByRole('button').first().click();
    await this.page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).last().click();
    return new EditListingPage(this.page);
  }

  private rowByReference(reference: ListingReference): Locator {
    return this.rows.filter({ hasText: reference.id }).filter({ hasText: reference.title }).first();
  }

  private async openActions(reference: ListingReference): Promise<void> {
    const row = this.rowByReference(reference);
    const namedButton = row.getByRole('button', {
      name: new RegExp(`Thao tác.*${reference.title}`, 'i'),
    });
    const actionButton =
      (await namedButton.count()) > 0 ? namedButton : row.getByRole('button').first();
    await actionButton.click();
  }

  private async rowText(row: Locator, dataName: string): Promise<string> {
    return (await row.locator(`[data-${dataName}]`).first().innerText()).trim();
  }

  private async optionalRowText(row: Locator, dataName: string): Promise<string> {
    const locator = row.locator(`[data-${dataName}]`).first();
    return (await locator.count()) > 0 ? (await locator.innerText()).trim() : '';
  }
}
