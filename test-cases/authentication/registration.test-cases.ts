import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';
import type { RegistrationData } from '../../types/user.types';
import type { UserAlias } from '../../types/user.types';

interface RegistrationTestCase extends TestCaseDefinition {
  readonly credentialAlias?: UserAlias;
  readonly credentials?: Readonly<{
    readonly email: string;
    readonly password: string;
    readonly passwordConfirmation: string;
  }>;
  readonly data?: RegistrationData;
  readonly invalidEmails?: readonly string[];
  readonly invalidPasswords?: readonly string[];
  readonly expectedMessages?: readonly string[];
  readonly expectedSubmitEnabled?: boolean;
  readonly otpConditions?: readonly ('incorrect' | 'expired')[];
  readonly countdown?: 'default';
}

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
  title:
    '[Happy Path] Đăng ký tài khoản thành công với thông tin hợp lệ, hoàn tất xác thực OTP',
  module: 'Authentication Registration',
  priority: 'critical',
  tags: externalRegistrationTags,
  preconditions: Object.freeze([
    ...signedOutRegistrationPreconditions,
    'The supplied email has never been registered and its test mailbox is available.',
  ]),
  expectedResult:
    'Nút Đăng ký hiển thị loading và bị disable; tài khoản chuyển ACTIVE, JWT được cấp và điều hướng thành công.',
  credentials: validationData.registrationSuccessCredentials,
});

export const requiredRegistrationFieldsTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-002',
  title: '[Required Validation] Chặn đăng ký khi bỏ trống các trường bắt buộc',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult:
    'Không gọi API tạo tài khoản; toàn bộ trường bắt buộc hiển thị lỗi trực quan dưới field.',
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
  expectedResult: 'Mỗi email sai hiển thị "Email không hợp lệ" theo thời gian thực.',
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
  expectedResult: 'Hiển thị "Email đã tồn tại" và không tạo tài khoản.',
  credentialAlias: 'defaultUser',
  expectedMessages: Object.freeze([validationData.expectedMessages.duplicateEmail]),
});

export const invalidRegistrationPasswordTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-005',
  title: '[Input Validation] Báo lỗi biên độ dài và định dạng ký tự của Mật khẩu',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult:
    'Mỗi mật khẩu sai hiển thị "Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số" theo thời gian thực.',
  invalidPasswords: validationData.invalidRegistrationPasswords,
  expectedMessages: Object.freeze([validationData.expectedMessages.invalidPassword]),
  expectedSubmitEnabled: false,
});

export const registrationConfirmationMismatchTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-006',
  title: '[Business Rule] Báo lỗi khi Xác nhận mật khẩu không khớp',
  module: 'Authentication Registration',
  priority: 'high',
  tags: registrationTags,
  preconditions: signedOutRegistrationPreconditions,
  expectedResult: 'Hiển thị ngay "Phải trùng khớp với mật khẩu đã nhập".',
  data: Object.freeze({
    fullName: validationData.unicodeFullName,
    email: 'automation.validation@example.com',
    password: validationData.validPassword,
    passwordConfirmation: validationData.mismatchedPassword,
  }),
  expectedMessages: Object.freeze([validationData.expectedMessages.mismatchedPassword]),
  expectedSubmitEnabled: false,
});

export const invalidOrExpiredRegistrationOtpTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-007',
  title: '[Negative / State] OTP sai hoặc hết hạn',
  module: 'Authentication Registration',
  priority: 'high',
  tags: externalRegistrationTags,
  preconditions: Object.freeze(['A valid registration has reached the OTP step.']),
  expectedResult: 'OTP sai hiển thị lỗi và cho nhập lại; OTP hết hạn yêu cầu gửi lại OTP.',
  otpConditions: Object.freeze(['incorrect', 'expired'] as const),
});

export const registrationOtpResendCountdownTestCase: RegistrationTestCase = Object.freeze({
  id: 'TC-AUTH-REGISTER-008',
  title: '[Boundary] Nút "Gửi lại OTP" bị disable trong countdown, enable sau khi hết',
  module: 'Authentication Registration',
  priority: 'medium',
  tags: externalRegistrationTags,
  preconditions: Object.freeze(['The registration OTP was just sent and the OTP view is open.']),
  expectedResult: 'Nút Gửi lại OTP bị disable trong countdown và chuyển enable sau khi hết.',
  countdown: 'default',
});

export const registrationTestCases = Object.freeze([
  registrationSuccessTestCase,
  requiredRegistrationFieldsTestCase,
  invalidRegistrationEmailTestCase,
  duplicateRegistrationEmailTestCase,
  invalidRegistrationPasswordTestCase,
  registrationConfirmationMismatchTestCase,
  invalidOrExpiredRegistrationOtpTestCase,
  registrationOtpResendCountdownTestCase,
]);

const legacyRegistrationPreconditions = Object.freeze([
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
    preconditions: legacyRegistrationPreconditions,
    expectedResult: 'All applicable client-side validation messages are visible.',
    data: Object.freeze({
      fullName: validationData.unicodeFullName,
      email: validationData.invalidRegistrationEmails[0] ?? 'auto_reg@gmail',
      password: validationData.invalidRegistrationPasswords[0] ?? '1234567',
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
  preconditions: legacyRegistrationPreconditions,
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
  preconditions: legacyRegistrationPreconditions,
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

const registrationOtpTags = Object.freeze([TAGS.regression, TAGS.authentication, TAGS.otp]);

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
