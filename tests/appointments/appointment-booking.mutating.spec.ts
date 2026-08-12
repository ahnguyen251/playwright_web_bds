import { mutatingTest as test } from '../../fixtures/mutating.fixture';
import {
  appointmentCaseTitle,
  createAppointmentTestCase,
} from '../../test-cases/appointments/appointment.test-cases';

test(appointmentCaseTitle(createAppointmentTestCase), () => {
  test.skip(
    true,
    'MANUAL/RESEED REQUIRED: appointment creation persists backend state and has no approved cleanup contract.',
  );
});
