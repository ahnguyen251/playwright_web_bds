import type { Locator, Page } from '@playwright/test';

import type { PasswordChangeData } from '../../types/user.types';

const VALIDATION_MESSAGES = Object.freeze([
  'Mật khẩu mới phải có ít nhất 8 ký tự.',
  'Mật khẩu phải chứa chữ hoa, chữ thường và chữ số.',
  'Xác nhận mật khẩu mới không khớp.',
]);

export class ChangePasswordComponent {
  private readonly openButton: Locator;
  private readonly currentPasswordInput: Locator;
  private readonly newPasswordInput: Locator;
  private readonly passwordConfirmationInput: Locator;
  private readonly submitButton: Locator;
  private readonly cancelButton: Locator;
  private readonly currentPasswordErrorLocator: Locator;
  private readonly validationMessageLocators: readonly Locator[];

  public constructor(page: Page) {
    const profileView = page.getByRole('main');

    this.openButton = profileView.getByRole('button', {
      name: 'Đổi mật khẩu',
      exact: true,
    });
    this.currentPasswordInput = profileView.getByPlaceholder('Nhập mật khẩu hiện tại', {
      exact: true,
    });
    this.newPasswordInput = profileView.getByPlaceholder('Nhập mật khẩu mới', { exact: true });
    this.passwordConfirmationInput = profileView.getByPlaceholder('Nhập lại mật khẩu mới', {
      exact: true,
    });
    this.submitButton = profileView.getByRole('button', {
      name: 'Cập nhật mật khẩu',
      exact: true,
    });
    this.cancelButton = profileView.getByRole('button', { name: 'Hủy', exact: true });
    this.currentPasswordErrorLocator = profileView.getByText('Mật khẩu hiện tại không chính xác', {
      exact: true,
    });
    this.validationMessageLocators = VALIDATION_MESSAGES.map((message) =>
      profileView.getByText(message, { exact: true }),
    );
  }

  public async open(): Promise<void> {
    await this.openButton.click();
  }

  public async fill(data: PasswordChangeData): Promise<void> {
    await this.currentPasswordInput.fill(data.currentPassword);
    await this.newPasswordInput.fill(data.newPassword);
    await this.passwordConfirmationInput.fill(data.passwordConfirmation);
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  public async validationMessages(): Promise<readonly string[]> {
    const messages = await Promise.all(
      this.validationMessageLocators.map(async (locator) =>
        (await locator.isVisible()) ? (await locator.innerText()).trim() : undefined,
      ),
    );

    return messages.filter((message): message is string => message !== undefined);
  }

  public async isSubmitEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled();
  }

  public async currentPasswordError(): Promise<string | undefined> {
    return (await this.currentPasswordErrorLocator.isVisible())
      ? (await this.currentPasswordErrorLocator.innerText()).trim()
      : undefined;
  }

  public async matches(data: PasswordChangeData): Promise<boolean> {
    const [currentPassword, newPassword, passwordConfirmation] = await Promise.all([
      this.currentPasswordInput.inputValue(),
      this.newPasswordInput.inputValue(),
      this.passwordConfirmationInput.inputValue(),
    ]);
    return (
      currentPassword === data.currentPassword &&
      newPassword === data.newPassword &&
      passwordConfirmation === data.passwordConfirmation
    );
  }
}
