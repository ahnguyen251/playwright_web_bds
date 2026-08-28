import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';
import { ListingDataFactory } from '../../test-data/factories/ListingDataFactory';
import type { ListingReference } from '../../types/listing.types';
import type { ListingWorkflow } from '../../workflows/listings/ListingWorkflow';

test.use({ storageState: { cookies: [], origins: [] } });

const searchBothTransactionTypes = async (
  listingWorkflow: ListingWorkflow,
  reference: ListingReference,
) => {
  const criteria = { keyword: reference.title } as const;
  const saleResults = await listingWorkflow.search('sale', criteria);
  const rentResults = await listingWorkflow.search('rent', criteria);
  return [...saleResults, ...rentResults];
};

test(listingCaseTitle('TC-LIST-SEARCH-001'), async ({ listingWorkflow, controlledListing }) => {
  const approved = controlledListing('approved');

  expect(await searchBothTransactionTypes(listingWorkflow, approved)).toContainEqual(
    expect.objectContaining({ id: approved.id, title: approved.title }),
  );
});

test(listingCaseTitle('TC-LIST-SEARCH-001') + ' - Không có kết quả', async ({ listingWorkflow }) => {
  const results = await listingWorkflow.search('sale', {
    keyword: ListingDataFactory.uniqueTitle('KHÔNG CÓ KẾT QUẢ'),
  });

  expect(results).toEqual([]);
});

test(listingCaseTitle('TC-LIST-SEARCH-001') + ' - Loại bỏ tin chưa duyệt', async ({ listingWorkflow, controlledListing }) => {
  const approved = controlledListing('approved');
  const unapproved = controlledListing('unapproved');
  const results = await searchBothTransactionTypes(listingWorkflow, approved);

  expect(results.map(({ id }) => id)).toContain(approved.id);
  expect(results.map(({ id }) => id)).not.toContain(unapproved.id);
});
