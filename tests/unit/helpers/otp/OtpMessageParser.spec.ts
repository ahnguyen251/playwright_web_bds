import { expect, test } from '@playwright/test';

import { OtpMessageParser } from '../../../../helpers/otp/OtpMessageParser';

const correlation = {
  sender: 'mailer@example.test',
  subject: 'Account security code',
  pattern: 'Use {otp} to continue.',
};

test('extracts one six-digit OTP using the configured safe template', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-1',
      internalDate: new Date('2026-08-05T00:00:01Z'),
      recipient: 'automation+auth-1@gmail.com',
      sender: 'mailer@example.test',
      subject: 'Account security code',
      body: 'Use 123456 to continue.',
    },
    'registration',
    correlation,
  );

  expect(otp).toBe('123456');
});

test('rejects a message containing multiple configured OTP candidates', () => {
  expect(() =>
    OtpMessageParser.extract(
      {
        id: 'message-2',
        internalDate: new Date(),
        recipient: 'automation@gmail.com',
        sender: 'mailer@example.test',
        subject: 'Account security code',
        body: 'Use 123456 to continue. Use 654321 to continue.',
      },
      'passwordRecovery',
      correlation,
    ),
  ).toThrow('Ambiguous OTP message');
});

test('ignores an OTP from a sender other than the configured sender', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-3',
      internalDate: new Date(),
      recipient: 'automation@gmail.com',
      sender: 'attacker@example.test',
      subject: 'Account security code',
      body: 'Use 123456 to continue.',
    },
    'passwordRecovery',
    correlation,
  );

  expect(otp).toBeUndefined();
});

test('rejects a six-digit sequence embedded in an alphanumeric identifier', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-4',
      internalDate: new Date(),
      recipient: 'automation@gmail.com',
      sender: 'mailer@example.test',
      subject: 'Account security code',
      body: 'Use refABC123456DEF to continue.',
    },
    'passwordRecovery',
    correlation,
  );

  expect(otp).toBeUndefined();
});

test('ignores an OTP when the exact configured subject does not match', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-5',
      internalDate: new Date(),
      recipient: 'automation@gmail.com',
      sender: 'mailer@example.test',
      subject: 'Different security message',
      body: 'Use 123456 to continue.',
    },
    'registration',
    correlation,
  );

  expect(otp).toBeUndefined();
});
