import type { Locator, Page } from '@playwright/test';

export interface AvatarFilePayload {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

export interface ProfileFormData {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}

const avatarFileExtension = (mimeType: string): string => {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
};

const dataUrlAvatar = (source: string): { readonly buffer: Buffer; readonly mimeType: string } => {
  const separatorIndex = source.indexOf(',');
  if (!source.startsWith('data:') || separatorIndex < 0) {
    throw new Error('Nguồn avatar Profile không phải data URL hợp lệ.');
  }

  const metadata = source.slice('data:'.length, separatorIndex).split(';');
  const mimeType = metadata[0] ?? '';
  if (!mimeType.startsWith('image/')) {
    throw new Error('Nguồn avatar Profile không phải hình ảnh.');
  }

  const encodedBody = source.slice(separatorIndex + 1);
  return {
    buffer: metadata.includes('base64')
      ? Buffer.from(encodedBody, 'base64')
      : Buffer.from(decodeURIComponent(encodedBody)),
    mimeType,
  };
};

export class ProfileFormComponent {
  private readonly avatarImage: Locator;
  private readonly avatarInput: Locator;
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly editButton: Locator;
  private readonly cancelButton: Locator;
  private readonly saveButton: Locator;
  private readonly activeBadge: Locator;
  private readonly noChangesFeedback: Locator;
  private readonly successFeedback: Locator;

  public constructor(private readonly page: Page) {
    const profileView = page.getByRole('main');

    this.avatarImage = profileView.getByRole('img', { name: 'Avatar', exact: true });
    this.avatarInput = profileView.locator('input[type="file"][accept*=".png"]');
    this.fullNameInput = profileView.getByRole('textbox', {
      name: 'Họ và tên',
      exact: true,
    });
    this.emailInput = profileView.getByRole('textbox', { name: 'Email*', exact: true });
    this.phoneInput = profileView.getByRole('textbox', {
      name: 'Số điện thoại',
      exact: true,
    });
    this.editButton = profileView.getByRole('button', { name: 'Chỉnh sửa', exact: true });
    this.cancelButton = profileView.getByRole('button', { name: 'Hủy', exact: true });
    this.saveButton = profileView.getByRole('button', {
      name: 'Lưu thay đổi',
      exact: true,
    });
    this.activeBadge = profileView.getByText('Active', { exact: true });
    this.noChangesFeedback = profileView.getByText('Không có thay đổi dữ liệu', {
      exact: true,
    });
    this.successFeedback = profileView.getByText('Cập nhật thông tin thành công', {
      exact: true,
    });
  }

  public async read(): Promise<ProfileFormData> {
    const [fullName, email, phone] = await Promise.all([
      this.fullNameInput.inputValue(),
      this.emailInput.inputValue(),
      this.phoneInput.inputValue(),
    ]);

    return { fullName, email, phone };
  }

  public async startEditing(): Promise<void> {
    await this.editButton.click();
  }

  public async updateFullName(fullName: string): Promise<void> {
    await this.fullNameInput.selectText();
    await this.page.keyboard.insertText(fullName);
  }

  public async pasteFullName(fullName: string): Promise<void> {
    await this.fullNameInput.selectText();
    await this.fullNameInput.evaluate((input: HTMLInputElement, value) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', value);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });

      if (input.dispatchEvent(pasteEvent)) {
        const maximumLength = input.maxLength;
        input.value = maximumLength >= 0 ? value.slice(0, maximumLength) : value;
        input.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            inputType: 'insertFromPaste',
            data: value,
          }),
        );
      }
    }, fullName);
  }

  public async uploadAvatar(avatar: string | AvatarFilePayload): Promise<void> {
    await this.avatarInput.setInputFiles(avatar);
  }

  public async save(): Promise<void> {
    await this.saveButton.click();
  }

  public async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  public async isEmailDisabled(): Promise<boolean> {
    return this.emailInput.isDisabled();
  }

  public async isPhoneDisabled(): Promise<boolean> {
    return this.phoneInput.isDisabled();
  }

  public async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  public async hasAvatar(): Promise<boolean> {
    if (!(await this.avatarImage.isVisible())) return false;
    const source = await this.avatarImage.getAttribute('src');
    return source !== null && source.trim() !== '';
  }

  public async avatarSource(): Promise<string> {
    return (await this.avatarImage.getAttribute('src')) ?? '';
  }

  public async isActiveBadgeVisible(): Promise<boolean> {
    return this.activeBadge.isVisible();
  }

  public async fullNameMaximumLength(): Promise<number> {
    return this.fullNameInput.evaluate((input: HTMLInputElement) => input.maxLength);
  }

  public async noChangesMessage(): Promise<string | undefined> {
    return (await this.noChangesFeedback.isVisible())
      ? (await this.noChangesFeedback.innerText()).trim()
      : undefined;
  }

  public async successMessage(): Promise<string | undefined> {
    return (await this.successFeedback.isVisible())
      ? (await this.successFeedback.innerText()).trim()
      : undefined;
  }

  public async captureAvatarBaseline(): Promise<AvatarFilePayload> {
    const source = await this.avatarSource();
    if (source === '') throw new Error('Không thể ghi nhận baseline khi thiếu avatar Profile.');

    let asset: { readonly buffer: Buffer; readonly mimeType: string };
    if (source.startsWith('data:')) {
      asset = dataUrlAvatar(source);
    } else {
      const response = await this.page.request.get(new URL(source, this.page.url()).toString());
      if (!response.ok()) throw new Error('Không thể tải avatar Profile hiện tại để làm baseline.');
      const mimeType = response.headers()['content-type']?.split(';')[0] ?? '';
      if (!mimeType.startsWith('image/')) {
        throw new Error('Current Profile avatar response is not an image.');
      }
      asset = {
        buffer: await response.body(),
        mimeType,
      };
    }

    return Object.freeze({
      name: `profile-avatar-baseline.${avatarFileExtension(asset.mimeType)}`,
      mimeType: asset.mimeType,
      buffer: asset.buffer,
    });
  }
}
