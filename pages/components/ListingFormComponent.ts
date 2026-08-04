import type { Locator, Page } from '@playwright/test';

import type { ListingData } from '../../types/listing.types';
import { FileUploadHelper } from '../../utils/FileUploadHelper';

export class ListingFormComponent {
  private readonly titleInput: Locator;
  private readonly transactionTypeSelect: Locator;
  private readonly propertyTypeSelect: Locator;
  private readonly addressInput: Locator;
  private readonly priceInput: Locator;
  private readonly areaInput: Locator;
  private readonly bedroomInput: Locator;
  private readonly bathroomInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly imageInput: Locator;
  private readonly submitButton: Locator;

  public constructor(page: Page) {
    this.titleInput = page.getByLabel('Tiêu đề');
    this.transactionTypeSelect = page.getByLabel('Loại giao dịch');
    this.propertyTypeSelect = page.getByLabel('Loại hình bất động sản');
    this.addressInput = page.getByLabel('Địa chỉ');
    this.priceInput = page.getByLabel('Giá');
    this.areaInput = page.getByLabel('Diện tích');
    this.bedroomInput = page.getByLabel('Phòng ngủ');
    this.bathroomInput = page.getByLabel('Phòng tắm');
    this.descriptionInput = page.getByLabel('Mô tả');
    this.imageInput = page.locator('input[type="file"]');
    this.submitButton = page.getByRole('button', { name: 'Lưu tin đăng', exact: true });
  }

  public async fill(data: ListingData): Promise<void> {
    await this.titleInput.fill(data.title);
    await this.transactionTypeSelect.selectOption(data.transactionType);
    await this.propertyTypeSelect.selectOption({ label: data.propertyType });
    await this.addressInput.fill(data.address);
    await this.priceInput.fill(String(data.price));
    await this.areaInput.fill(String(data.area));
    await this.bedroomInput.fill(String(data.bedrooms));
    await this.bathroomInput.fill(String(data.bathrooms));
    await this.descriptionInput.fill(data.description);
  }

  public async uploadImages(relativePaths: readonly string[]): Promise<void> {
    for (const relativePath of relativePaths) {
      await FileUploadHelper.upload(this.imageInput, relativePath);
    }
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
