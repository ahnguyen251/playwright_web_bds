import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';
import type { RegistrationData } from '../../types/user.types';

interface RegistrationTestCase extends TestCaseDefinition {
  readonly data?: RegistrationData;
  readonly invalidEmails?: readonly string[];
  readonly invalidPasswords?: readonly string[];
  readonly expectedMessages?: readonly string[];
  readonly expectedSubmitEnabled?: boolean;
}

const validationData = AuthenticationDataFactory.getValidationData();
const registrationTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const externalRegistrationTags = Object.freeze([
  ...registrationTags,
  TAGS.external,
  TAGS.otp,
  TAGS.mutating,
]);
const signedOutRegistrationPreconditions = Object.freeze([
  'The visitor is signed out and the registration view is open.',
]);

export const registrationSuccessTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-001',
  title: '[Happy Path] Đăng ký tài khoản thành công với thông tin hợp lệ, hoàn tất xác thực OTP',
  module: 'Authentication Registration',
  priority: 'critical',
  tags: externalRegistrationTags,
  preconditions: Object.freeze([
    ...signedOutRegistrationPreconditions,
    'The supplied email has never been registered and its test mailbox is available.',
  ]),
  expectedResult: 'The account becomes active, receives a JWT, and navigates successfully.',
});

export const requiredRegistrationFieldsTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-002',
  title: '[Required Validation] Chặn đăng ký khi bỏ trống các trường bắt buộc',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult: 'No account-creation request is sent and every required field shows an error.',
  data: Object.freeze({ fullName: '', email: '', password: '', passwordConfirmation: '' }),
  expectedSubmitEnabled: false,
});

export const invalidRegistrationEmailTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-003',
  title: '[Input Validation] Chặn đăng ký khi Email sai định dạng',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult: 'Each invalid address is rejected in real time with the invalid-email message.',
  invalidEmails: validationData.invalidRegistrationEmails,
  expectedMessages: Object.freeze([validationData.expectedMessages.invalidEmail]),
  expectedSubmitEnabled: false,
});

export const duplicateRegistrationEmailTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-004',
  title: '[Business Rule] Chặn đăng ký khi Email đã tồn tại',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: Object.freeze(['An existing account is available for the configured email.']),
  expectedResult: 'The duplicate-email message is displayed and no account is created.',
  expectedMessages: Object.freeze([validationData.expectedMessages.duplicateEmail]),
});

export const invalidRegistrationPasswordTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-005',
  title: '[Input Validation] Báo lỗi biên độ dài và định dạng ký tự của Mật khẩu',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult: 'Each invalid password is rejected in real time with the password-rule message.',
  invalidPasswords: validationData.invalidRegistrationPasswords,
  expectedMessages: Object.freeze([validationData.expectedMessages.invalidPassword]),
  expectedSubmitEnabled: false,
});

export const registrationPasswordMismatchTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-006',
  title: '[Business Rule] Báo lỗi khi Xác nhận mật khẩu không khớp',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult: 'The confirmation mismatch is reported immediately.',
  data: Object.freeze({
    fullName: validationData.unicodeFullName,
    email: 'automation.validation@example.com',
    password: validationData.validPassword,
    passwordConfirmation: validationData.mismatchedPassword,
  }),
  expectedMessages: Object.freeze([validationData.expectedMessages.mismatchedPassword]),
  expectedSubmitEnabled: false,
}) satisfies RegistrationTestCase & {
  readonly data: RegistrationData;
  readonly expectedMessages: readonly string[];
  readonly expectedSubmitEnabled: boolean;
};

export const invalidOrExpiredRegistrationOtpTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-007',
  title: '[Negative / State] OTP sai hoặc hết hạn',
  module: 'Authentication Registration',
  priority: 'high',
  tags: externalRegistrationTags,
  preconditions: Object.freeze(['A valid registration has reached the OTP step.']),
  expectedResult: 'Invalid OTP can be retried; expired OTP requires a new OTP request.',
});

export const registrationOtpResendCountdownTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-008',
  title: '[Boundary] Nút "Gửi lại OTP" bị disable trong countdown, enable sau khi hết',
  module: 'Authentication Registration',
  priority: 'medium',
  tags: externalRegistrationTags,
  preconditions: Object.freeze(['The registration OTP was just sent and the OTP view is open.']),
  expectedResult: 'Resend is disabled during the countdown and enabled afterwards.',
});

export const registrationTestCases = Object.freeze([
  registrationSuccessTestCase,
  requiredRegistrationFieldsTestCase,
  invalidRegistrationEmailTestCase,
  duplicateRegistrationEmailTestCase,
  invalidRegistrationPasswordTestCase,
  registrationPasswordMismatchTestCase,
  invalidOrExpiredRegistrationOtpTestCase,
  registrationOtpResendCountdownTestCase,
]);

// Compatibility metadata for pre-unified executable tests. These are replaced in Task 4.
export const belowMinimumRegistrationPasswordTestCase = Object.freeze({
  ...registrationPasswordMismatchTestCase,
  data: Object.freeze({
    fullName: validationData.unicodeFullName,
    email: validationData.invalidRegistrationEmails[0] ?? 'auto_reg@gmail',
    password: validationData.invalidRegistrationPasswords[0] ?? '1234567',
    passwordConfirmation: validationData.mismatchedPassword,
  }),
  expectedMessages: Object.freeze([
    validationData.expectedMessages.invalidEmail,
    validationData.expectedMessages.invalidPassword,
    validationData.expectedMessages.mismatchedPassword,
  ]),
  expectedSubmitEnabled: false,
});

export const minimumRegistrationPasswordTestCase = Object.freeze({
  ...registrationPasswordMismatchTestCase,
  data: Object.freeze({
    fullName: validationData.unicodeFullName,
    email: 'automation.boundary@example.com',
    password: 'Abc12!xy',
    passwordConfirmation: 'Abc12!xy',
  }),
  expectedMessages: Object.freeze([]),
  expectedSubmitEnabled: true,
});

export const registrationOtpEntryContractTestCase = invalidOrExpiredRegistrationOtpTestCase;
export const incorrectRegistrationOtpFeedbackTestCase = invalidOrExpiredRegistrationOtpTestCase;
export const expiredRegistrationOtpFeedbackTestCase = invalidOrExpiredRegistrationOtpTestCase;
