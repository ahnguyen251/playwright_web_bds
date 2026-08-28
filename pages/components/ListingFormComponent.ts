import type { Locator, Page } from '@playwright/test';

import { LISTING_STATUS_LABELS } from '../../constants/listings';
import type {
  ListingData,
  ListingFormField,
  ListingFormSnapshot,
  ListingMedia,
  ListingStatus,
} from '../../types/listing.types';
import { FileUploadHelper } from '../../utils/FileUploadHelper';

export class ListingFormComponent {
  private readonly titleInput: Locator;
  private readonly transactionTypeSelect: Locator;
  private readonly propertyTypeSelect: Locator;
  private readonly descriptionInput: Locator;
  private readonly priceInput: Locator;
  private readonly negotiableCheckbox: Locator;
  private readonly areaInput: Locator;
  private readonly provinceSelect: Locator;
  private readonly wardSelect: Locator;
  private readonly streetInput: Locator;
  private readonly addressLineInput: Locator;
  private readonly bedroomInput: Locator;
  private readonly bathroomInput: Locator;
  private readonly contactRoleSelect: Locator;
  private readonly contactNameInput: Locator;
  private readonly contactPhoneInput: Locator;
  private readonly contactEmailInput: Locator;
  private readonly imageInput: Locator;
  private readonly videoInput: Locator;
  private readonly submitButton: Locator;
  private readonly imagePreviews: Locator;
  private readonly videoPreviews: Locator;
  private readonly feedbackRegion: Locator;

  public constructor(private readonly page: Page) {
    this.titleInput = page.getByLabel(/Tên bất động sản|Tiêu đề/i).first();
    this.transactionTypeSelect = page.getByLabel(/Loại giao dịch/i).first();
    this.propertyTypeSelect = page.getByLabel(/Loại (bất động sản|hình bất động sản)/i).first();
    this.descriptionInput = page.getByLabel(/Mô tả/i).first();
    this.priceInput = page.getByLabel(/^Giá/i).first();
    this.negotiableCheckbox = page.getByLabel(/Thỏa thuận/i).first();
    this.areaInput = page.getByLabel(/Diện tích/i).first();
    this.provinceSelect = page.getByLabel(/Tỉnh|Thành phố/i).first();
    this.wardSelect = page.getByLabel(/Phường|Xã/i).first();
    this.streetInput = page.getByLabel(/^Đường/i).first();
    this.addressLineInput = page.getByLabel(/Địa chỉ chi tiết|Số nhà|Địa chỉ/i).first();
    this.bedroomInput = page.getByLabel(/Phòng ngủ/i).first();
    this.bathroomInput = page.getByLabel(/Phòng tắm|Nhà vệ sinh/i).first();
    this.contactRoleSelect = page.getByLabel(/Vai trò liên hệ|Người đăng/i).first();
    this.contactNameInput = page.getByLabel(/Họ và tên|Tên liên hệ/i).first();
    this.contactPhoneInput = page.getByLabel(/Số điện thoại/i).first();
    this.contactEmailInput = page.getByLabel(/Email liên hệ|Email/i).first();
    this.imageInput = page
      .getByLabel(/Hình ảnh|Ảnh/i)
      .or(page.locator('input[type="file"][accept*="image"]'))
      .first();
    this.videoInput = page
      .getByLabel(/Video/i)
      .or(page.locator('input[type="file"][accept*="video"]'))
      .first();
    this.submitButton = page.getByRole('button', { name: /^(Đăng tin|Cập nhật)$/i }).first();
    this.imagePreviews = page.locator('[data-listing-image-preview], [data-media-type="image"]');
    this.videoPreviews = page.locator('[data-listing-video-preview], [data-media-type="video"]');
    this.feedbackRegion = page
      .getByRole('status')
      .or(page.getByRole('alert'))
      .filter({
        hasText: /thành công|Chờ duyệt|Đã duyệt|Đang đăng|Đã gỡ/i,
      });
  }

