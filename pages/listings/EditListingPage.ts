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

  public async openVerification(listingId: number | string): Promise<void> {
    const listingResponse = this.page
      .waitForResponse(
        (res) =>
          res.request().method() === 'GET' &&
          res.url().includes('/api/v1/listings/') &&
          (res.url().includes(`/my/${String(listingId)}`) ||
            res.url().includes(`/${String(listingId)}`)),
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.navigate(`/listings/${String(listingId)}/edit?mode=verification`);
    await listingResponse;
    await this.form.waitForVerificationReady();
  }

  public async uploadVerificationIdentityCardFront(
    file: string | { name: string; mimeType: string; buffer: Buffer },
  ): Promise<void> {
    await this.form.uploadIdentityCardFront(file);
  }

  public async uploadVerificationIdentityCardBack(
    file: string | { name: string; mimeType: string; buffer: Buffer },
  ): Promise<void> {
    await this.form.uploadIdentityCardBack(file);
  }

  public async uploadVerificationLegalDocuments(
    files: readonly (string | { name: string; mimeType: string; buffer: Buffer })[],
  ): Promise<void> {
    await this.form.uploadLegalDocuments(files);
  }

  public async setPublicInfoAgreed(agreed: boolean): Promise<void> {
    await this.form.setPublicInfoAgreed(agreed);
  }

  public async submitVerification(): Promise<void> {
    await this.form.submitVerification();
  }

  public async verificationErrorMessage(): Promise<string> {
    return this.form.verificationErrorMessage();
  }

  public async isIdentityCardFrontUploaded(): Promise<boolean> {
    return this.form.isIdentityCardFrontUploaded();
  }

  public async isIdentityCardBackUploaded(): Promise<boolean> {
    return this.form.isIdentityCardBackUploaded();
  }

  public async legalDocumentsCount(): Promise<number> {
    return this.form.legalDocumentsCount();
  }

  public async status(): Promise<ListingStatus> {
    return this.form.status();
  }
}
