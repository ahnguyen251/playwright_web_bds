import { OtpMessageParser } from './OtpMessageParser';

import type { GmailMessage, GmailMessageClient } from './GmailApiClient';
import type { OtpProvider, OtpQuery } from '../../types/otp.types';

export interface Clock {
  now(): Date;
  delay(milliseconds: number): Promise<void>;
}

const systemClock: Clock = {
  now: () => new Date(),
  delay: async (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

const newestFirst = (first: GmailMessage, second: GmailMessage): number =>
  second.internalDate.getTime() - first.internalDate.getTime();

export class GmailOtpProvider implements OtpProvider {
  public constructor(
    private readonly client: GmailMessageClient,
    private readonly clock: Clock = systemClock,
  ) {}

  public async waitForOtp(query: OtpQuery): Promise<string> {
    const startedAt = this.clock.now();
    const gmailQuery = [
      `to:${query.recipient}`,
      `after:${String(Math.floor(query.requestedAfter.getTime() / 1_000))}`,
    ].join(' ');

    for (;;) {
      const messages = await this.searchBeforeDeadline(
        gmailQuery,
        Math.max(0, query.timeoutMs - (this.clock.now().getTime() - startedAt.getTime())),
      );
      if (messages === undefined) {
        this.throwTimeout(query, startedAt);
      }

      const otp = this.extractNewestOtp(messages, query);
      if (otp !== undefined) {
        return otp;
      }

      const elapsedMilliseconds = this.elapsedMilliseconds(startedAt);
      if (elapsedMilliseconds >= query.timeoutMs) {
        this.throwTimeout(query, startedAt);
      }

      await this.clock.delay(Math.min(query.pollIntervalMs, query.timeoutMs - elapsedMilliseconds));
    }
  }

  private extractNewestOtp(messages: readonly GmailMessage[], query: OtpQuery): string | undefined {
    const matchingMessages = messages
      .filter(
        (message) =>
          message.recipient === query.recipient && message.internalDate.getTime() > query.requestedAfter.getTime(),
      )
      .sort(newestFirst);

    for (const message of matchingMessages) {
      const otp = OtpMessageParser.extract(message, query.purpose);
      if (otp !== undefined) {
        return otp;
      }
    }

    return undefined;
  }

  private async searchBeforeDeadline(query: string, remainingMilliseconds: number): Promise<readonly GmailMessage[] | undefined> {
    return Promise.race([
      this.client.search(query),
      this.clock.delay(remainingMilliseconds).then(() => undefined),
    ]);
  }

  private elapsedMilliseconds(startedAt: Date): number {
    return this.clock.now().getTime() - startedAt.getTime();
  }

  private throwTimeout(query: OtpQuery, startedAt: Date): never {
    throw new Error(
      `OTP not received for ${query.purpose} recipient ${query.recipient} after ${String(this.elapsedMilliseconds(startedAt))}ms`,
    );
  }
}
