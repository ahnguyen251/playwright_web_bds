import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';
import { ListingDataFactory } from '../../test-data/factories/ListingDataFactory';

test(listingCaseTitle('LIST-UC09-001'), async ({ listingWorkflow }) => {
  const listings = await listingWorkflow.viewOwnListings();
  const ids = listings.map(({ id }) => id);

  expect(listings.every(({ title }) => title.trim().length > 0)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
});

test(listingCaseTitle('LIST-UC09-003'), async ({ myListingsPage, controlledListing }) => {
  const editable = controlledListing('ownedEditable');
  await myListingsPage.open();
  await myListingsPage.search(editable.title);

  expect(await myListingsPage.summaries()).toContainEqual(
    expect.objectContaining({ id: editable.id, title: editable.title }),
  );
});

test(listingCaseTitle('LIST-UC09-006'), async ({ myListingsPage }) => {
  await myListingsPage.open();
  await myListingsPage.search(ListingDataFactory.uniqueTitle('KHÔNG TỒN TẠI'));

  expect(await myListingsPage.emptyMessage()).not.toBe('');
});
