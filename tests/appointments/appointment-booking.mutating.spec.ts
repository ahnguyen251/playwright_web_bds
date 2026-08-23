import { mutatingTest as test } from '../../fixtures/mutating.fixture';
import {
  appointmentCaseTitle,
} from '../../test-cases/appointments/appointment.test-cases';

test(appointmentCaseTitle('TC-APT-CREATE-001'), () => {
  test.skip(
    true,
    'MANUAL/RESEED REQUIRED: appointment creation persists backend state and has no approved cleanup contract.',
  );
});
