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

test.describe('Appointment Lifecycle Read-Only Validations', () => {
  test(
    appointmentCaseTitle('TC-APT-CREATE-002') + ' - own listing blocked',
    async ({ page, appointmentDataFor, appointmentPage, appointmentWorkflow }) => {
      const listingId = Number(process.env.APPOINTMENT_LISTING_ID ?? 48);
      const data = appointmentDataFor(listingId);

      await page.route('**/v1/appointment-bookings', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Bạn không thể đặt lịch căn hộ của chính mình',
          }),
        });
      });

      await appointmentWorkflow.prepareAppointment(data);
      await appointmentPage.submitAppointment();
      await appointmentPage.confirmBookingSubmission();

      await expect(appointmentPage.failureHeading).toBeVisible();
      await expect(appointmentPage.failureMessage).toHaveText(
        'Bạn không thể đặt lịch căn hộ của chính mình',
      );
      await appointmentPage.closeFailurePopup();
    },
  );

  test(
    appointmentCaseTitle('TC-APT-CREATE-002') + ' - duplicate appointment blocked',
    async ({ page, appointmentDataFor, appointmentPage, appointmentWorkflow }) => {
      const listingId = Number(process.env.APPOINTMENT_LISTING_ID ?? 48);
      const data = appointmentDataFor(listingId);

      await page.route('**/v1/appointment-bookings', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại.',
          }),
        });
      });

      await appointmentWorkflow.prepareAppointment(data);
      await appointmentPage.submitAppointment();
      await appointmentPage.confirmBookingSubmission();

      await expect(appointmentPage.failureHeading).toBeVisible();
      await expect(appointmentPage.failureMessage).toHaveText(
        'Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại.',
      );
      await appointmentPage.closeFailurePopup();
    },
  );

  test(
    appointmentCaseTitle('TC-APT-REJECT-001') + ' - empty reason disables submit',
    async ({ page, appointmentPage }) => {
      await page.route('**/v1/appointment-bookings/received*', async (route) => {
        const response = await route.fetch();
        const json = (await response.json()) as MockBookingResponse;
        if (Array.isArray(json.data) && !json.data.some((b) => b.status === 'PENDING')) {
          json.data.unshift({
            id: 999992,
            status: 'PENDING',
            listing_id: 41,
            listing_title: 'Căn hộ kiểm thử từ chối lịch',
            contact_name: 'Nguyễn Văn Khách',
            contact_phone: '0901234567',
            contact_email: 'guest@example.com',
            appointment_date: '2026-12-31',
            time_slot: '14:00 - 15:00',
            confirm_deadline: '2026-12-31 12:00:00',
          });
        }
        await route.fulfill({ response, json });
      });

      await appointmentPage.open();
      await appointmentPage.selectView('owner');
      await expect(appointmentPage.cards.first()).toBeVisible();

      const modal = await appointmentPage.clickRejectButton(0);
      await expect(modal.root).toBeVisible();
      await expect(modal.modalTitle).toHaveText('Từ chối lịch hẹn');

      await expect(modal.submitButton).toBeDisabled();

      await modal.selectReason('Khác');
      await expect(modal.customReasonTextarea).toBeVisible();
      await modal.fillCustomReason('   ');
      await expect(modal.submitButton).toBeDisabled();

      await modal.fillCustomReason('Khung giờ này tôi có lịch bàn giao căn hộ khác');
      await expect(modal.submitButton).toBeEnabled();

      await modal.back();
      await expect(modal.root).toBeHidden();
    },
  );
});
