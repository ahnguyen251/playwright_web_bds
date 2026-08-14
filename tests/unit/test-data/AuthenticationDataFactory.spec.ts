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
