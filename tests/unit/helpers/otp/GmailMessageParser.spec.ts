import { expect, test } from '@playwright/test';

import { GmailMessageParser, type GmailMessage } from '../../../../helpers/otp/GmailMessageParser';

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

test('parses a root plain-text Gmail message and root headers case-insensitively', () => {
  const message: GmailMessage = {
    id: 'message-1',
    internalDate: '1723370400123',
    payload: {
      mimeType: 'text/plain',
      headers: [
        { name: 'FROM', value: 'registration@example.test' },
        { name: 'to', value: 'registration+run-1@example.test' },
        { name: 'Subject', value: 'Verify your registration' },
      ],
      body: { data: encode('registration+run-1@example.test — Verification code: AB-4821') },
    },
  };

  expect(GmailMessageParser.parse(message)).toEqual({
    id: 'message-1',
    internalDate: 1_723_370_400_123,
    from: 'registration@example.test',
    to: 'registration+run-1@example.test',
    subject: 'Verify your registration',
    body: 'registration+run-1@example.test — Verification code: AB-4821',
  });
});

test('recursively concatenates inline text from a nested multipart message', () => {
  const message: GmailMessage = {
    id: 'message-2',
    internalDate: '1723370401123',
    payload: {
      mimeType: 'multipart/mixed',
      headers: [],
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: encode('Plain OTP content') } },
            { mimeType: 'text/html', body: { data: encode('<p>HTML OTP content</p>') } },
          ],
        },
        {
          mimeType: 'application/pdf',
          body: { data: encode('must not be decoded') },
        },
      ],
    },
  };

  expect(GmailMessageParser.parse(message).body).toBe('Plain OTP content\n<p>HTML OTP content</p>');
});

test('rejects a missing or non-finite Gmail receive time', () => {
  expect(() => GmailMessageParser.parse({ id: 'missing-date', payload: { headers: [] } })).toThrow(
    'Gmail message has an invalid internalDate.',
  );
  expect(() =>
    GmailMessageParser.parse({
      id: 'invalid-date',
      internalDate: 'not-a-number',
      payload: { headers: [] },
    }),
  ).toThrow('Gmail message has an invalid internalDate.');
});

test('extracts only the configured named otp capture for the exact email', () => {
  const body = 'registration+run-1@example.test — Verification code: AB-4821';

  expect(
    GmailMessageParser.extractOtp(
      body,
      'registration+run-1@example.test',
      /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
    ),
  ).toBe('AB-4821');
});

test('does not use an arbitrary number when the configured contract misses', () => {
  const body = 'registration+run-1@example.test reference 999999';

  expect(
    GmailMessageParser.extractOtp(
      body,
      'registration+run-1@example.test',
      /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
    ),
  ).toBeUndefined();
});

test('rejects a message for another registration identity', () => {
  expect(
    GmailMessageParser.extractOtp(
      'other@example.test — Verification code: AB-4821',
      'registration+run-1@example.test',
      /Verification code: (?<otp>[A-Z]{2}-\d{4})/,
    ),
  ).toBeUndefined();
});
