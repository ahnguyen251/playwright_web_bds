import { expect, test } from '../../fixtures/test.fixture';
import {
  appointmentCaseTitle,
  requireAppointmentTimeTestCase,
  requireContactNameTestCase,
  requireGmailEmailTestCase,
  validateVietnamesePhoneTestCase,
} from '../../test-cases/appointments/appointment.test-cases';

test(
  appointmentCaseTitle(requireAppointmentTimeTestCase),
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointmentWithoutTime(appointmentData);

    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);

test(
  appointmentCaseTitle(requireContactNameTestCase),
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointment({ ...appointmentData, fullName: '' });

    await expect(appointmentPage.nameRequiredError).toBeVisible();
    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);

test(
  appointmentCaseTitle(validateVietnamesePhoneTestCase),
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
  appointmentCaseTitle(requireGmailEmailTestCase),
  async ({ appointmentData, appointmentPage, appointmentWorkflow }) => {
    await appointmentWorkflow.prepareAppointment({
      ...appointmentData,
      email: 'automation@example.test',
    });

    await expect(appointmentPage.emailInvalidError).toBeVisible();
    await expect(appointmentPage.submitButton).toBeDisabled();
  },
);
