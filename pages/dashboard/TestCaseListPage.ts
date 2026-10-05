import type { Locator, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';

export class TestCaseListPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly moduleFilter: Locator;
  private readonly automationStatusFilter: Locator;
  private readonly latestRunStatusFilter: Locator;
  private readonly clearFiltersButton: Locator;
  private readonly testCaseTable: Locator;
  private readonly selectedCount: Locator;
  private readonly runSelectedButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Search Test Cases...');
    this.moduleFilter = page.getByRole('combobox', { name: 'Mô-đun', exact: true });
    this.automationStatusFilter = page.getByRole('combobox', {
      name: 'Trạng thái tự động hóa',
      exact: true,
    });
    this.latestRunStatusFilter = page.getByRole('combobox', {
      name: 'Kết quả chạy gần nhất',
      exact: true,
    });
    this.clearFiltersButton = page.getByRole('button', { name: 'Xóa bộ lọc', exact: true });
    this.testCaseTable = page.getByRole('table', { name: 'Danh sách test case', exact: true });
    this.selectedCount = page.getByRole('status', { name: 'Số test case đã chọn', exact: true });
    this.runSelectedButton = page.getByRole('button', { name: 'Chạy test đã chọn', exact: true });
  }

  public async open(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  public async filterByLatestRun(status: 'PASSED' | 'FAILED' | 'NOT_RUN'): Promise<void> {
    await this.latestRunStatusFilter.selectOption(status);
  }

  public async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  public async getActiveFilterLabels(): Promise<string[]> {
    return this.page.getByRole('button', { name: /^Bỏ lọc:/ }).allTextContents();
  }

  public async visibleTestCaseIds(): Promise<string[]> {
    const links = await this.testCaseTable.getByRole('link').allTextContents();
    return links.filter((text) => text.startsWith('TC-'));
  }

  public async selectTestCase(testCaseId: string): Promise<void> {
    await this.page.getByLabel(`Chọn ${testCaseId}`, { exact: true }).check();
  }

  public async unselectTestCase(testCaseId: string): Promise<void> {
    await this.page.getByLabel(`Chọn ${testCaseId}`, { exact: true }).uncheck();
  }

  public async getSelectedCount(): Promise<string> {
    return (await this.selectedCount.textContent()) ?? '';
  }

  public async isRunSelectedEnabled(): Promise<boolean> {
    return this.runSelectedButton.isEnabled();
  }
}
