import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import { BasePage } from '../base/BasePage';
import { EditListingPage } from './EditListingPage';

export class MyListingsPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly listingTypeSelect: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Nhập giá trị tìm kiếm...', { exact: true });
    this.listingTypeSelect = page.getByRole('combobox');
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.myListings);
  }

  public async filter(keyword: string, transactionType: 'all' | 'sale' | 'rent'): Promise<void> {
    await this.searchInput.fill(keyword);
    const label =
      transactionType === 'all'
        ? 'Loại tin: Tất cả'
        : transactionType === 'sale'
          ? 'Mua bán'
          : 'Cho thuê';
    await this.listingTypeSelect.selectOption({ label });
  }

  public async editListing(title: string): Promise<EditListingPage> {
    const row = this.page.getByRole('row').filter({ hasText: title });
    await row.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    return new EditListingPage(this.page);
  }
}
