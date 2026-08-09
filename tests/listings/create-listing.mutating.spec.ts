import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';
import { ListingDataFactory } from '../../test-data/factories/ListingDataFactory';

test(listingCaseTitle('LIST-UC08-001'), async ({ listingWorkflow }) => {
  const listing = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('TỰ ĐỘNG TẠO TIN CÓ ẢNH'),
  });

  expect(await listingWorkflow.create(listing)).toBe('Chờ duyệt');
});

test(listingCaseTitle('LIST-UC08-002'), async ({ listingWorkflow }) => {
  const listing = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('TỰ ĐỘNG TẠO TIN CÓ VIDEO'),
    media: { videoPath: 'listing-videos/property.mp4' },
  });

  expect(await listingWorkflow.create(listing)).toBe('Chờ duyệt');
});
