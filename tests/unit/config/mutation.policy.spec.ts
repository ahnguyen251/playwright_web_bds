import { expect, test } from '@playwright/test';

import { mutationBlockReason } from '../../../config/mutation.policy';

test('blocks production even when mutations are explicitly enabled', () => {
  expect(
    mutationBlockReason({
      environment: 'production',
      runMutatingTests: true,
    }),
  ).toContain('production');
});

test('requires explicit mutation opt-in outside production', () => {
  expect(
    mutationBlockReason({
      environment: 'dev',
      runMutatingTests: false,
    }),
  ).toContain('RUN_MUTATING_TESTS=true');
});

test('allows explicitly enabled mutations on staging', () => {
  expect(
    mutationBlockReason({
      environment: 'staging',
      runMutatingTests: true,
    }),
  ).toBeUndefined();
});
