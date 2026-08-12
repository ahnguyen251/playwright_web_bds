import type { Locator, Page } from '@playwright/test';

export interface ProfileFormData {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}

export class ProfileFormComponent {
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly editButton: Locator;
  private readonly cancelButton: Locator;
  private readonly saveButton: Locator;

  public constructor(page: Page) {
    const profileView = page.getByRole('main');

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
    await this.fullNameInput.fill(fullName);
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
}
