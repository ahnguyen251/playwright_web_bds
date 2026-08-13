import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';

interface PasswordRecoveryTestCase extends TestCaseDefinition {
  readonly newPassword?: string;
  readonly emailSource?: 'unique-unregistered';
  readonly otpConditions?: readonly ('incorrect' | 'expired')[];
}

const recoveryTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const externalRecoveryTags = Object.freeze([
  ...recoveryTags,
  TAGS.external,
  TAGS.otp,
  TAGS.mutating,
]);
const validationData = AuthenticationDataFactory.getValidationData();

export const successfulPasswordRecoveryTestCase: PasswordRecoveryTestCase = Object.freeze({
  id: 'TC-AUTH-FORGOT-001',
  title: '[Happy Path / E2E] Khôi phục mật khẩu thành công qua OTP Email',
  module: 'Authentication Password Recovery',
  priority: 'critical',
  tags: externalRecoveryTags,
  preconditions: Object.freeze(['An active account and its test mailbox are configured.']),
  expectedResult: 'Khôi phục mật khẩu thành công và điều hướng về trang Đăng nhập.',
  newPassword: validationData.passwordRecoveryNewPassword,
});

export const nonexistentEmailPasswordRecoveryTestCase: PasswordRecoveryTestCase = Object.freeze({
  id: 'TC-AUTH-FORGOT-002',
  title: '[Negative] Email không tồn tại',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: recoveryTags,
  preconditions: Object.freeze(['The visitor is signed out.']),
  expectedResult: 'Hiển thị lỗi, dừng luồng và không gửi OTP.',
  emailSource: validationData.nonexistentEmailSource,
});

export const invalidOrExpiredPasswordRecoveryOtpTestCase: PasswordRecoveryTestCase = Object.freeze({
  id: 'TC-AUTH-FORGOT-003',
  title: '[Negative / State] OTP sai hoặc hết hạn',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: externalRecoveryTags,
  preconditions: Object.freeze(['A valid password-reset OTP was sent.']),
  expectedResult: 'OTP sai hiển thị lỗi và cho nhập lại; OTP hết hạn yêu cầu gửi lại OTP.',
  otpConditions: Object.freeze(['incorrect', 'expired'] as const),
});

export const passwordRecoveryTestCases = Object.freeze([
  successfulPasswordRecoveryTestCase,
  nonexistentEmailPasswordRecoveryTestCase,
  invalidOrExpiredPasswordRecoveryOtpTestCase,
]);

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
  email: validationData.invalidRegistrationEmails[0] ?? 'auto_reg@gmail',
  expectedRequestEnabled: false,
}) satisfies TestCaseDefinition & {
  readonly email: string;
  readonly expectedRequestEnabled: boolean;
};
