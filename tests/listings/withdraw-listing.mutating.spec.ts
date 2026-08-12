import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';

test(listingCaseTitle('LIST-UC11-WITHDRAW-001'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('ownedPublishedWithdraw');

  await listingWorkflow.requestWithdrawal(reference);

  expect(await listingWorkflow.confirmWithdrawal()).toBe('Đã gỡ');
  expect(await listingWorkflow.ownedListingStatus(reference)).toBe('Đã gỡ');
});

test(listingCaseTitle('LIST-UC11-WITHDRAW-002'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('ownedPublishedCancel');

  await listingWorkflow.requestWithdrawal(reference);
  await listingWorkflow.cancelWithdrawal();

  expect(await listingWorkflow.ownedListingStatus(reference)).toBe('Đang đăng');
});

test(listingCaseTitle('LIST-UC11-WITHDRAW-003'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('ownedEditable');
  await listingWorkflow.openMyListings();
  const statusBefore = await listingWorkflow.ownedListingStatus(reference);

  await listingWorkflow.requestWithdrawal(reference);

  expect(await listingWorkflow.ownedListingStatus(reference)).toBe(statusBefore);
});

test(listingCaseTitle('LIST-UC11-WITHDRAW-004'), async ({ listingWorkflow, controlledListing }) => {
  const reference = controlledListing('otherOwner');

  await expect(listingWorkflow.requestWithdrawal(reference)).rejects.toThrow();
});
