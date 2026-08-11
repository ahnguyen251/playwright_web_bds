import { AuthenticationWorkflow } from '../../../workflows/authentication/AuthenticationWorkflow';
import { AppointmentWorkflow } from '../../../workflows/appointments/AppointmentWorkflow';
import { AppointmentPage } from '../../../pages/appointments/AppointmentPage';
import { LoginPage } from '../../../pages/authentication/LoginPage';
import { expect, test } from '../../../fixtures/test.fixture';

test('BaseTest composition provides real Page Objects and Workflows', ({
  loginPage,
  authenticationWorkflow,
}) => {
  expect(loginPage).toBeInstanceOf(LoginPage);
  expect(authenticationWorkflow).toBeInstanceOf(AuthenticationWorkflow);
});

test('composes appointment dependencies and environment-independent data', ({
  appointmentPage,
  appointmentWorkflow,
  appointmentDataFor,
}) => {
  expect(appointmentPage).toBeInstanceOf(AppointmentPage);
  expect(appointmentWorkflow).toBeInstanceOf(AppointmentWorkflow);
  expect(appointmentDataFor(48)).not.toBe(appointmentDataFor(48));
});
