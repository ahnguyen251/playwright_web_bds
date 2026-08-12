import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';

const recoveryTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const validationData = AuthenticationDataFactory.getValidationData();

export const invalidEmailPasswordRecoveryTestCase = Object.freeze({
  id: 'AUTH-RECOVERY-001',
  title: 'Password recovery disables OTP request for an invalid email',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: recoveryTags,
  preconditions: Object.freeze([
    'The visitor is signed out.',
    'No password-reset request may be submitted by this scenario.',
  ]),
  expectedResult: 'The OTP request remains disabled until the email is valid.',
  email: validationData.invalidEmails[0] ?? 'plain-address',
  expectedRequestEnabled: false,
}) satisfies TestCaseDefinition & {
  readonly email: string;
  readonly expectedRequestEnabled: boolean;
};

export const passwordRecoveryTestCases = Object.freeze([invalidEmailPasswordRecoveryTestCase]);
