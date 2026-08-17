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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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
  automation: { status: 'NOT_AUTOMATED' as const },
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


