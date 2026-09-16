import { expect, test } from '../../fixtures/test.fixture';
import { listingCaseTitle } from '../../test-cases/listings/listing.test-cases';

const TARGET_LISTING_ID = '48';

test.describe('Báo cáo vi phạm tin đăng (Read-only / Mocked API)', () => {
  test(
    listingCaseTitle('TC-LIST-REPORT-002'),
    async ({ listingDetailPage }) => {
      await listingDetailPage.open(TARGET_LISTING_ID);

      await expect.poll(async () => listingDetailPage.isReportSectionVisible()).toBe(true);
      await expect.poll(async () => listingDetailPage.isReportSubmitEnabled()).toBe(false);

      // Select reason to enable button
      await listingDetailPage.selectReportReason('Định giá chưa đúng với thực tế');
      await expect.poll(async () => listingDetailPage.isReportSubmitEnabled()).toBe(true);

      // Open report modal
      await listingDetailPage.openReportModal();
      await expect.poll(async () => listingDetailPage.reportModal.isVisible()).toBe(true);

      // Ensure detailed reason is empty and submit
      await listingDetailPage.reportModal.clearDescription();
      await listingDetailPage.reportModal.submit();

      // Expect validation error and modal remains open
      await expect.poll(async () => listingDetailPage.reportModal.errorMessage()).toMatch(
        /Vui l(?:ò|Ã²)ng nh(?:ậ|áº­)p l(?:ý|Ã½) do chi ti(?:ế|áº¿)t/i,
      );
      expect(await listingDetailPage.reportModal.isVisible()).toBe(true);

      // Modal can be closed
      await listingDetailPage.reportModal.close();
      await expect.poll(async () => listingDetailPage.reportModal.isVisible()).toBe(false);
    },
  );

  test(
    listingCaseTitle('TC-LIST-REPORT-001'),
    async ({ listingDetailPage, page }) => {
      let interceptedPayload: { reasons?: string[]; description?: string } | undefined;

      await page.route('**/api/v1/listings/*/reports', async (route) => {
        interceptedPayload = route.request().postDataJSON() as {
          reasons?: string[];
          description?: string;
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Cảm ơn bạn đã phản hồi.',
          }),
        });
      });

      await listingDetailPage.open(TARGET_LISTING_ID);

      await expect.poll(async () => listingDetailPage.isReportSectionVisible()).toBe(true);

      // Select reason
      await listingDetailPage.selectReportReason('Định giá chưa đúng với thực tế');
      await expect.poll(async () => listingDetailPage.isReportSubmitEnabled()).toBe(true);

      // Open modal
      await listingDetailPage.openReportModal();
      await expect.poll(async () => listingDetailPage.reportModal.isVisible()).toBe(true);

      // Verify modal content
      expect(await listingDetailPage.reportModal.title()).toBe('Báo cáo tin đăng');
      expect(await listingDetailPage.reportModal.subtitle()).toContain(
        'Bạn có chắc chắn muốn báo cáo tin đăng?',
      );
      const selectedReasons = await listingDetailPage.reportModal.selectedReasons();
      expect(selectedReasons).toContain('Định giá chưa đúng với thực tế');

      // Fill valid description
      const validDescription = 'Giá không đúng thực tế, tin ảo';
      await listingDetailPage.reportModal.fillDescription(validDescription);
      expect(await listingDetailPage.reportModal.descriptionValue()).toBe(validDescription);

      // Submit report
      await listingDetailPage.reportModal.submit();

      // Modal should automatically close
      await expect.poll(async () => listingDetailPage.reportModal.isVisible()).toBe(false);

      // Success toast appears
      await expect.poll(async () => listingDetailPage.toastMessage()).toContain(
        'Cảm ơn bạn đã phản hồi.',
      );

      // Verify API payload
      expect(interceptedPayload).toBeDefined();
      expect(interceptedPayload?.reasons).toContain('WRONG_PRICE');
      expect(interceptedPayload?.description).toBe(validDescription);
    },
  );
});
