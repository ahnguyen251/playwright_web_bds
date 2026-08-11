import { expect, mutatingTest as test } from '../../fixtures/mutating.fixture';
import {
  appointmentCaseTitle,
  createAppointmentTestCase,
} from '../../test-cases/appointments/appointment.test-cases';

test(
  appointmentCaseTitle(createAppointmentTestCase),
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointment(appointmentData);
    await appointmentWorkflow.submitPreparedAppointment();

    await expect(appointmentPage.successHeading).toBeVisible();
    await expect(appointmentPage.formHeading).toBeHidden();
  },
);
