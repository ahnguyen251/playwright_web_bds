import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';

test(listingCaseTitle('TC-LIST-DETAIL-001'), async ({ listingWorkflow, controlledListing }) => {
  const approved = controlledListing('approved');
  const detail = await listingWorkflow.viewDetail(approved);

  expect(detail.title).toBe(approved.title);
  expect(detail.description).not.toBe('');
  expect(detail.contactName).not.toBe('');
  expect(detail.amenities.length).toBeGreaterThan(0);
  expect(detail.mediaCount).toBeGreaterThan(0);
  expect(detail.relatedTitles.length).toBeGreaterThan(0);
});

test(listingCaseTitle('TC-LIST-DETAIL-002'), async ({ listingDetailPage }) => {
  await listingDetailPage.open('25');

  expect(await listingDetailPage.notFoundMessage()).not.toBe('');
  expect(await listingDetailPage.isContentVisible()).toBe(false);
});

test(listingCaseTitle('TC-LIST-DETAIL-002') + ' - Chưa duyệt', async ({ listingDetailPage, controlledListing }) => {
  await listingDetailPage.open(controlledListing('unapproved'));

  expect(await listingDetailPage.isContentVisible()).toBe(false);
});

test(listingCaseTitle('TC-LIST-DETAIL-001') + ' - Không có ảnh', async ({ listingDetailPage, controlledListing }) => {
  await listingDetailPage.open(controlledListing('approvedWithoutMedia'));

  expect(await listingDetailPage.hasDefaultImage()).toBe(true);
});
