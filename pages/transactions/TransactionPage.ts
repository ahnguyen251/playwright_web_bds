import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type {
  TransactionFilter,
  TransactionItem,
  TransactionStatus,
} from '../../types/transaction.types';
import { BasePage } from '../base/BasePage';

const statusLabels: Readonly<Record<TransactionStatus, string>> = {
  all: 'Tất cả',
  successful: 'Thành công',
  processing: 'Đang xử lý',
  failed: 'Thất bại',
  expired: 'Hết hạn',
};

export class TransactionPage extends BasePage {
  public readonly heading: Locator;
  public readonly transactionTabButton: Locator;
  public readonly searchInput: Locator;
  public readonly fromDateInput: Locator;
  public readonly toDateInput: Locator;
  public readonly filterButton: Locator;
  public readonly clearDateFilterButton: Locator;
  public readonly table: Locator;
  public readonly tableHeaderCells: Locator;
  public readonly tableRows: Locator;
  public readonly emptyStateRow: Locator;
  public readonly loadingRow: Locator;
  public readonly paginationInfo: Locator;

  public constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Lịch sử giao dịch' }).first();
    this.transactionTabButton = page.getByRole('button', { name: 'Lịch sử giao dịch' }).first();
    this.searchInput = page.getByPlaceholder('Tìm kiếm theo tên tin đăng...', { exact: true });
    this.fromDateInput = page.getByPlaceholder('DD/MM/YYYY').first();
    this.toDateInput = page.getByPlaceholder('DD/MM/YYYY').nth(1);
    this.filterButton = page.getByRole('button', { name: 'Lọc', exact: true });
    this.clearDateFilterButton = page.getByRole('button', { name: 'Bỏ lọc', exact: true });
    this.table = page.locator('table').first();
    this.tableHeaderCells = this.table.locator('thead th');
    this.tableRows = this.table.locator('tbody tr');
    this.emptyStateRow = this.table.locator('tbody tr').filter({ hasText: 'Không có lịch sử giao dịch nào.' });
    this.loadingRow = this.table.locator('tbody tr').filter({ hasText: 'Đang tải dữ liệu...' });
    this.paginationInfo = page.locator('p').filter({ hasText: /Tổng cộng\s+\d+\s+giao dịch/i }).first();
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.profile);
    await this.transactionTabButton.waitFor({ state: 'visible' });

    const transResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/user/transactions') && res.status() === 200,
      { timeout: 10000 },
    ).catch(() => null);

    await this.transactionTabButton.click();
    await transResponsePromise;
    await this.heading.waitFor({ state: 'visible' });
    await this.loadingRow.waitFor({ state: 'detached' }).catch(() => null);
  }

  public async getHeaderText(): Promise<string> {
    return (await this.heading.innerText()).trim();
  }

  public async getHeaderLabels(): Promise<string[]> {
    return (await this.tableHeaderCells.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  public async getRowCount(): Promise<number> {
    if ((await this.emptyStateRow.count()) > 0 && (await this.emptyStateRow.first().isVisible())) {
      return 0;
    }
    if ((await this.loadingRow.count()) > 0 && (await this.loadingRow.first().isVisible())) {
      return 0;
    }
    return this.tableRows.count();
  }

  public getRow(index: number): Locator {
    return this.tableRows.nth(index);
  }

  public async getTransactionData(index: number): Promise<TransactionItem> {
    const row = this.getRow(index);
    const cells = row.locator('td');
    return {
      txnRef: (await cells.nth(0).innerText()).trim(),
      packageName: (await cells.nth(1).innerText()).trim(),
      listingTitle: (await cells.nth(2).innerText()).trim(),
      amount: (await cells.nth(3).innerText()).trim(),
      duration: (await cells.nth(4).innerText()).trim(),
      paymentMethod: (await cells.nth(5).innerText()).trim(),
      transactionTime: (await cells.nth(6).innerText()).trim(),
      status: (await cells.nth(7).innerText()).trim(),
    };
  }

  public async getAllTransactionDates(): Promise<string[]> {
    const count = await this.getRowCount();
    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
      const data = await this.getTransactionData(i);
      dates.push(data.transactionTime);
    }
    return dates;
  }

  public async isDateSortedDescending(): Promise<boolean> {
    const dates = await this.getAllTransactionDates();
    if (dates.length <= 1) return true;

    const parseDate = (str: string): number => {
      // Format: "HH:mm DD/MM/YYYY"
      const match = /(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(str);
      if (!match) return 0;
      const [, hour = '0', minute = '0', day = '1', month = '1', year = '2000'] = match;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
    };

    for (let i = 0; i < dates.length - 1; i++) {
      const currentDateStr = dates[i];
      const nextDateStr = dates[i + 1];
      if (currentDateStr === undefined || nextDateStr === undefined) continue;
      const current = parseDate(currentDateStr);
      const next = parseDate(nextDateStr);
      if (current < next) {
        return false;
      }
    }
    return true;
  }

  public async filterByStatus(status: TransactionStatus): Promise<void> {
    const label = statusLabels[status];
    const transResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/user/transactions') && res.status() === 200,
      { timeout: 10000 },
    ).catch(() => null);

    await this.page.getByRole('button', { name: label, exact: true }).click();
    await transResponsePromise;
    await this.loadingRow.waitFor({ state: 'detached' }).catch(() => null);
  }

  public async searchByKeyword(keyword: string): Promise<void> {
    const transResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/user/transactions') && res.status() === 200,
      { timeout: 10000 },
    ).catch(() => null);

    await this.searchInput.fill(keyword);
    await transResponsePromise;
    await this.loadingRow.waitFor({ state: 'detached' }).catch(() => null);
  }

  public async clearKeyword(): Promise<void> {
    await this.searchInput.fill('');
    await this.loadingRow.waitFor({ state: 'detached' }).catch(() => null);
  }

  public async applyFilter(filter: TransactionFilter): Promise<void> {
    if (filter.listingName !== undefined) {
      await this.searchByKeyword(filter.listingName);
    }
    if (filter.fromDate !== undefined) {
      await this.fromDateInput.fill(filter.fromDate);
    }
    if (filter.toDate !== undefined) {
      await this.toDateInput.fill(filter.toDate);
    }
    if (filter.status !== undefined) {
      await this.filterByStatus(filter.status);
    }
    if (filter.fromDate !== undefined || filter.toDate !== undefined) {
      await this.filterButton.click();
    }
    await this.loadingRow.waitFor({ state: 'detached' }).catch(() => null);
  }

  public async isEmptyStateVisible(): Promise<boolean> {
    return (await this.emptyStateRow.count()) > 0 && (await this.emptyStateRow.first().isVisible());
  }
}
