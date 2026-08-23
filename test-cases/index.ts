import { appointmentTestCases } from './appointments/appointment.test-cases';
import { loginTestCases } from './authentication/login.test-cases';
import { passwordRecoveryTestCases } from './authentication/password-recovery.test-cases';
import { profileTestCases } from './authentication/profile.test-cases';
import { registrationTestCases } from './authentication/registration.test-cases';
import { listingTestCases } from './listings/listing.test-cases';
import { homeTestCases } from './home/home.test-cases';
import { rankingTestCases } from './ranking/ranking.test-cases';
import { transactionTestCases } from './transactions/transaction.test-cases';
import { packageTestCases } from './packages/package.test-cases';
import { chatTestCases } from './chat/chat.test-cases';
import type { TestCaseDefinition } from '../types/test-case.types';

export const allTestCases: readonly TestCaseDefinition[] = Object.freeze([
  ...registrationTestCases,
  ...loginTestCases,
  ...passwordRecoveryTestCases,
  ...profileTestCases,
  ...homeTestCases,
  ...rankingTestCases,
  ...listingTestCases,
  ...appointmentTestCases,
  ...transactionTestCases,
  ...packageTestCases,
  ...chatTestCases,
]);