  public async fill(data: ListingData): Promise<void> {
    await this.titleInput.fill(data.title);
    
    // Xử lý Loại giao dịch (Nhu cầu của bạn)
    try {
      const transactionLabel = data.transactionType === 'sale' ? 'Mua bán' : 'Cho thuê';
      await this.page.getByRole('button', { name: transactionLabel, exact: true }).click({ timeout: 1000 });
    } catch {
      await this.transactionTypeSelect.selectOption(data.transactionType);
    }

    // Xử lý Loại bất động sản (Loại nhà đất)
    try {
      await this.page.getByText(/Loại nhà đất/i).locator('xpath=..').getByRole('button').first().click({ timeout: 1000 });
      await this.page.getByText(data.propertyType, { exact: true }).last().click();
    } catch {
      await this.propertyTypeSelect.selectOption({ label: data.propertyType });
    }

    await this.descriptionInput.fill(data.description);
    await this.priceInput.fill(String(data.price));
    await this.setCheckbox(this.negotiableCheckbox, data.negotiable);
    await this.areaInput.fill(String(data.area));
    
    // Tỉnh/Thành phố
    try {
      // Nhấp vào combobox UI thật
      await this.page.getByText(/Tỉnh \/ Thành phố/i).locator('xpath=..').getByRole('combobox').click({ timeout: 1000 });
      await this.page.getByRole('option', { name: data.location.province, exact: true }).click();
    } catch {
      await this.provinceSelect.selectOption({ label: data.location.province });
      await this.provinceSelect.evaluate((el) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    // Phường/Xã
    try {
      await this.page.getByText(/Phường \/ Xã/i).locator('xpath=..').getByRole('combobox').click({ timeout: 1000 });
      await this.page.getByRole('option', { name: data.location.ward, exact: true }).click();
    } catch {
      await this.wardSelect.selectOption({ label: data.location.ward });
      await this.wardSelect.evaluate((el) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    await this.streetInput.fill(data.location.street);
    await this.addressLineInput.fill(data.location.addressLine);
    
    // Xử lý Số phòng ngủ
    try {
      await this.page.getByText(/Số phòng ngủ|Phòng ngủ/i).locator('xpath=..').locator('xpath=following-sibling::*').getByRole('button', { name: String(data.bedrooms), exact: true }).click({ timeout: 1000 });
    } catch {
      await this.bedroomInput.fill(String(data.bedrooms));
    }

    // Xử lý Số phòng tắm/Vệ sinh
    try {
      await this.page.getByText(/Số phòng tắm|Phòng tắm|Nhà vệ sinh/i).locator('xpath=..').locator('xpath=following-sibling::*').getByRole('button', { name: String(data.bathrooms), exact: true }).click({ timeout: 1000 });
    } catch {
      await this.bathroomInput.fill(String(data.bathrooms));
    }

    // Xử lý Vai trò liên hệ (Người đăng)
    try {
      const roleLabel = data.contact.role === 'owner' ? 'Chủ nhà' : 'Môi giới';
      await this.page.getByRole('button', { name: roleLabel, exact: true }).click({ timeout: 1000 });
    } catch {
      await this.contactRoleSelect.selectOption(data.contact.role);
    }
    await this.contactNameInput.fill(data.contact.fullName);
    await this.contactPhoneInput.fill(data.contact.phone);
    await this.contactEmailInput.fill(data.contact.email);
    await this.fillOptionalNumber(/Mặt tiền/i, data.frontage);
    await this.fillOptionalNumber(/Chiều sâu/i, data.depth);
    await this.fillOptionalNumber(/Tầng căn hộ|Tầng số/i, data.floorNumber);
    await this.fillOptionalNumber(/Số tầng/i, data.floors);
    await this.fillOptionalNumber(/Số ban công/i, data.balconies);
    await this.selectOptional(/Hướng nhà/i, data.houseDirection);
    await this.selectOptional(/Hướng ban công/i, data.balconyDirection);
  }

  public async uploadMedia(media: ListingMedia): Promise<void> {
    if (media.imagePaths.length > 0) {
      await FileUploadHelper.uploadMany(this.imageInput, media.imagePaths);
    }
    if (media.videoPath !== undefined) {
      await FileUploadHelper.upload(this.videoInput, media.videoPath);
    }
  }

  public async uploadImages(relativePaths: readonly string[]): Promise<void> {
    await FileUploadHelper.uploadMany(this.imageInput, relativePaths);
  }

  public async removeMedia(fileName: string): Promise<void> {
    const mediaItem = this.page.locator('[data-media-name]').filter({ hasText: fileName }).first();
    await mediaItem.getByRole('button', { name: /Xóa|Gỡ/i }).click();
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async fillField(field: ListingFormField, value: string): Promise<void> {
    await this.fieldLocator(field).fill(value);
  }

  public async fieldError(field: ListingFormField): Promise<string> {
    const explicitError = this.page.locator(`[data-field-error="${field}"]`).first();
    if ((await explicitError.count()) > 0) return (await explicitError.innerText()).trim();
    return (
      await this.fieldLocator(field).locator('xpath=following::*[@role="alert"][1]').innerText()
    ).trim();
  }

  public async mediaError(): Promise<string> {
    const explicitError = this.page.locator('[data-media-error]').first();
    if ((await explicitError.count()) > 0) return (await explicitError.innerText()).trim();
    return (
      await this.page
        .getByRole('alert')
        .filter({ hasText: /ảnh|video|media|định dạng/i })
        .first()
        .innerText()
    ).trim();
  }

  public async currentValues(): Promise<ListingFormSnapshot> {
    return {
      title: await this.titleInput.inputValue(),
      description: await this.descriptionInput.inputValue(),
      price: Number(await this.priceInput.inputValue()),
      area: Number(await this.areaInput.inputValue()),
      contactName: await this.contactNameInput.inputValue(),
      imageCount: await this.mediaCount(this.imagePreviews, this.imageInput),
      hasVideo: (await this.mediaCount(this.videoPreviews, this.videoInput)) > 0,
    };
  }

  public async successMessage(): Promise<string> {
    return (await this.feedbackRegion.first().innerText()).trim();
  }

  public async status(): Promise<ListingStatus> {
    const feedback = await this.successMessage();
    const statuses = Object.values(LISTING_STATUS_LABELS);
    const status = statuses.find((candidate) => feedback.includes(candidate));
    if (status === undefined) throw new Error(`Không hiển thị trạng thái tin đăng: ${feedback}`);
    return status;
  }

  private fieldLocator(field: ListingFormField): Locator {
    const fields: Record<ListingFormField, Locator> = {
      title: this.titleInput,
      description: this.descriptionInput,
      price: this.priceInput,
      area: this.areaInput,
      street: this.streetInput,
      addressLine: this.addressLineInput,
      contactName: this.contactNameInput,
      contactPhone: this.contactPhoneInput,
      contactEmail: this.contactEmailInput,
    };
    return fields[field];
  }

  private async setCheckbox(locator: Locator, checked: boolean): Promise<void> {
    if ((await locator.count()) === 0) return;
    if (checked) await locator.check();
    else await locator.uncheck();
  }

  private async fillOptionalNumber(label: RegExp, value: number | undefined): Promise<void> {
    if (value === undefined) return;
    const locator = this.page.getByLabel(label).first();
    if ((await locator.count()) > 0) await locator.fill(String(value));
  }

  private async selectOptional(label: RegExp, value: string | undefined): Promise<void> {
    if (value === undefined) return;
    const locator = this.page.getByLabel(label).first();
    try {
      if ((await locator.count()) > 0) {
        await locator.selectOption({ label: value }, { timeout: 1000 });
        return;
      }
    } catch {}

    // Fallback cho UI custom (ví dụ: Hướng nhà, Hướng ban công)
    const container = this.page.getByText(label).locator('xpath=..').first();
    if ((await container.count()) > 0) {
      await container.getByRole('button').first().click();
      await this.page.getByText(value, { exact: true }).last().click();
    }
  }

  private async mediaCount(previews: Locator, input: Locator): Promise<number> {
    const previewCount = await previews.count();
    if (previewCount > 0) return previewCount;
    return input.evaluate((element: HTMLInputElement) => element.files?.length ?? 0);
  }
}
