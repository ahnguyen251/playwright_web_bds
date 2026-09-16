import type { Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { ListingData, ListingFormField, ListingStatus } from '../../types/listing.types';
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
    await this.form.waitForReady();
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

  public async fillContactPhone(phone: string): Promise<void> {
    await this.form.fillContactPhone(phone);
  }

  public async blurContactPhone(): Promise<void> {
    await this.form.blurContactPhone();
  }

  public async contactPhoneError(): Promise<string> {
    return this.form.contactPhoneError();
  }

  public async fillTitle(title: string): Promise<void> {
    await this.form.fillTitle(title);
  }

  public async blurTitle(): Promise<void> {
    await this.form.blurTitle();
  }

  public async titleError(): Promise<string> {
    return this.form.titleError();
  }

  public async titleValue(): Promise<string> {
    return this.form.titleValue();
  }

  public async titleCounterText(): Promise<string> {
    return this.form.titleCounterText();
  }

  public async fillContactName(name: string): Promise<void> {
    await this.form.fillContactName(name);
  }

  public async blurContactName(): Promise<void> {
    await this.form.blurContactName();
  }

  public async contactNameValue(): Promise<string> {
    return this.form.contactNameValue();
  }

  public async propertyTypeError(): Promise<string> {
    return this.form.propertyTypeError();
  }

  public async selectTransactionType(type: 'sale' | 'rent'): Promise<void> {
    await this.form.selectTransactionType(type);
  }

  public async priceLabel(): Promise<string> {
    return this.form.priceLabel();
  }

  public async isDepositVisible(): Promise<boolean> {
    return this.form.isDepositVisible();
  }

  public async depositOptions(): Promise<string[]> {
    return this.form.depositOptions();
  }

  public async isDepositRequired(): Promise<boolean> {
    return this.form.isDepositRequired();
  }

  public async selectDepositOption(option: string): Promise<void> {
    await this.form.selectDepositOption(option);
  }

  public async selectedDepositOption(): Promise<string> {
    return this.form.selectedDepositOption();
  }

  public async depositError(): Promise<string> {
    return this.form.depositError();
  }

  public async isLegalVisible(): Promise<boolean> {
    return this.form.isLegalVisible();
  }

  public async fillField(field: ListingFormField, value: string): Promise<void> {
    await this.form.fillField(field, value);
  }

  public async fieldError(field: ListingFormField): Promise<string> {
    return this.form.fieldError(field);
  }

  public async fillDescription(desc: string): Promise<void> {
    await this.form.fillDescription(desc);
  }

  public async blurDescription(): Promise<void> {
    await this.form.blurDescription();
  }

  public async descriptionError(): Promise<string> {
    return this.form.descriptionError();
  }

  public async fillArea(area: string): Promise<void> {
    await this.form.fillArea(area);
  }

  public async blurArea(): Promise<void> {
    await this.form.blurArea();
  }

  public async areaError(): Promise<string> {
    return this.form.areaError();
  }

  public async fillPrice(price: string): Promise<void> {
    await this.form.fillPrice(price);
  }

  public async blurPrice(): Promise<void> {
    await this.form.blurPrice();
  }

  public async priceError(): Promise<string> {
    return this.form.priceError();
  }

  public async priceValue(): Promise<string> {
    return this.form.priceValue();
  }

  public async isPriceDisabled(): Promise<boolean> {
    return this.form.isPriceDisabled();
  }

  public async toggleNegotiable(checked: boolean): Promise<void> {
    await this.form.toggleNegotiable(checked);
  }

  public async isNegotiableChecked(): Promise<boolean> {
    return this.form.isNegotiableChecked();
  }

  public async isNegotiableDisabled(): Promise<boolean> {
    return this.form.isNegotiableDisabled();
  }

  public async fillBedrooms(value: string): Promise<void> {
    await this.form.fillBedrooms(value);
  }

  public async bedroomsValue(): Promise<string> {
    return this.form.bedroomsValue();
  }

  public async fillBathrooms(value: string): Promise<void> {
    await this.form.fillBathrooms(value);
  }

  public async bathroomsValue(): Promise<string> {
    return this.form.bathroomsValue();
  }

  public async toastMessage(): Promise<string> {
    return this.form.toastMessage();
  }

  public async imageSectionError(): Promise<string> {
    return this.form.imageSectionError();
  }

  public async legalSectionError(): Promise<string> {
    return this.form.legalSectionError();
  }

  public async uploadImageBuffers(files: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.form.uploadImageBuffers(files);
  }

  public async uploadLegalDocumentBuffers(files: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.form.uploadLegalDocumentBuffers(files);
  }

  public async successMessage(): Promise<string> {
    return this.form.successMessage();
  }

  public async status(): Promise<ListingStatus> {
    return this.form.status();
  }
}
