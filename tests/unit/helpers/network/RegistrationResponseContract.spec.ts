import { expect, test } from '@playwright/test';

import { requireAcceptedRegistrationTransport } from '../../../../helpers/network/RegistrationResponseContract';

test('accepts both boundaries of the HTTP success range with the observed submit transition', () => {
  expect(
    requireAcceptedRegistrationTransport(
      { status: 200, body: {} },
      { disabledObserved: true, loadingTextObserved: true },
    ),
  ).toEqual({ status: 200, submitTransitionObserved: true });
  expect(
    requireAcceptedRegistrationTransport(
      { status: 299, body: {} },
      { disabledObserved: true, loadingTextObserved: true },
    ),
  ).toEqual({ status: 299, submitTransitionObserved: true });
});

test('does not expose or interpret an uncontracted registration response body', () => {
  const body = { uncontracted: 'ignored-value', status: 'PENDING' };

  const accepted = requireAcceptedRegistrationTransport(
    { status: 200, body },
    { disabledObserved: true, loadingTextObserved: true },
  );

  expect(Object.keys(accepted).sort()).toEqual(['status', 'submitTransitionObserved']);
  expect(JSON.stringify(accepted)).not.toContain('ignored-value');
  expect(JSON.stringify(accepted)).not.toContain('PENDING');
});

test('rejects a registration response outside the HTTP success range', () => {
  expect(() =>
    requireAcceptedRegistrationTransport(
      { status: 199, body: {} },
      { disabledObserved: true, loadingTextObserved: true },
    ),
  ).toThrow('Registration request was not accepted.');
  expect(() =>
    requireAcceptedRegistrationTransport(
      { status: 300, body: {} },
      { disabledObserved: true, loadingTextObserved: true },
    ),
  ).toThrow('Registration request was not accepted.');
});

test('rejects a response when the submit transition was not fully observed', () => {
  expect(() =>
    requireAcceptedRegistrationTransport(
      { status: 201, body: {} },
      { disabledObserved: false, loadingTextObserved: true },
    ),
  ).toThrow('Registration submit transition was not observed.');
  expect(() =>
    requireAcceptedRegistrationTransport(
      { status: 201, body: {} },
      { disabledObserved: true, loadingTextObserved: false },
    ),
  ).toThrow('Registration submit transition was not observed.');
});
