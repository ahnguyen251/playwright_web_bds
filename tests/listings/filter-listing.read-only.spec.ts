import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';

test.use({ storageState: { cookies: [], origins: [] } });

test(listingCaseTitle('LIST-UC17-001'), async ({ listingWorkflow }) => {
  const results = await listingWorkflow.filter('sale', { poster: 'owner' });

  expect(results.every(({ poster }) => poster === 'owner')).toBe(true);
});

test(listingCaseTitle('LIST-UC17-007'), async ({ listingWorkflow }) => {
  const results = await listingWorkflow.filter('sale', {
    poster: 'owner',
    price: { kind: 'custom', from: 2, to: 5 },
    area: { kind: 'custom', from: 50, to: 80 },
  });

  expect(
    results.every(
      ({ poster, price, area }) =>
        poster === 'owner' &&
        price !== undefined &&
        price >= 2 &&
        price <= 5 &&
        area >= 50 &&
        area <= 80,
    ),
  ).toBe(true);
});

test(listingCaseTitle('LIST-UC17-012'), async ({ listingListPage }) => {
  await listingListPage.open('sale');
  await listingListPage.applyFilters({ price: { kind: 'custom', from: -1, to: 5 } });

  expect(await listingListPage.normalizedRangeValue('priceFrom')).toBe(0);
});

test(listingCaseTitle('LIST-UC17-013'), async ({ listingListPage }) => {
  await listingListPage.open('sale');
  await listingListPage.applyFilters({
    area: { kind: 'custom', from: 999_999, to: 1_000_000 },
  });

  await expect.poll(() => listingListPage.resultCount()).toBe(0);
  expect(await listingListPage.emptyMessage()).not.toBe('');
});
