import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';
import type { RegistrationData } from '../../types/user.types';

interface RegistrationValidationTestCase extends TestCaseDefinition {
  readonly data: RegistrationData;
  readonly expectedMessages: readonly string[];
  readonly expectedSubmitEnabled: boolean;
}

interface RegistrationOtpTestCase extends TestCaseDefinition {
  readonly code?: string;
  readonly expectedValues?: readonly string[];
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
    expectedSubmitEnabled: false,
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
  expectedSubmitEnabled: true,
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
  expectedSubmitEnabled: false,
});

const registrationOtpTags = Object.freeze([
  TAGS.regression,
  TAGS.authentication,
  TAGS.otp,
]);

export const registrationOtpEntryContractTestCase: RegistrationOtpTestCase = Object.freeze({
  id: 'AUTH-REGISTER-OTP-002',
  title: 'Registration OTP entry requires exactly six numeric digits',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationOtpTags,
  preconditions: Object.freeze([
    'The registration OTP view exposes exactly six single-character numeric inputs.',
    'No OTP verification request is submitted by this component scenario.',
  ]),
  expectedResult: 'The six digits are entered in order and malformed OTP values are rejected.',
  code: '123456',
  expectedValues: Object.freeze(['1', '2', '3', '4', '5', '6']),
});

export const incorrectRegistrationOtpFeedbackTestCase: RegistrationOtpTestCase = Object.freeze({
  id: 'AUTH-REGISTER-OTP-003',
  title: 'Registration exposes incorrect OTP feedback',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationOtpTags,
  preconditions: Object.freeze([
    'The registration OTP view has rendered a server rejection as an alert.',
  ]),
  expectedResult: 'The Page Object returns the visible incorrect-OTP feedback.',
});

export const expiredRegistrationOtpFeedbackTestCase: RegistrationOtpTestCase = Object.freeze({
  id: 'AUTH-REGISTER-OTP-004',
  title: 'Registration exposes expired OTP feedback',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationOtpTags,
  preconditions: Object.freeze([
    'The registration OTP view has rendered the deployed expired-OTP state.',
  ]),
  expectedResult: 'The Page Object reports that the OTP has expired.',
});

export const registrationTestCases = Object.freeze([
  belowMinimumRegistrationPasswordTestCase,
  minimumRegistrationPasswordTestCase,
  registrationPasswordMismatchTestCase,
  registrationOtpEntryContractTestCase,
  incorrectRegistrationOtpFeedbackTestCase,
  expiredRegistrationOtpFeedbackTestCase,
]);
