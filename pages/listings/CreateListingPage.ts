import type { Page } from '@playwright/test';

import type { ListingData } from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';
import { ListingFormComponent } from '../components/ListingFormComponent';

export class CreateListingPage extends BasePage {
  private readonly header: HeaderComponent;
  private readonly form: ListingFormComponent;

  public constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.form = new ListingFormComponent(page);
  }

  public async open(): Promise<void> {
    await this.header.openCreateListing();
  }

  public async createDraft(data: ListingData): Promise<void> {
    await this.form.fill(data);
    await this.form.uploadImages(data.imagePaths);
  }

  public async publish(): Promise<void> {
    await this.form.submit();
  }
}
