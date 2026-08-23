import { expect, test } from '../../fixtures/test.fixture';
import {
  appointmentCaseTitle,
} from '../../test-cases/appointments/appointment.test-cases';

test(
  appointmentCaseTitle('TC-APT-CREATE-003') + ' - time',
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointmentWithoutTime(appointmentData);

    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);

test(
  appointmentCaseTitle('TC-APT-CREATE-003') + ' - name',
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointment({ ...appointmentData, fullName: '' });

    await expect(appointmentPage.nameRequiredError).toBeVisible();
    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);

test(
  appointmentCaseTitle('TC-APT-CREATE-003') + ' - phone',
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointment({
      ...appointmentData,
      phone: '0101234567',
    });

    await expect(appointmentPage.phoneInvalidError).toBeVisible();
    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);

test(
  appointmentCaseTitle('TC-APT-CREATE-003') + ' - email',
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointment({
      ...appointmentData,
      email: 'automation@example.test',
    });

    await expect(appointmentPage.emailInvalidError).toBeVisible();
    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);
