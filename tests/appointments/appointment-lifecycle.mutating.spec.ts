import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import {
  appointmentCaseTitle,
} from '../../test-cases/appointments/appointment.test-cases';

test.describe('Appointment Lifecycle Mutating Scenarios', () => {
  test(
    appointmentCaseTitle('TC-APT-CONFIRM-001'),
    async ({ appointmentPage, appointmentWorkflow }) => {
      await appointmentWorkflow.viewAppointments();
      await appointmentPage.selectView('owner');

      const cardCount = await appointmentPage.cardCount();
      let pendingIndex = -1;

      for (let i = 0; i < cardCount; i++) {
        const status = await appointmentPage.getCardStatus(i);
        if (status === 'Chờ xử lý') {
          pendingIndex = i;
          break;
        }
      }

      if (pendingIndex === -1) {
        test.skip(
          true,
          'RESEED/PENDING APPOINTMENT REQUIRED: Không tìm thấy bản ghi lịch hẹn "Chờ xử lý" khả dụng để thực hiện xác nhận.',
        );
        return;
      }

      await appointmentWorkflow.confirmAppointment(pendingIndex);

      await expect(appointmentPage.confirmModal.feedbackModal).toBeVisible();
      await expect(appointmentPage.confirmModal.feedbackTitle).toHaveText('Xác nhận thành công!');

      await expect(appointmentPage.getCard(pendingIndex)).toContainText('Đã xác nhận');
    },
  );

  test(
    appointmentCaseTitle('TC-APT-REJECT-001'),
    async ({ appointmentPage, appointmentWorkflow }) => {
      await appointmentWorkflow.viewAppointments();
      await appointmentPage.selectView('owner');

      const cardCount = await appointmentPage.cardCount();
      let pendingIndex = -1;

      for (let i = 0; i < cardCount; i++) {
        const status = await appointmentPage.getCardStatus(i);
        if (status === 'Chờ xử lý') {
          pendingIndex = i;
          break;
        }
      }

      if (pendingIndex === -1) {
        test.skip(
          true,
          'RESEED/PENDING APPOINTMENT REQUIRED: Không tìm thấy bản ghi lịch hẹn "Chờ xử lý" khả dụng để thực hiện từ chối.',
        );
        return;
      }

      const rejectReason = 'Trùng lịch đột xuất';

      await appointmentWorkflow.rejectAppointment({
        cardIndex: pendingIndex,
        reason: rejectReason,
      });

      await expect(appointmentPage.rejectModal.feedbackModal).toBeVisible();
      await expect(appointmentPage.rejectModal.feedbackTitle).toHaveText('Đã từ chối lịch hẹn');

      await expect(appointmentPage.getCard(pendingIndex)).toContainText('Chủ nhà hủy');
      await expect(appointmentPage.getCard(pendingIndex)).toContainText(rejectReason);
    },
  );
});
