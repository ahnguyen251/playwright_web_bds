import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { TransactionFilter, TransactionStatus } from '../../types/transaction.types';
import { BasePage } from '../base/BasePage';

const statusLabels: Readonly<Record<TransactionStatus, string>> = {
  all: 'Tất cả',
  successful: 'Thành công',
  processing: 'Đang xử lý',
  failed: 'Thất bại',
  expired: 'Hết hạn',
};

export class TransactionPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly fromDateInput: Locator;
  private readonly toDateInput: Locator;
  private readonly filterButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Tìm kiếm theo tên tin đăng...', { exact: true });
    this.fromDateInput = page.getByLabel('Từ ngày:');
    this.toDateInput = page.getByLabel('Đến ngày:');
    this.filterButton = page.getByRole('button', { name: 'Lọc', exact: true });
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.transactions);
  }

  public async applyFilter(filter: TransactionFilter): Promise<void> {
    if (filter.listingName !== undefined) {
      await this.searchInput.fill(filter.listingName);
    }
    if (filter.fromDate !== undefined) {
      await this.fromDateInput.fill(filter.fromDate);
    }
    if (filter.toDate !== undefined) {
      await this.toDateInput.fill(filter.toDate);
    }
    if (filter.status !== undefined) {
      await this.page
        .getByRole('button', { name: statusLabels[filter.status], exact: true })
        .click();
    }
    await this.filterButton.click();
  }
}
