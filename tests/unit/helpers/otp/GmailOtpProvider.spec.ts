import { expect, test } from '@playwright/test';

import { GmailApiError, type GmailClient } from '../../../../helpers/otp/GmailApiClient';
import { GmailOtpProvider } from '../../../../helpers/otp/GmailOtpProvider';
import type { GmailMessage } from '../../../../helpers/otp/GmailMessageParser';
import type { GmailOtpConfig, OtpQuery } from '../../../../types/otp.types';

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

const message = (
  id: string,
  internalDate: number,
  body: string,
  headers: { readonly from?: string; readonly to?: string; readonly subject?: string } = {},
): GmailMessage => ({
  id,
  internalDate: String(internalDate),
  payload: {
    mimeType: 'text/plain',
    headers: [
      ...(headers.from === undefined ? [] : [{ name: 'From', value: headers.from }]),
      ...(headers.to === undefined ? [] : [{ name: 'To', value: headers.to }]),
      ...(headers.subject === undefined ? [] : [{ name: 'Subject', value: headers.subject }]),
    ],
    body: { data: encode(body) },
  },
});

class FakeGmailClient implements GmailClient {
  public readonly queries: string[] = [];
  public listCalls = 0;

  public constructor(
    private readonly messages: ReadonlyMap<string, GmailMessage>,
    private readonly error?: GmailApiError,
  ) {}

  public listMessageIds(query: string): Promise<readonly string[]> {
    this.listCalls += 1;
    this.queries.push(query);
    return this.error === undefined
      ? Promise.resolve([...this.messages.keys()])
      : Promise.reject(this.error);
  }

  public getMessage(id: string): Promise<GmailMessage> {
    const result = this.messages.get(id);
    return result === undefined
      ? Promise.reject(new Error(`Unknown fake message: ${id}`))
      : Promise.resolve(result);
  }
}

class FakeClock {
  public readonly sleeps: number[] = [];

  public constructor(private currentTime: number) {}

  public now(): number {
    return this.currentTime;
  }

  public sleep(milliseconds: number): Promise<void> {
    this.sleeps.push(milliseconds);
    this.currentTime += milliseconds;
    return Promise.resolve();
  }
}

const requestedAfter = new Date('2026-08-11T10:00:00.000Z');
const query: OtpQuery = {
  email: 'registration+run-1@example.test',
  requestedAfter,
};
const baseConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  otpPattern: /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
  timeoutMs: 5_000,
  pollIntervalMs: 2_000,
} satisfies GmailOtpConfig;

test('filters by receive time, identity, sender, and subject before selecting the newest OTP', async () => {
  const after = requestedAfter.getTime();
  const client = new FakeGmailClient(
    new Map([
      [
        'old',
        message('old', after, `${query.email} — Verification code: OLD-0001`, {
          from: 'otp@example.test',
          subject: 'Verify registration',
        }),
      ],
      [
        'other-email',
        message('other-email', after + 4_000, 'other@example.test — Verification code: NO-0002', {
          from: 'otp@example.test',
          subject: 'Verify registration',
        }),
      ],
      [
        'wrong-sender',
        message('wrong-sender', after + 5_000, `${query.email} — Verification code: NO-0003`, {
          from: 'attacker@example.test',
          subject: 'Verify registration',
        }),
      ],
      [
        'newest-valid',
        message('newest-valid', after + 3_000, `${query.email} — Verification code: OK-4821`, {
          from: 'Propify OTP <otp@example.test>',
          subject: 'Verify registration now',
        }),
      ],
      [
        'older-valid',
        message('older-valid', after + 1_000, `${query.email} — Verification code: OK-1111`, {
          from: 'otp@example.test',
          subject: 'Verify registration',
        }),
      ],
    ]),
  );
  const clock = new FakeClock(0);
  const provider = new GmailOtpProvider(
    client,
    { ...baseConfig, sender: 'otp@example.test', subject: 'Verify registration' },
    clock,
  );

  await expect(provider.getOtp(query)).resolves.toBe('OK-4821');
  expect(client.queries).toEqual([
    'after:2026/08/11 from:otp@example.test subject:"Verify registration"',
  ]);
  expect(clock.sleeps).toEqual([]);
});

test('fails immediately when the newest matching email violates the OTP contract', async () => {
  const after = requestedAfter.getTime();
  const client = new FakeGmailClient(
    new Map([
      [
        'older-valid',
        message('older-valid', after + 1_000, `${query.email} Verification code: OK-1111`),
      ],
      [
        'newest-invalid',
        message('newest-invalid', after + 2_000, `${query.email} reference 999999`),
      ],
    ]),
  );
  const clock = new FakeClock(0);

  await expect(new GmailOtpProvider(client, baseConfig, clock).getOtp(query)).rejects.toThrow(
    'Matching OTP email found but OTP contract did not match.',
  );
  expect(clock.sleeps).toEqual([]);
});

test('polls at the configured interval until a bounded timeout with only a masked email', async () => {
  const client = new FakeGmailClient(new Map());
  const clock = new FakeClock(0);

  const error = await new GmailOtpProvider(client, baseConfig, clock)
    .getOtp(query)
    .catch((reason: unknown) => reason);

  expect(client.listCalls).toBe(3);
  expect(clock.sleeps).toEqual([2_000, 2_000, 1_000]);
  expect(String(error)).toContain(
    'OTP email was not received before timeout for r***@example.test.',
  );
  for (const sensitiveValue of [
    query.email,
    'client-secret',
    'refresh-token',
    '999999',
    'message body',
  ]) {
    expect(String(error)).not.toContain(sensitiveValue);
  }
});

for (const status of [401, 403] as const) {
  test(`propagates Gmail ${String(status)} immediately without sleeping`, async () => {
    const expected = new GmailApiError(`gmail-${String(status)}`, status);
    const client = new FakeGmailClient(new Map(), expected);
    const clock = new FakeClock(0);

    await expect(new GmailOtpProvider(client, baseConfig, clock).getOtp(query)).rejects.toBe(
      expected,
    );
    expect(client.listCalls).toBe(1);
    expect(clock.sleeps).toEqual([]);
  });
}
