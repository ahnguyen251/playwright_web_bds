import { expect, test } from '@playwright/test';

import { OtpMessageParser } from '../../../../helpers/otp/OtpMessageParser';

test('extracts one six-digit registration OTP', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-1',
      internalDate: new Date('2026-08-05T00:00:01Z'),
      recipient: 'automation+auth-1@gmail.com',
      subject: 'Xác thực tài khoản Propify',
      body: 'Mã OTP của bạn là 123456.',
    },
    'registration',
  );

  expect(otp).toBe('123456');
});

test('rejects a message containing multiple candidate codes', () => {
  expect(() =>
    OtpMessageParser.extract(
      {
        id: 'message-2',
        internalDate: new Date(),
        recipient: 'automation@gmail.com',
        subject: 'Propify password recovery',
        body: 'Codes 123456 and 654321',
      },
      'passwordRecovery',
    ),
  ).toThrow('Ambiguous OTP message');
});

test('ignores an OTP without the purpose-specific Propify signal', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-3',
      internalDate: new Date(),
      recipient: 'automation@gmail.com',
      subject: 'Propify registration',
      body: 'Your one-time code is 123456.',
    },
    'passwordRecovery',
  );

  expect(otp).toBeUndefined();
});

test('rejects a six-digit sequence embedded in an alphanumeric identifier', () => {
  const otp = OtpMessageParser.extract(
    {
      id: 'message-4',
      internalDate: new Date(),
      recipient: 'automation@gmail.com',
      subject: 'Propify password recovery',
      body: 'Reference refABC123456DEF is not a one-time password.',
    },
    'passwordRecovery',
  );

  expect(otp).toBeUndefined();
});
