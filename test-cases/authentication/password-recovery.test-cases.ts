import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';

interface PasswordRecoveryTestCase extends TestCaseDefinition {
  readonly expectedMessage?: string;
  readonly email?: string;
  readonly expectedRequestEnabled?: boolean;
}

const validationData = AuthenticationDataFactory.getValidationData();
const recoveryTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const externalRecoveryTags = Object.freeze([...recoveryTags, TAGS.external, TAGS.otp, TAGS.mutating]);

export const successfulPasswordRecoveryTestCase: PasswordRecoveryTestCase = Object.freeze({
  id: 'TC-AUTH-FORGOT-001',
  title: '[Happy Path / E2E] Khôi phục mật khẩu thành công qua OTP Email',
  module: 'Authentication Password Recovery',
  priority: 'critical',
  tags: externalRecoveryTags,
  preconditions: Object.freeze(['An active account and its test mailbox are configured.']),
  expectedResult: 'Password recovery succeeds and redirects the user to login.',
});

export const nonexistentEmailPasswordRecoveryTestCase: PasswordRecoveryTestCase = Object.freeze({
  id: 'TC-AUTH-FORGOT-002',
  title: '[Negative] Email không tồn tại',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: recoveryTags,
  preconditions: Object.freeze(['The visitor is signed out.']),
  expectedResult: 'An error is displayed and no OTP is sent.',
});

export const invalidOrExpiredPasswordRecoveryOtpTestCase: PasswordRecoveryTestCase = Object.freeze({
  id: 'TC-AUTH-FORGOT-003',
  title: '[Negative / State] OTP sai hoặc hết hạn',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: externalRecoveryTags,
  preconditions: Object.freeze(['A valid password-reset OTP was sent.']),
  expectedResult: 'Invalid OTP can be retried; expired OTP requires a new OTP request.',
});

export const passwordRecoveryTestCases = Object.freeze([
  successfulPasswordRecoveryTestCase,
  nonexistentEmailPasswordRecoveryTestCase,
  invalidOrExpiredPasswordRecoveryOtpTestCase,
]);

// Compatibility metadata for pre-unified executable tests. It is replaced in Task 6.
export const invalidEmailPasswordRecoveryTestCase = Object.freeze({
  id: 'AUTH-RECOVERY-001',
  title: 'Password recovery disables OTP request for an invalid email',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: recoveryTags,
  preconditions: Object.freeze(['The visitor is signed out.']),
  expectedResult: 'The OTP request remains disabled until the email is valid.',
  email: validationData.invalidRegistrationEmails[0] ?? 'auto_reg@gmail',
  expectedRequestEnabled: false,
}) satisfies TestCaseDefinition & {
  readonly email: string;
  readonly expectedRequestEnabled: boolean;
};
