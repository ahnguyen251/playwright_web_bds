import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const appointmentTags = [TAGS.regression, TAGS.appointments] as const;

export const createAppointmentTestCase: TestCaseDefinition = Object.freeze({
  id: 'APPOINTMENT-001',
  title: 'Create appointment successfully',
  module: 'Appointments',
  priority: 'critical',
  tags: [TAGS.smoke, ...appointmentTags],
  preconditions: [
    'The user is authenticated.',
    'APPOINTMENT_LISTING_ID identifies a published listing owned by another user.',
    'The listing has an available appointment slot and no unfinished booking for this user.',
    'Mutation execution is explicitly enabled on dev or staging.',
  ],
  expectedResult: 'The success confirmation is visible and the booking popup closes.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const requireAppointmentTimeTestCase: TestCaseDefinition = Object.freeze({
  id: 'APPOINTMENT-002',
  title: 'Require appointment time',
  module: 'Appointments',
  priority: 'high',
  tags: appointmentTags,
  preconditions: [
    'The user is authenticated.',
    'The configured eligible listing exposes appointment dates and time slots.',
  ],
  expectedResult: 'Submission remains disabled until a time slot is selected.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const requireContactNameTestCase: TestCaseDefinition = Object.freeze({
  id: 'APPOINTMENT-003',
  title: 'Require contact name',
  module: 'Appointments',
  priority: 'high',
  tags: appointmentTags,
  preconditions: ['The appointment form is open for an eligible listing.'],
  expectedResult: 'The required-name validation message is visible.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const validateVietnamesePhoneTestCase: TestCaseDefinition = Object.freeze({
  id: 'APPOINTMENT-004',
  title: 'Validate Vietnamese phone number',
  module: 'Appointments',
  priority: 'high',
  tags: appointmentTags,
  preconditions: ['The appointment form is open for an eligible listing.'],
  expectedResult: 'The Vietnamese phone-format validation message is visible.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const requireGmailEmailTestCase: TestCaseDefinition = Object.freeze({
  id: 'APPOINTMENT-005',
  title: 'Require Gmail email address',
  module: 'Appointments',
  priority: 'high',
  tags: appointmentTags,
  preconditions: ['The appointment form is open for an eligible listing.'],
  expectedResult: 'The Gmail-address validation message is visible.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const appointmentCaseTitle = (testCase: TestCaseDefinition): string =>
  `${testCase.id} ${testCase.title} ${testCase.tags.join(' ')}`;
