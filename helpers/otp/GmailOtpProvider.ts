import type { GmailOtpConfig, OtpProvider, OtpQuery } from '../../types/otp.types';
import type { GmailClient } from './GmailApiClient';
import { GmailMessageParser, type ParsedGmailMessage } from './GmailMessageParser';

export interface PollingClock {
  now(): number;
  sleep(milliseconds: number): Promise<void>;
}

const systemClock: PollingClock = {
  now: () => Date.now(),
  sleep: (milliseconds) =>
    new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    }),
};

const maskEmail = (email: string): string => {
  const separatorIndex = email.lastIndexOf('@');
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) return '***';
  return `${email.charAt(0)}***${email.slice(separatorIndex)}`;
};

const quoteSearchValue = (value: string): string => `"${value.replace(/["\\]/g, '\\$&')}"`;

const normalizeAddress = (value: string): string => value.trim().toLowerCase();

const extractAddresses = (header: string | undefined): string[] => {
  if (header === undefined) return [];

  return header
    .split(',')
    .map((part) => /<([^<>]+)>/.exec(part)?.[1] ?? part)
    .map(normalizeAddress)
    .filter((address) => /^[^\s@<>]+@[^\s@<>]+$/.test(address));
};

const hasExactAddress = (header: string | undefined, expected: string): boolean =>
  extractAddresses(header).includes(normalizeAddress(expected));

export class GmailOtpProvider implements OtpProvider {
  public constructor(
    private readonly client: GmailClient,
    private readonly config: GmailOtpConfig,
    private readonly clock: PollingClock = systemClock,
  ) {}

  public async getOtp(query: OtpQuery): Promise<string> {
    const deadline = this.clock.now() + this.config.timeoutMs;

    while (this.clock.now() < deadline) {
      const messages = await this.loadCandidates(query);
      const matching = messages
        .filter((candidate) => candidate.internalDate > query.requestedAfter.getTime())
        .filter((candidate) => this.matchesCorrelation(candidate, query))
        .sort((left, right) => right.internalDate - left.internalDate);

      const newest = matching[0];
      if (newest !== undefined) {
        const otp = GmailMessageParser.extractOtp(newest.body, this.config.otpPattern);
        if (otp === undefined) {
          throw new Error('Matching OTP email found but OTP contract did not match.');
        }
        return otp;
      }

      await this.clock.sleep(
        Math.min(this.config.pollIntervalMs, Math.max(0, deadline - this.clock.now())),
      );
    }

    throw new Error(`OTP email was not received before timeout for ${maskEmail(query.email)}.`);
  }

  private async loadCandidates(query: OtpQuery): Promise<ParsedGmailMessage[]> {
    const ids = await this.client.listMessageIds(this.buildSearchQuery(query));
    return Promise.all(
      ids.map(async (id) => GmailMessageParser.parse(await this.client.getMessage(id))),
    );
  }

  private buildSearchQuery(query: OtpQuery): string {
    const requestDate = query.requestedAfter.toISOString().slice(0, 10).replaceAll('-', '/');
    return [
      'in:sent',
      `after:${requestDate}`,
      `to:${quoteSearchValue(query.email.trim())}`,
      `subject:${quoteSearchValue(this.config.subject.trim())}`,
      ...(this.config.sender === undefined
        ? []
        : [`from:${quoteSearchValue(this.config.sender.trim())}`]),
    ].join(' ');
  }

  private matchesCorrelation(message: ParsedGmailMessage, query: OtpQuery): boolean {
    if (!hasExactAddress(message.to, query.email)) return false;
    if (message.subject?.trim() !== this.config.subject.trim()) return false;
    return this.config.sender === undefined || hasExactAddress(message.from, this.config.sender);
  }
}
