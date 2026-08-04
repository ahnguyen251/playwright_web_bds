import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import type { ProfileUpdate } from '../../types/user.types';
import { BasePage } from '../base/BasePage';

export class ProfilePage extends BasePage {
  private readonly accountInformationButton: Locator;
  private readonly fullNameInput: Locator;
  private readonly phoneInput: Locator;
  private readonly saveButton: Locator;

  public constructor(page: Page) {
    super(page);
    this.accountInformationButton = page.getByRole('button', {
      name: 'Thông tin tài khoản',
      exact: true,
    });
    this.fullNameInput = page.getByLabel('Họ và tên');
    this.phoneInput = page.getByLabel('Số điện thoại');
    this.saveButton = page.getByRole('button', { name: 'Lưu thay đổi', exact: true });
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.profile);
  }

  public async openAccountInformation(): Promise<void> {
    await this.accountInformationButton.click();
  }

  public async updateProfile(profile: ProfileUpdate): Promise<void> {
    await this.fullNameInput.fill(profile.fullName);
    await this.phoneInput.fill(profile.phone);
    await this.saveButton.click();
  }
}
