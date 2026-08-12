export type TestEnvironment = 'dev' | 'staging' | 'production';

export interface GmailConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly mailboxAddress: string;
  readonly otpSender: string;
  readonly otpSubject: string;
  readonly otpPattern: string;
}

export interface MutatingUserConfig {
  readonly email: string;
  readonly baselinePassword: string;
  readonly baselineName: string;
}

export interface EnvironmentConfig {
  readonly environment: TestEnvironment;
  readonly baseUrl: string;
  readonly apiBaseUrl?: string;
  readonly defaultUserEmail: string;
  readonly defaultUserPassword: string;
  readonly ci: boolean;
  readonly runOtpE2e: boolean;
  readonly runMutatingE2e: boolean;
  readonly runProductionRegistrationE2e: boolean;
  readonly runProductionMutatingE2e: boolean;
  readonly gmail?: GmailConfig;
  readonly mutatingUser?: MutatingUserConfig;
  readonly otpPollIntervalMs: number;
  readonly otpTimeoutMs: number;
  readonly allowMutatingE2E: boolean;
}
