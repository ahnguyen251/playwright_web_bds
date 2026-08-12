import type { Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { ListingData, ListingStatus } from '../../types/listing.types';
import { BasePage } from '../base/BasePage';
import { ListingFormComponent } from '../components/ListingFormComponent';

export class CreateListingPage extends BasePage {
  private readonly form: ListingFormComponent;

  public constructor(page: Page) {
    super(page);
    this.form = new ListingFormComponent(page);
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.postListing);
  }

  public async submit(data: ListingData): Promise<void> {
    await this.createDraft(data);
    await this.publish();
  }

  public async createDraft(data: ListingData): Promise<void> {
    await this.form.fill(data);
    await this.form.uploadMedia(data.media);
  }

  public async publish(): Promise<void> {
    await this.form.submit();
  }

  public async successMessage(): Promise<string> {
    return this.form.successMessage();
  }

  public async status(): Promise<ListingStatus> {
    return this.form.status();
  }
}
