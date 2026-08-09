import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';
import { ListingDataFactory } from '../../test-data/factories/ListingDataFactory';

test(listingCaseTitle('LIST-UC11-EDIT-001'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('ownedEditable');
  const update = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('TỰ ĐỘNG CHỈNH SỬA TIN'),
    description: `Nội dung chỉnh sửa tự động ${Date.now().toString(36)}`,
  });

  expect(await listingWorkflow.edit(reference, update)).toBe('Chờ duyệt');
});

test(listingCaseTitle('LIST-UC11-EDIT-003'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('otherOwner');
  const update = ListingDataFactory.create({
    title: ListingDataFactory.uniqueTitle('KHÔNG ĐƯỢC PHÉP CHỈNH SỬA'),
  });

  await expect(listingWorkflow.edit(reference, update)).rejects.toThrow();
});
