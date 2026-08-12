export interface OtpQuery {
  readonly email: string;
  readonly requestedAfter: Date;
  readonly purpose?: 'registration' | 'passwordRecovery';
}

export interface OtpProvider {
  getOtp(query: OtpQuery): Promise<string>;
}

export type RegistrationCorrelation = OtpQuery;

export interface GmailOtpConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly otpPattern: string;
  readonly subject: string;
  readonly sender?: string;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface ProductionRegistrationConfig {
  readonly fullName: string;
  readonly emailTemplate: string;
  readonly password: string;
}
