import { expect, test } from '../../fixtures/test.fixture';
import {
  appointmentCaseTitle,
} from '../../test-cases/appointments/appointment.test-cases';

interface MockBookingItem {
  id: number;
  status: string;
  listing_id?: number;
  listing_title?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  appointment_date?: string;
  time_slot?: string;
  confirm_deadline?: string;
}

interface MockBookingResponse {
  data: MockBookingItem[];
}

test.describe('Appointment Cancellation Read-Only Validations', () => {
  test.beforeEach(async ({ appointmentPage }) => {
    await appointmentPage.open();
  });

  test(
    appointmentCaseTitle('TC-APT-CANCEL-002') + ' - empty reason disables submit',
    async ({ page, appointmentPage }) => {
      // 1. Intercept GET appointment-bookings to inject an APPROVED booking
      await page.route('**/v1/appointment-bookings', async (route) => {
        if (route.request().method() !== 'GET' || route.request().url().includes('/received')) {
          await route.continue();
          return;
        }
        const response = await route.fetch();
        const json = (await response.json()) as MockBookingResponse;
        if (Array.isArray(json.data) && !json.data.some((b) => b.status === 'APPROVED')) {
          json.data.unshift({
            id: 999991,
            status: 'APPROVED',
            listing_id: 41,
            listing_title: 'Căn hộ kiểm thử hủy lịch',
            contact_name: 'Nguyễn Văn Test',
            contact_phone: '0901234567',
            contact_email: 'test@example.com',
            appointment_date: '2026-12-31',
            time_slot: '09:00 - 10:00',
            confirm_deadline: '2026-12-31 07:00:00',
          });
        }
        await route.fulfill({ response, json });
      });

      // Reload to apply intercepted data
      await appointmentPage.open();
      await expect(appointmentPage.cards.first()).toBeVisible();

      // Click cancel button on the first card that has it
      const modal = await appointmentPage.clickCancelButton(0);
      await expect(modal.root).toBeVisible();

      // Case 2a: Initially no reason selected -> submit button must be disabled
      await expect(modal.submitButton).toBeDisabled();

      // Case 2b: Select 'Khác' with empty textarea -> submit button must still be disabled
      await modal.selectReason('Khác');
      await expect(modal.customReasonTextarea).toBeVisible();
      await modal.fillCustomReason('   ');
      await expect(modal.submitButton).toBeDisabled();

      // Case 2c: Enter valid custom reason -> submit button becomes enabled
      await modal.fillCustomReason('Có việc bận đột xuất không thể tham gia');
      await expect(modal.submitButton).toBeEnabled();

      // Case 2d: Dismiss modal
      await modal.back();
      await expect(modal.root).toBeHidden();
    },
  );

  test(
    appointmentCaseTitle('TC-APT-CANCEL-002') + ' - under 2h cancellation blocked',
    async ({ page, appointmentPage }) => {
      // Intercept cancel API call to simulate backend error for <2h cancellation
      await page.route('**/v1/appointment-bookings/cancel', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'chỉ được hủy trước giờ hẹn tối thiểu 2 giờ',
          }),
        });
      });

      // Inject an approved booking
      await page.route('**/v1/appointment-bookings', async (route) => {
        if (route.request().method() !== 'GET' || route.request().url().includes('/received')) {
          await route.continue();
          return;
        }
        const response = await route.fetch();
        const json = (await response.json()) as MockBookingResponse;
        if (Array.isArray(json.data)) {
          json.data.unshift({
            id: 999992,
            status: 'APPROVED',
            listing_id: 41,
            listing_title: 'Lịch cận giờ',
            contact_name: 'Khách Test Cận Giờ',
            contact_phone: '0901234567',
            contact_email: 'test@example.com',
            appointment_date: '2026-09-20',
            time_slot: '21:00 - 22:00',
            confirm_deadline: '2026-09-20 20:00:00',
          });
        }
        await route.fulfill({ response, json });
      });

      await appointmentPage.open();
      await expect(appointmentPage.cards.first()).toBeVisible();

      const modal = await appointmentPage.clickCancelButton(0);
      await expect(modal.root).toBeVisible();

      // Select valid reason and submit
      await modal.selectReason('Việc bận đột xuất');
      await expect(modal.submitButton).toBeEnabled();
      await modal.submit();

      // Verify failure toast displays error message
      await expect(modal.feedbackModal).toBeVisible();
      await expect(modal.feedbackTitle).toHaveText('Thất bại');
      await expect(modal.feedbackDescription).toHaveText(
        'chỉ được hủy trước giờ hẹn tối thiểu 2 giờ',
      );
    },
  );

  test(
    appointmentCaseTitle('TC-APT-CANCEL-003') + ' - closed appointments hide cancel button',
    async ({ appointmentPage }) => {
      await expect(appointmentPage.cards.first()).toBeVisible();
      const cardCount = await appointmentPage.cardCount();
      expect(cardCount).toBeGreaterThan(0);

      // Verify all closed cards have no cancel button
      for (let i = 0; i < cardCount; i++) {
        const status = await appointmentPage.getCardStatus(i);
        const closedStatuses = [
          'Quá thời gian xác nhận',
          'Khách hủy',
          'Chủ nhà hủy',
          'Hoàn thành',
          'Bị từ chối',
        ];
        if (closedStatuses.includes(status)) {
          const hasCancel = await appointmentPage.hasCancelButton(i);
          expect(hasCancel).toBe(false);
        }
      }
    },
  );

  test(
    appointmentCaseTitle('TC-APT-CANCEL-003') + ' - api rejects cancelling closed appointment',
    async ({ page, appointmentPage }) => {
      // Intercept cancel API response when attempting to cancel an already closed appointment
      await page.route('**/v1/appointment-bookings/cancel', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Trạng thái lịch hẹn không hợp lệ để thực hiện thao tác',
          }),
        });
      });

      // Inject an approved booking to trigger the cancel action on UI
      await page.route('**/v1/appointment-bookings', async (route) => {
        if (route.request().method() !== 'GET' || route.request().url().includes('/received')) {
          await route.continue();
          return;
        }
        const response = await route.fetch();
        const json = (await response.json()) as MockBookingResponse;
        if (Array.isArray(json.data)) {
          json.data.unshift({
            id: 999993,
            status: 'APPROVED',
            listing_title: 'Lịch hẹn đã đóng',
            contact_name: 'Khách Test',
            contact_phone: '0901234567',
            contact_email: 'test@example.com',
            appointment_date: '2026-06-01',
            time_slot: '09:00 - 10:00',
          });
        }
        await route.fulfill({ response, json });
      });

      await appointmentPage.open();
      await expect(appointmentPage.cards.first()).toBeVisible();

      const modal = await appointmentPage.clickCancelButton(0);
      await modal.selectReason('Thay đổi kế hoạch');
      await modal.submit();

      // Verify system rejects with expected business rule error message
      await expect(modal.feedbackModal).toBeVisible();
      await expect(modal.feedbackTitle).toHaveText('Thất bại');
      await expect(modal.feedbackDescription).toHaveText(
        'Trạng thái lịch hẹn không hợp lệ để thực hiện thao tác',
      );
    },
  );
});
