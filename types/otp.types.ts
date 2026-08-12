export type OtpPurpose = 'registration' | 'passwordRecovery';

export interface OtpQuery {
  readonly recipient: string;
  readonly purpose: OtpPurpose;
  readonly requestedAfter: Date;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}

export interface OtpProvider {
  waitForOtp(query: OtpQuery): Promise<string>;
}
