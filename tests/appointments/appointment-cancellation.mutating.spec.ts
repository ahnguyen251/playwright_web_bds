import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import {
  appointmentCaseTitle,
} from '../../test-cases/appointments/appointment.test-cases';

test.describe('Appointment Cancellation Mutating Scenarios', () => {
  test(
    appointmentCaseTitle('TC-APT-CANCEL-001'),
    async ({ appointmentPage, appointmentWorkflow }) => {
      // Navigate to appointments
      await appointmentWorkflow.viewAppointments();

      // Look for a confirmed appointment card
      const cardCount = await appointmentPage.cardCount();
      let confirmedIndex = -1;

      for (let i = 0; i < cardCount; i++) {
        const status = await appointmentPage.getCardStatus(i);
        if (status === 'Đã xác nhận') {
          confirmedIndex = i;
          break;
        }
      }

      if (confirmedIndex === -1) {
        test.skip(
          true,
          'RESEED/CONFIRMED APPOINTMENT REQUIRED: Không tìm thấy bản ghi lịch hẹn "Đã xác nhận" khả dụng để thực hiện hủy.',
        );
        return;
      }

      // Execute cancellation workflow
      await appointmentWorkflow.cancelAppointment({
        cardIndex: confirmedIndex,
        reason: 'Lý do thời tiết/Sức khỏe',
      });

      // Verify success feedback
      await expect(appointmentPage.cancelModal.feedbackModal).toBeVisible();
      await expect(appointmentPage.cancelModal.feedbackTitle).toHaveText('Đã hủy lịch hẹn');

      // Verify status transitions to cancelled
      await expect(appointmentPage.getCard(confirmedIndex)).toContainText(/Khách hủy|Chủ nhà hủy/);
      await expect(appointmentPage.getCard(confirmedIndex)).toContainText('Lý do thời tiết/Sức khỏe');
    },
  );
});
