import type { Page } from '@playwright/test';

import type { ListingData, ListingStatus } from '../../types/listing.types';
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
    await this.form.uploadMedia(data.media);
    await this.form.submit();
  }

  public async successMessage(): Promise<string> {
    return this.form.successMessage();
  }

  public async status(): Promise<ListingStatus> {
    return this.form.status();
  }
}
