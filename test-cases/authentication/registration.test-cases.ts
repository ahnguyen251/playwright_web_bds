import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';
import type { RegistrationData } from '../../types/user.types';

interface RegistrationValidationTestCase extends TestCaseDefinition {
  readonly data: RegistrationData;
  readonly expectedMessages: readonly string[];
}

const validationData = AuthenticationDataFactory.getValidationData();
const registrationTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const registrationPreconditions = Object.freeze([
  'The visitor is signed out and the registration view is open.',
  'The scenario does not submit an account-creation request.',
]);

export const belowMinimumRegistrationPasswordTestCase: RegistrationValidationTestCase =
  Object.freeze({
    id: 'AUTH-REGISTER-001',
    title:
      'Registration reports invalid email, seven-character password, and confirmation mismatch',
    module: 'Authentication Registration',
    priority: 'high',
    tags: registrationTags,
    preconditions: registrationPreconditions,
    expectedResult: 'All applicable client-side validation messages are visible.',
    data: Object.freeze({
      fullName: validationData.unicodeFullName,
      email: validationData.invalidEmails[0] ?? 'plain-address',
      password: validationData.belowMinimumPassword,
      passwordConfirmation: validationData.mismatchedPassword,
    }),
    expectedMessages: Object.freeze([
      'Vui lòng nhập email hợp lệ',
      'Mật khẩu phải có ít nhất 8 ký tự',
      'Mật khẩu xác nhận không khớp',
    ]),
  });

export const minimumRegistrationPasswordTestCase: RegistrationValidationTestCase = Object.freeze({
  id: 'AUTH-REGISTER-002',
  title: 'Registration accepts a password at the eight-character minimum',
  module: 'Authentication Registration',
  priority: 'medium',
  tags: registrationTags,
  preconditions: registrationPreconditions,
  expectedResult: 'No minimum-length validation is displayed and no request is sent.',
  data: Object.freeze({
    fullName: validationData.unicodeFullName,
    email: 'automation.boundary@example.com',
    password: 'Abc12!xy',
    passwordConfirmation: 'Abc12!xy',
  }),
  expectedMessages: Object.freeze([]),
});

export const registrationPasswordMismatchTestCase: RegistrationValidationTestCase = Object.freeze({
  id: 'AUTH-REGISTER-003',
  title: 'Registration rejects a mismatched password confirmation',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: registrationPreconditions,
  expectedResult: 'The password-confirmation mismatch is reported without creating an account.',
  data: Object.freeze({
    fullName: validationData.unicodeFullName,
    email: 'automation.validation@example.com',
    password: validationData.validPassword,
    passwordConfirmation: validationData.mismatchedPassword,
  }),
  expectedMessages: Object.freeze(['Mật khẩu xác nhận không khớp']),
});

export const registrationTestCases = Object.freeze([
  belowMinimumRegistrationPasswordTestCase,
  minimumRegistrationPasswordTestCase,
  registrationPasswordMismatchTestCase,
]);
