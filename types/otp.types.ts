export interface OtpQuery {
  readonly email: string;
  readonly requestedAfter: Date;
}

export interface OtpProvider {
  getOtp(query: OtpQuery): Promise<string>;
}

export type RegistrationCorrelation = OtpQuery;

export interface GmailOtpConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly otpPattern: RegExp;
  readonly sender?: string;
  readonly subject?: string;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface ProductionRegistrationConfig {
  readonly fullName: string;
  readonly emailTemplate: string;
  readonly password: string;
  readonly gmail: GmailOtpConfig;
}
