import type { ChangePasswordComponent } from '../../pages/components/ChangePasswordComponent';
import type {
  AvatarFilePayload,
  ProfileFormComponent,
} from '../../pages/components/ProfileFormComponent';
import type { PasswordChangeData } from '../../types/user.types';

type ProfileFormPort = Pick<
  ProfileFormComponent,
  'read' | 'startEditing' | 'updateFullName' | 'uploadAvatar' | 'captureAvatarBaseline' | 'save'
>;
type ChangePasswordPort = Pick<ChangePasswordComponent, 'open' | 'fill' | 'submit'>;

interface ProfilePagePort {
  open(): Promise<void>;
  openAccountInformation(): Promise<void>;
  profile(): ProfileFormPort;
  changePassword(): ChangePasswordPort;
}

export interface ProfileUpdateData {
  readonly fullName: string;
  readonly avatar?: string | AvatarFilePayload;
}

export class ProfileWorkflow {
  public constructor(private readonly profilePage: ProfilePagePort) {}

  public async updateFullName(fullName: string): Promise<void> {
    await this.updateProfile({ fullName });
  }

  public async updateProfile(data: ProfileUpdateData): Promise<void> {
    await this.profilePage.open();
    await this.profilePage.openAccountInformation();

    const profileForm = this.profilePage.profile();
    const currentProfile = await profileForm.read();

    if (currentProfile.fullName === data.fullName && data.avatar === undefined) {
      return;
    }

    await profileForm.startEditing();
    if (currentProfile.fullName !== data.fullName) {
      await profileForm.updateFullName(data.fullName);
    }
    if (data.avatar !== undefined) {
      await profileForm.uploadAvatar(data.avatar);
    }
    await profileForm.save();
  }

  public async captureAvatarBaseline(): Promise<AvatarFilePayload> {
    await this.profilePage.open();
    await this.profilePage.openAccountInformation();
    return this.profilePage.profile().captureAvatarBaseline();
  }

  public async changePassword(data: PasswordChangeData): Promise<void> {
    await this.profilePage.open();

    const changePasswordForm = this.profilePage.changePassword();
    await changePasswordForm.open();
    await changePasswordForm.fill(data);
    await changePasswordForm.submit();
  }
}
