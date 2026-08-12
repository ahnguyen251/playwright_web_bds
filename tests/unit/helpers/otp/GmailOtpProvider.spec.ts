import { expect, test } from '@playwright/test';

import type { GmailMessage, GmailMessageClient } from '../../../../helpers/otp/GmailApiClient';
import { GmailOtpProvider, type Clock } from '../../../../helpers/otp/GmailOtpProvider';
import type { OtpQuery } from '../../../../types/otp.types';

class FakeGmailClient implements GmailMessageClient {
  public readonly queries: string[] = [];

  public constructor(private readonly messages: readonly GmailMessage[]) {}

  public search(query: string): Promise<readonly GmailMessage[]> {
    this.queries.push(query);
    return Promise.resolve(this.messages);
  }
}

const requestTime = new Date('2026-08-05T00:00:00Z');
const beforeRequest = new Date('2026-08-04T23:59:59Z');
const afterRequest = new Date('2026-08-05T00:00:01Z');
const alias = 'automation+auth-1@gmail.com';

const message = (overrides: Partial<GmailMessage>): GmailMessage => ({
  id: 'message-id',
  internalDate: afterRequest,
  recipient: alias,
  sender: 'mailer@example.test',
  subject: 'Account security code',
  body: 'Use 333333 to continue.',
  ...overrides,
});

const correlation = {
  sender: 'mailer@example.test',
  subject: 'Account security code',
  pattern: 'Use {otp} to continue.',
};

const query = (overrides: Partial<OtpQuery> = {}): OtpQuery => ({
  recipient: alias,
  purpose: 'passwordRecovery',
  requestedAfter: requestTime,
  timeoutMs: 5_000,
  pollIntervalMs: 1_000,
  ...overrides,
});

const advancingClock = (): Clock => {
  let now = requestTime.getTime();
  return {
    now: () => new Date(now),
    delay: (milliseconds) => {
      now += milliseconds;
      return Promise.resolve();
    },
  };
};

test('ignores old and wrong-recipient messages before returning the newest match', async () => {
  const client = new FakeGmailClient([
    message({
      id: 'old',
      recipient: alias,
      internalDate: beforeRequest,
      body: 'Use 111111 to continue.',
    }),
    message({
      id: 'wrong',
      recipient: 'other@gmail.com',
      internalDate: afterRequest,
      body: 'Use 222222 to continue.',
    }),
    message({
      id: 'wrong-sender',
      sender: 'attacker@example.test',
      body: 'Use 999999 to continue.',
    }),
    message({
      id: 'match',
      recipient: alias,
      internalDate: afterRequest,
      body: 'Use 333333 to continue.',
    }),
  ]);
  const provider = new GmailOtpProvider(client, correlation, advancingClock());

  await expect(provider.waitForOtp(query({ recipient: alias }))).resolves.toBe('333333');
  expect(client.queries).toEqual([
    'to:automation+auth-1@gmail.com from:mailer@example.test subject:"Account security code" after:1785888000',
  ]);
});

test('times out with sanitized diagnostics', async () => {
  const provider = new GmailOtpProvider(new FakeGmailClient([]), correlation, advancingClock());

  await expect(provider.waitForOtp(query({ timeoutMs: 5_000 }))).rejects.toThrow(
    /OTP not received.*passwordRecovery/,
  );
});

test('times out when a Gmail search does not settle before the deadline', async () => {
  const provider = new GmailOtpProvider(
    { search: () => new Promise<readonly GmailMessage[]>(() => undefined) },
    correlation,
    advancingClock(),
  );
  const result = await Promise.race([
    provider.waitForOtp(query()).then(
      () => 'resolved',
      (error: unknown) => (error instanceof Error ? error.message : 'rejected without an Error'),
    ),
    new Promise<string>((resolve) => setImmediate(() => resolve('search remained pending'))),
  ]);

  expect(result).toMatch(/OTP not received.*passwordRecovery/);
});
