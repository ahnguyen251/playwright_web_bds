export type UserAlias = 'defaultUser' | 'secondaryUser';

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
  readonly phone: string;
  readonly password: string;
}

export interface ProfileUpdate {
  readonly fullName: string;
  readonly phone: string;
}
