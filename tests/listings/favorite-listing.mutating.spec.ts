import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';
import type { ListingReference } from '../../types/listing.types';
import type { ListingWorkflow } from '../../workflows/listings/ListingWorkflow';

const restoreFavorite = async (
  listingWorkflow: ListingWorkflow,
  reference: ListingReference,
  currentState: boolean,
  initialState: boolean,
): Promise<void> => {
  if (currentState !== initialState) await listingWorkflow.toggleFavorite(reference);
};

test(listingCaseTitle('LIST-UC12-001'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('approved');
  const firstState = await listingWorkflow.toggleFavorite(reference);
  const initialState = !firstState;
  let currentState = firstState;

  try {
    currentState = await listingWorkflow.toggleFavorite(reference);
    expect(currentState).toBe(initialState);
  } finally {
    await restoreFavorite(listingWorkflow, reference, currentState, initialState);
  }
});

test(listingCaseTitle('LIST-UC12-002'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('approvedWithoutMedia');
  const firstState = await listingWorkflow.toggleFavorite(reference);
  const initialState = !firstState;
  let currentState = firstState;

  try {
    if (!currentState) currentState = await listingWorkflow.toggleFavorite(reference);
    expect(await listingWorkflow.isFavoriteListed(reference)).toBe(true);

    currentState = await listingWorkflow.toggleFavorite(reference);
    expect(currentState).toBe(false);
    expect(await listingWorkflow.isFavoriteListed(reference)).toBe(false);
  } finally {
    await restoreFavorite(listingWorkflow, reference, currentState, initialState);
  }
});

test.describe('Khách chưa đăng nhập', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(listingCaseTitle('LIST-UC12-003'), async ({ listingWorkflow, controlledListing }) => {
    const reference = controlledListing('approved');

    expect(await listingWorkflow.toggleFavorite(reference)).toBe(false);
  });
});
