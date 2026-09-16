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
  private readonly priceLabelElement: Locator;
  private readonly depositSection: Locator;
  private readonly legalSection: Locator;
  private readonly legalDocumentInput: Locator;
  private readonly identityCardFrontInput: Locator;
  private readonly identityCardBackInput: Locator;
  private readonly identityCardFrontPreview: Locator;
  private readonly identityCardBackPreview: Locator;
  private readonly legalDocumentPreviews: Locator;
  private readonly verificationError: Locator;
  private readonly publicInfoAgreedCheckbox: Locator;
  private readonly submitVerificationButton: Locator;

  public constructor(private readonly page: Page) {
    this.titleInput = page.getByLabel(/Tên bất động sản|Tiêu đề/i).first();
    this.transactionTypeSelect = page.getByLabel(/Loại giao dịch/i).first();
    this.propertyTypeSelect = page.getByLabel(/Loại (bất động sản|hình bất động sản)/i).first();
    this.descriptionInput = page.getByLabel(/Mô tả/i).or(page.getByPlaceholder(/giới thiệu các đặc điểm/i)).first();
    this.priceInput = page.getByLabel(/^Giá/i).or(page.locator('label').filter({ hasText: /^Giá/i }).locator('input')).first();
    this.priceLabelElement = page.locator('label').filter({ hasText: /^Giá/i }).first();
    this.depositSection = page.getByText(/Đặt cọc|Tiền cọc/i).first();
    this.legalSection = page.getByText(/Giấy tờ pháp lý|Pháp lý/i).first();
    this.negotiableCheckbox = page.getByLabel(/Giá Thương lượng|Thương lượng|Thỏa thuận/i).or(page.getByRole('checkbox', { name: /thương lượng/i })).first();
    this.areaInput = page.getByLabel(/Diện tích/i).or(page.locator('label').filter({ hasText: /Diện tích/i }).locator('input')).first();
    this.provinceSelect = page.getByLabel(/Tỉnh|Thành phố/i).first();
    this.wardSelect = page.getByLabel(/Phường|Xã/i).first();
    this.streetInput = page.getByLabel(/^Đường/i).first();
    this.addressLineInput = page.getByLabel(/Địa chỉ chi tiết|Số nhà|Địa chỉ/i).first();
    this.bedroomInput = page.getByLabel(/Phòng ngủ/i).first();
    this.bathroomInput = page.getByLabel(/Phòng tắm|Nhà vệ sinh/i).first();
    this.contactRoleSelect = page.getByLabel(/Vai trò liên hệ|Người đăng/i).first();
    this.contactNameInput = page.getByLabel(/Họ và tên|Tên liên hệ/i).first();
    this.contactPhoneInput = page
      .getByLabel(/Số điện thoại/i)
      .or(page.getByPlaceholder(/0912345678/i))
      .first();
    this.contactEmailInput = page.getByLabel(/Email liên hệ|Email/i).first();
    this.imageInput = page
      .getByLabel(/Hình ảnh|Ảnh/i)
      .or(page.locator('input[type="file"][accept*="image"]'))
      .first();
    this.videoInput = page
      .getByLabel(/Video/i)
      .or(page.locator('input[type="file"][accept*="video"]'))
      .first();
    this.legalDocumentInput = page
      .locator('label')
      .filter({ hasText: /Tải lên ảnh chụp rõ nét các mặt của giấy tờ pháp lý/i })
      .locator('input[type="file"]')
      .first();
    this.submitButton = page
      .locator('form button[type="submit"], button[type="submit"]')
      .or(page.getByRole('button', { name: /^(Đăng tin|Cập nhật)$/i }))
      .last();
    this.imagePreviews = page.locator('[data-listing-image-preview], [data-media-type="image"]');
    this.videoPreviews = page.locator('[data-listing-video-preview], [data-media-type="video"]');
    this.feedbackRegion = page
      .getByRole('status')
      .or(page.getByRole('alert'))
      .filter({
        hasText: /thành công|Chờ duyệt|Đã duyệt|Đang đăng|Đã gỡ/i,
      });
    this.identityCardFrontInput = page
      .locator('label')
      .filter({ hasText: /Mặt trước/i })
      .locator('input[type="file"]')
      .first();
    this.identityCardBackInput = page
      .locator('label')
      .filter({ hasText: /Mặt sau/i })
      .locator('input[type="file"]')
      .first();
    this.identityCardFrontPreview = page.locator('img[alt="CCCD mặt trước"]').first();
    this.identityCardBackPreview = page.locator('img[alt="CCCD mặt sau"]').first();
    this.legalDocumentPreviews = page.locator('figure.preview-card');
    this.verificationError = page
      .locator('.field-error, [data-verification-error]')
      .or(page.locator('section.rounded-xl.text-red-700'))
      .first();
    this.publicInfoAgreedCheckbox = page
      .locator('.public-info-box input[type="checkbox"]')
      .or(page.getByRole('checkbox', { name: /Công khai thông tin/i }))
      .first();
    this.submitVerificationButton = page
      .getByRole('button', { name: /^(Lưu xác thực|Đăng lại tin)$/i })
      .or(page.locator('form button[type="submit"]'))
      .last();
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

  public async waitForReady(): Promise<void> {
    await this.titleInput.waitFor({ state: 'visible', timeout: 15000 });
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

    const inlineParagraph = this.fieldLocator(field)
      .locator(
        'xpath=following-sibling::p[contains(@class, "text-red") or contains(@class, "error")] | following-sibling::p | parent::*/following-sibling::p[contains(@class, "text-red") or contains(@class, "error")] | parent::*/following-sibling::p',
      )
      .first();
    if ((await inlineParagraph.count()) > 0) {
      const text = (await inlineParagraph.innerText()).trim();
      if (text) return text;
    }

    const alertElement = this.fieldLocator(field)
      .locator('xpath=following-sibling::*[@role="alert"] | parent::*//*[@role="alert"]')
      .first();
    if ((await alertElement.count()) > 0) {
      return (await alertElement.innerText()).trim();
    }

    return '';
  }

  public async fillContactPhone(phone: string): Promise<void> {
    await this.contactPhoneInput.fill(phone);
  }

  public async blurContactPhone(): Promise<void> {
    await this.contactPhoneInput.blur();
  }

  public async contactPhoneError(): Promise<string> {
    return this.fieldError('contactPhone');
  }

  public async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  public async blurTitle(): Promise<void> {
    await this.titleInput.blur();
  }

  public async titleError(): Promise<string> {
    return this.fieldError('title');
  }

  public async titleValue(): Promise<string> {
    return this.titleInput.inputValue();
  }

  public async titleCounterText(): Promise<string> {
    const counter = this.titleInput
      .locator('xpath=following-sibling::p[contains(text(), "ký tự")] | parent::*/following-sibling::p[contains(text(), "ký tự")]')
      .first();
    if ((await counter.count()) > 0) return (await counter.innerText()).trim();
    return '';
  }

  public async fillContactName(name: string): Promise<void> {
    await this.contactNameInput.fill(name);
  }

  public async blurContactName(): Promise<void> {
    await this.contactNameInput.blur();
  }

  public async contactNameValue(): Promise<string> {
    return this.contactNameInput.inputValue();
  }

  public async propertyTypeError(): Promise<string> {
    const explicitError = this.page.locator('[data-field-error="propertyType"]').first();
    if ((await explicitError.count()) > 0) return (await explicitError.innerText()).trim();

    const label = this.page.locator('text=Loại nhà đất, text=Loại bất động sản').first();
    if ((await label.count()) > 0) {
      const container = label.locator('xpath=..');
      const errorEl = container
        .locator('xpath=following-sibling::p[contains(@class, "text-red")] | .//p[contains(@class, "text-red")]')
        .first();
      if ((await errorEl.count()) > 0) {
        const text = (await errorEl.innerText()).trim();
        if (text) return text;
      }
    }

    const alert = this.propertyTypeSelect
      .locator('xpath=following-sibling::*[@role="alert"] | parent::*//*[@role="alert"]')
      .first();
    if ((await alert.count()) > 0) return (await alert.innerText()).trim();

    return '';
  }

  public async selectTransactionType(type: 'sale' | 'rent'): Promise<void> {
    const label = type === 'sale' ? 'Mua bán' : 'Cho thuê';
    const button = this.page.getByRole('button', { name: label, exact: true }).first();
    if ((await button.count()) > 0) {
      await button.click();
      return;
    }
    await this.transactionTypeSelect.selectOption(type);
  }

  public async priceLabel(): Promise<string> {
    return (await this.priceLabelElement.innerText()).trim();
  }

  public async isDepositVisible(): Promise<boolean> {
    const count = await this.depositSection.count();
    return count > 0 && (await this.depositSection.isVisible());
  }

  private get depositContainer(): Locator {
    return this.page.locator('p.field-label').filter({ hasText: /^Đặt cọc/i }).locator('xpath=..');
  }

  public async depositOptions(): Promise<string[]> {
    const buttons = this.depositContainer.getByRole('button');
    const count = await buttons.count();
    const options: string[] = [];
    for (let i = 0; i < count; i++) {
      options.push((await buttons.nth(i).innerText()).trim());
    }
    return options;
  }

  public async isDepositRequired(): Promise<boolean> {
    const label = this.page.locator('p.field-label').filter({ hasText: /^Đặt cọc/i }).first();
    if ((await label.count()) === 0) return false;
    const className = (await label.getAttribute('class')) ?? '';
    const text = (await label.innerText()).trim();
    return className.includes('required') || text.includes('*');
  }

  public async selectDepositOption(option: string): Promise<void> {
    await this.depositContainer.getByRole('button', { name: option, exact: true }).click();
  }

  public async selectedDepositOption(): Promise<string> {
    const activeBtn = this.depositContainer.locator('button.text-sky-700, button.border-sky-300');
    return (await activeBtn.count()) > 0 ? (await activeBtn.first().innerText()).trim() : '';
  }

  public async depositError(): Promise<string> {
    const errorEl = this.page.locator('p.field-error').filter({ hasText: /cọc/i });
    return (await errorEl.count()) > 0 ? (await errorEl.first().innerText()).trim() : '';
  }

  public async isLegalVisible(): Promise<boolean> {
    const count = await this.legalSection.count();
    return count > 0 && (await this.legalSection.isVisible());
  }

  public async fillDescription(desc: string): Promise<void> {
    await this.descriptionInput.fill(desc);
  }

  public async blurDescription(): Promise<void> {
    await this.descriptionInput.blur();
  }

  public async descriptionError(): Promise<string> {
    return this.fieldError('description');
  }

  public async fillArea(area: string): Promise<void> {
    await this.areaInput.fill(area);
  }

  public async blurArea(): Promise<void> {
    await this.areaInput.blur();
  }

  public async areaError(): Promise<string> {
    return this.fieldError('area');
  }

  public async fillPrice(price: string): Promise<void> {
    await this.priceInput.fill(price);
  }

  public async blurPrice(): Promise<void> {
    await this.priceInput.blur();
  }

  public async priceError(): Promise<string> {
    const container = this.page.locator('.price-field, [class*="price"]').first();
    if ((await container.count()) > 0) {
      const errorEl = container.locator('p.field-error, p[class*="error"], p[class*="text-red"]').first();
      if ((await errorEl.count()) > 0) {
        const text = (await errorEl.innerText()).trim();
        if (text) return text;
      }
    }
    return this.fieldError('price');
  }

  public async priceValue(): Promise<string> {
    return this.priceInput.inputValue();
  }

  public async isPriceDisabled(): Promise<boolean> {
    return this.priceInput.isDisabled();
  }

  public async toggleNegotiable(checked: boolean): Promise<void> {
    if (checked) {
      if (!(await this.negotiableCheckbox.isChecked())) await this.negotiableCheckbox.check();
    } else {
      if (await this.negotiableCheckbox.isChecked()) await this.negotiableCheckbox.uncheck();
    }
  }

  public async isNegotiableChecked(): Promise<boolean> {
    return this.negotiableCheckbox.isChecked();
  }

  public async isNegotiableDisabled(): Promise<boolean> {
    return this.negotiableCheckbox.isDisabled();
  }

  public async fillBedrooms(value: string): Promise<void> {
    const customInput = this.page
      .getByText(/Số phòng ngủ/i)
      .locator('xpath=ancestor::div[1]//input[@placeholder="Nhập số" or contains(@class, "quick-input")]')
      .first();
    await customInput.fill(value);
  }

  public async bedroomsValue(): Promise<string> {
    const customInput = this.page
      .getByText(/Số phòng ngủ/i)
      .locator('xpath=ancestor::div[1]//input[@placeholder="Nhập số" or contains(@class, "quick-input")]')
      .first();
    return customInput.inputValue();
  }

  public async fillBathrooms(value: string): Promise<void> {
    const customInput = this.page
      .getByText(/Số phòng tắm/i)
      .locator('xpath=ancestor::div[1]//input[@placeholder="Nhập số" or contains(@class, "quick-input")]')
      .first();
    await customInput.fill(value);
  }

  public async bathroomsValue(): Promise<string> {
    const customInput = this.page
      .getByText(/Số phòng tắm/i)
      .locator('xpath=ancestor::div[1]//input[@placeholder="Nhập số" or contains(@class, "quick-input")]')
      .first();
    return customInput.inputValue();
  }

  public async toastMessage(): Promise<string> {
    const toast = this.page.locator('.toast-item').last();
    if ((await toast.count()) > 0) return (await toast.innerText()).trim();
    return '';
  }

  public async imageSectionError(): Promise<string> {
    const errorEl = this.page
      .locator('main')
      .locator('section, div')
      .filter({ hasText: /Hình ảnh, Video|Tải ảnh và video/i })
      .locator('p.field-error, .field-error, p.text-red-500, p[class*="text-red"]')
      .first();
    if ((await errorEl.count()) > 0) return (await errorEl.innerText()).trim();
    return '';
  }

  public async legalSectionError(): Promise<string> {
    const errorEl = this.page
      .locator('p.field-error')
      .filter({ hasText: /giấy tờ|tối đa 5|vượt quá/i })
      .first();
    if ((await errorEl.count()) > 0) return (await errorEl.innerText()).trim();

    return '';
  }

  public async uploadImageBuffers(files: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.imageInput.setInputFiles(files);
  }

  public async uploadLegalDocumentBuffers(files: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.legalDocumentInput.setInputFiles(files);
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

  public async uploadIdentityCardFront(
    file: string | { name: string; mimeType: string; buffer: Buffer },
  ): Promise<void> {
    await this.identityCardFrontInput.waitFor({ state: 'attached' });
    if (typeof file === 'string') {
      await FileUploadHelper.upload(this.identityCardFrontInput, file);
    } else {
      await this.identityCardFrontInput.setInputFiles(file);
    }
  }

  public async uploadIdentityCardBack(
    file: string | { name: string; mimeType: string; buffer: Buffer },
  ): Promise<void> {
    await this.identityCardBackInput.waitFor({ state: 'attached' });
    if (typeof file === 'string') {
      await FileUploadHelper.upload(this.identityCardBackInput, file);
    } else {
      await this.identityCardBackInput.setInputFiles(file);
    }
  }

  public async uploadLegalDocuments(
    files: readonly (string | { name: string; mimeType: string; buffer: Buffer })[],
  ): Promise<void> {
    if (files.length === 0) return;
    await this.legalDocumentInput.waitFor({ state: 'attached' });
    const stringPaths = files.filter((f): f is string => typeof f === 'string');
    const bufferFiles = files.filter(
      (f): f is { name: string; mimeType: string; buffer: Buffer } => typeof f !== 'string',
    );
    if (stringPaths.length > 0) {
      await FileUploadHelper.uploadMany(this.legalDocumentInput, stringPaths);
    }
    if (bufferFiles.length > 0) {
      await this.legalDocumentInput.setInputFiles(bufferFiles);
    }
  }

  public async waitForVerificationReady(): Promise<void> {
    await this.submitVerificationButton.waitFor({ state: 'visible' });
    await this.identityCardFrontInput.waitFor({ state: 'attached' });
    await this.identityCardBackInput.waitFor({ state: 'attached' });
    await this.legalDocumentInput.waitFor({ state: 'attached' });
  }

  public async isIdentityCardFrontUploaded(): Promise<boolean> {
    const removeBtn = this.page.locator('button[aria-label*="CCCD mặt trước"], button[title*="CCCD mặt trước"]');
    return (
      (await removeBtn.count()) > 0 ||
      (await this.identityCardFrontPreview.count()) > 0
    );
  }

  public async isIdentityCardBackUploaded(): Promise<boolean> {
    const removeBtn = this.page.locator('button[aria-label*="CCCD mặt sau"], button[title*="CCCD mặt sau"]');
    return (
      (await removeBtn.count()) > 0 ||
      (await this.identityCardBackPreview.count()) > 0
    );
  }

  public async legalDocumentsCount(): Promise<number> {
    return this.legalDocumentPreviews.count();
  }

  public async verificationErrorMessage(): Promise<string> {
    if (
      (await this.verificationError.count()) > 0 &&
      (await this.verificationError.isVisible())
    ) {
      return (await this.verificationError.innerText()).trim();
    }
    const toast = this.page
      .locator('.toast-item, [role="alert"]')
      .filter({ hasText: /xác thực|CCCD|giấy tờ|định dạng|dung lượng|hợp lệ/i })
      .first();
    if ((await toast.count()) > 0 && (await toast.isVisible())) {
      return (await toast.innerText()).trim();
    }
    return '';
  }

  public async setPublicInfoAgreed(agreed: boolean): Promise<void> {
    await this.setCheckbox(this.publicInfoAgreedCheckbox, agreed);
  }

  public async submitVerification(): Promise<void> {
    await this.submitVerificationButton.click();
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
    if ((await this.feedbackRegion.count()) > 0 && (await this.feedbackRegion.first().isVisible())) {
      return (await this.feedbackRegion.first().innerText()).trim();
    }
    const toast = this.page.locator('.toast-item.toast-success, .toast-item').first();
    if ((await toast.count()) > 0 && (await toast.isVisible())) {
      return (await toast.innerText()).trim();
    }
    return '';
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
    } catch {
      // Fallback below
    }

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
