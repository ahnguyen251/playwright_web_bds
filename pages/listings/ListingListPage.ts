import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { ListingSearchCriteria, TransactionType } from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import { ListingDetailPage } from './ListingDetailPage';

export class ListingListPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly propertyTypeSelect: Locator;

  public constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder('Tìm kiếm theo tên, địa chỉ, dự án...', {
      exact: true,
    });
    this.searchButton = page.getByRole('button', { name: 'Tìm kiếm', exact: true });
    this.propertyTypeSelect = page.getByRole('combobox');
  }

  public async open(transactionType: TransactionType): Promise<void> {
    await this.navigate(transactionType === 'sale' ? ROUTES.sales : ROUTES.rent);
  }

  public async search(criteria: ListingSearchCriteria): Promise<void> {
    if (criteria.keyword !== undefined) {
      await this.searchInput.fill(criteria.keyword);
    }
    if (criteria.propertyType !== undefined) {
      await this.propertyTypeSelect.selectOption({ label: criteria.propertyType });
    }
    await this.searchButton.click();
  }

  public async openListingByTitle(title: string): Promise<ListingDetailPage> {
    await this.page.getByRole('link', { name: title, exact: true }).click();
    return new ListingDetailPage(this.page);
  }
}
