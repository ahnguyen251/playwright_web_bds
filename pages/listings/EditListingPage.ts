import type { Page } from '@playwright/test';

import type { ListingData } from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import { ListingFormComponent } from '../components/ListingFormComponent';

export class EditListingPage extends BasePage {
  private readonly form: ListingFormComponent;

  public constructor(page: Page) {
    super(page);
    this.form = new ListingFormComponent(page);
  }

  public async update(data: ListingData): Promise<void> {
    await this.form.fill(data);
    await this.form.uploadImages(data.imagePaths);
  }

  public async save(): Promise<void> {
    await this.form.submit();
  }
}
