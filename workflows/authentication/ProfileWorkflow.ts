import type { ChangePasswordComponent } from '../../pages/components/ChangePasswordComponent';
import type { ProfileFormComponent } from '../../pages/components/ProfileFormComponent';
import type { PasswordChangeData } from '../../types/user.types';

type ProfileFormPort = Pick<
  ProfileFormComponent,
  'read' | 'startEditing' | 'updateFullName' | 'save'
>;
type ChangePasswordPort = Pick<ChangePasswordComponent, 'open' | 'fill' | 'submit'>;

interface ProfilePagePort {
  open(): Promise<void>;
  openAccountInformation(): Promise<void>;
  profile(): ProfileFormPort;
  changePassword(): ChangePasswordPort;
}

export class ProfileWorkflow {
  public constructor(private readonly profilePage: ProfilePagePort) {}

  public async updateFullName(fullName: string): Promise<void> {
    await this.profilePage.open();
    await this.profilePage.openAccountInformation();

    const profileForm = this.profilePage.profile();
    const currentProfile = await profileForm.read();

    if (currentProfile.fullName === fullName) {
      return;
    }

    await profileForm.startEditing();
    await profileForm.updateFullName(fullName);
    await profileForm.save();
  }

  public async changePassword(data: PasswordChangeData): Promise<void> {
    await this.profilePage.open();

    const changePasswordForm = this.profilePage.changePassword();
    await changePasswordForm.open();
    await changePasswordForm.fill(data);
    await changePasswordForm.submit();
  }
}
