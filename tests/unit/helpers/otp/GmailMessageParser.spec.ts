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

test('extracts a six-digit named otp capture without requiring the recipient in the body', () => {
  expect(
    GmailMessageParser.extractOtp(
      'Your verification code is 482108',
      /verification code is (?<otp>\d{6})/i,
    ),
  ).toBe('482108');
});

test('does not use an arbitrary number when the configured contract misses', () => {
  expect(
    GmailMessageParser.extractOtp('Reference 999999', /verification code is (?<otp>\d{6})/i),
  ).toBeUndefined();
});

test('rejects a named capture that is not exactly six digits', () => {
  expect(
    GmailMessageParser.extractOtp('Code AB-4821', /Code (?<otp>[A-Z]{2}-\d{4})/),
  ).toBeUndefined();
  expect(GmailMessageParser.extractOtp('Code 48210', /Code (?<otp>\d{5})/)).toBeUndefined();
});
