import { expect, test } from '@playwright/test';

import { UserDataFactory } from '../../../test-data/factories/UserDataFactory';

test('resolves credentials through environment-key references', () => {
  const credential = UserDataFactory.getCredentials('defaultUser', {
    DEFAULT_USER_EMAIL: 'user@example.test',
    DEFAULT_USER_PASSWORD: 'secret-value',
  });

  expect(credential).toEqual({
    alias: 'defaultUser',
    email: 'user@example.test',
    password: 'secret-value',
  });
});

test('reports a missing environment key without printing configured secrets', () => {
  expect(() =>
    UserDataFactory.getCredentials('defaultUser', {
      DEFAULT_USER_PASSWORD: 'must-not-leak',
    }),
  ).toThrow('Missing credential environment variable: DEFAULT_USER_EMAIL');

  try {
    UserDataFactory.getCredentials('defaultUser', {
      DEFAULT_USER_PASSWORD: 'must-not-leak',
    });
  } catch (error) {
    expect(String(error)).not.toContain('must-not-leak');
  }
});

test('rejects an unknown user alias', () => {
  expect(() => UserDataFactory.getCredentials('unknownUser', {})).toThrow(
    'Unknown user alias: unknownUser',
  );
});
