import { expect, test } from '@playwright/test';

import {
  listingMutationSkipReason,
  mutatingTest,
} from '../../../fixtures/mutating.fixture';

test('production listing mutation requires the dedicated production approval', () => {
  expect(
    listingMutationSkipReason({
      environment: 'production',
      allowMutatingE2E: true,
      runProductionMutatingE2e: false,
    }),
  ).toContain('RUN_PRODUCTION_MUTATING_E2E');
});

test('approved non-production listing mutation has no skip reason', () => {
  expect(
    listingMutationSkipReason({
      environment: 'staging',
      allowMutatingE2E: true,
      runProductionMutatingE2e: false,
    }),
  ).toBeUndefined();
});

mutatingTest('không chạy nội dung test có thay đổi khi chưa bật cờ rõ ràng', () => {
  throw new Error('Mutation safety fixture did not skip the test');
});
