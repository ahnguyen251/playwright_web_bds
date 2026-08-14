import { expect, test } from '@playwright/test';

import { AuthenticationDataFactory } from '../../../test-data/factories/AuthenticationDataFactory';

test('creates a correlated Gmail alias without mutating the base address', () => {
  const data = AuthenticationDataFactory.createRegistration('automation@gmail.com', {
    uniqueId: 'AUTH001',
  });

  expect(data.email).toBe('automation+auth-auth001@gmail.com');
  expect(data.password).toBe(data.passwordConfirmation);
});

test('rejects a mailbox that cannot use Gmail plus-addressing', () => {
  expect(() =>
    AuthenticationDataFactory.createRegistration('automation@example.test', {
      uniqueId: 'AUTH001',
    }),
  ).toThrow('Gmail mailbox is required for registration aliases');
});

test('creates distinct valid Gmail addresses for nonexistent password-recovery requests', () => {
  const firstEmail = AuthenticationDataFactory.createNonexistentGmailEmail();
  const secondEmail = AuthenticationDataFactory.createNonexistentGmailEmail();

  expect(firstEmail).toMatch(/^propify\.forgot\.forgotpassword[a-z0-9]+@gmail\.com$/);
  expect(secondEmail).toMatch(/^propify\.forgot\.forgotpassword[a-z0-9]+@gmail\.com$/);
  expect(secondEmail).not.toBe(firstEmail);
});

test('creates a different six-digit OTP from valid provider output', () => {
  const deliveredOtp = '012345';
  const incorrectOtp = AuthenticationDataFactory.createIncorrectOtp(deliveredOtp);

  expect(incorrectOtp).toBe('112345');
  expect(incorrectOtp).toMatch(/^\d{6}$/);
  expect(incorrectOtp).not.toBe(deliveredOtp);
});

test('rejects provider output outside the six-digit OTP contract', () => {
  for (const invalidOtp of ['12345', '1234567', '12A456']) {
    expect(() => AuthenticationDataFactory.createIncorrectOtp(invalidOtp)).toThrow(
      'OTP provider returned a value outside the six-digit contract.',
    );
  }
});
