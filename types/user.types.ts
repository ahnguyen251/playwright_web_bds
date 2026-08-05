export type UserAlias = 'defaultUser' | 'secondaryUser' | 'mutatingUser';

export interface UserRecord {
  readonly alias: UserAlias;
  readonly displayName: string;
  readonly emailEnvironmentKey: string;
  readonly passwordEnvironmentKey: string;
}

export interface UserCredentials {
  readonly alias: UserAlias;
  readonly email: string;
  readonly password: string;
}

export interface RegistrationData {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
}

export interface ProfileUpdate {
  readonly fullName: string;
}

export interface PasswordChangeData {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly passwordConfirmation: string;
}

export interface PasswordResetData {
  readonly email: string;
  readonly newPassword: string;
  readonly passwordConfirmation: string;
}
