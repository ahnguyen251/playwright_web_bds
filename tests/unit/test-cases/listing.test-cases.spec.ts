import { expect, test } from '@playwright/test';
import { listingTestCases } from '../../../test-cases/listings/listing.test-cases';

test('has valid listing test cases', () => {
  expect(listingTestCases.length).toBeGreaterThan(0);
  const ids = listingTestCases.map(({ id }) => id);
  expect(new Set(ids).size).toBe(ids.length);
});
