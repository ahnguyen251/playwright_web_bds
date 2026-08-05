import type { Locator, Page } from '@playwright/test';

import { ROUTES } from '../../constants/routes';
import { BasePage } from '../base/BasePage';
import { ChangePasswordComponent } from '../components/ChangePasswordComponent';
import { ProfileFormComponent } from '../components/ProfileFormComponent';

export class ProfilePage extends BasePage {
  private readonly accountInformationButton: Locator;
  private readonly profileForm: ProfileFormComponent;
  private readonly changePasswordForm: ChangePasswordComponent;

  public constructor(page: Page) {
    super(page);
    this.accountInformationButton = page.getByRole('button', {
      name: 'Thông tin tài khoản',
      exact: true,
    });
    this.profileForm = new ProfileFormComponent(page);
    this.changePasswordForm = new ChangePasswordComponent(page);
  }

  public async open(): Promise<void> {
    await this.navigate(ROUTES.profile);
  }

  public async openAccountInformation(): Promise<void> {
    await this.accountInformationButton.click();
  }

  public profile(): ProfileFormComponent {
    return this.profileForm;
  }

  public changePassword(): ChangePasswordComponent {
    return this.changePasswordForm;
  }
}
