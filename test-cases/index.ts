import {
  createAppointmentTestCase,
  requireAppointmentTimeTestCase,
  requireContactNameTestCase,
  validateVietnamesePhoneTestCase,
  requireGmailEmailTestCase,
} from './appointments/appointment.test-cases';
import { loginTestCases } from './authentication/login.test-cases';
import { passwordRecoveryTestCases } from './authentication/password-recovery.test-cases';
import { profileTestCases } from './authentication/profile.test-cases';
import { registrationTestCases } from './authentication/registration.test-cases';
import { listingTestCases } from './listings/listing.test-cases';
import type { TestCaseDefinition } from '../types/test-case.types';

export const allTestCases: readonly TestCaseDefinition[] = Object.freeze([
  createAppointmentTestCase,
  requireAppointmentTimeTestCase,
  requireContactNameTestCase,
  validateVietnamesePhoneTestCase,
  requireGmailEmailTestCase,
  ...loginTestCases,
  ...passwordRecoveryTestCases,
  ...profileTestCases,
  ...registrationTestCases,
  ...listingTestCases,
]);
