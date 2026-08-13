import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';
import type { UserAlias } from '../../types/user.types';

interface LoginTestCase extends TestCaseDefinition {
  readonly credentialAlias?: UserAlias;
  readonly invalidPassword?: string;
  readonly expectedMessage?: string;
  readonly executionMode?: 'mock-only';
  readonly missingFieldVariants?: readonly ('email-or-phone' | 'password')[];
  readonly expectedOAuthOutcome?: Readonly<{
    readonly receivesAccessToken: boolean;
    readonly createsAccountWhenMissing: boolean;
    readonly issuesJwt: boolean;
    readonly redirectsTo: 'home';
  }>;
}

const validationData = AuthenticationDataFactory.getValidationData();
const authenticationTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const signedOutLoginPreconditions = Object.freeze([
  'The visitor is signed out and the login view is open.',
]);

export const activeAccountLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-001',
  title: '[Happy Path / Smoke] Đăng nhập thành công với tài khoản Active',
  module: 'Authentication Login',
  priority: 'critical',
  tags: Object.freeze([TAGS.smoke, ...authenticationTags]),
  preconditions: Object.freeze([
    'An active configured Propify account exists.',
    ...signedOutLoginPreconditions,
  ]),
  expectedResult: 'Đăng nhập thành công; JWT được lưu chính xác và điều hướng về trang chủ.',
  credentialAlias: 'defaultUser',
});

export const incorrectPasswordLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-002',
  title: '[Negative] Đăng nhập thất bại khi sai mật khẩu',
  module: 'Authentication Login',
  priority: 'high',
  tags: authenticationTags,
  preconditions: Object.freeze(['An active configured Propify account exists.']),
  expectedResult:
    'Hiển thị "Thông tin tài khoản hoặc mật khẩu không chính xác" và không chuyển hướng.',
  credentialAlias: 'defaultUser',
  invalidPassword: validationData.mismatchedPassword,
  expectedMessage: validationData.expectedMessages.invalidCredentials,
});

export const lockedAccountLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-003',
  title: '[State / Rule] Chặn đăng nhập với tài khoản bị khóa',
  module: 'Authentication Login',
  priority: 'high',
  tags: authenticationTags,
  preconditions: Object.freeze([
    'A Locked account is configured through the optional environment pair.',
  ]),
  expectedResult: 'Hiển thị "Tài khoản của bạn đã bị khóa" và dừng đăng nhập.',
  credentialAlias: 'lockedUser',
  expectedMessage: validationData.expectedMessages.lockedAccount,
});

export const requiredLoginFieldsTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-004',
  title: '[Required Validation] Bỏ trống Email/SĐT hoặc Mật khẩu',
  module: 'Authentication Login',
  priority: 'medium',
  tags: authenticationTags,
  preconditions: signedOutLoginPreconditions,
  expectedResult: 'Validation chặn và không gửi request đăng nhập.',
  missingFieldVariants: Object.freeze(['email-or-phone', 'password'] as const),
});

export const googleOAuthLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-005',
  title: '[Happy Path / OAuth] Đăng nhập qua Google (mock)',
  module: 'Authentication Login',
  priority: 'low',
  tags: Object.freeze([...authenticationTags, TAGS.external]),
  preconditions: Object.freeze(['A repository-owned Google OAuth mock contract is available.']),
  expectedResult:
    'Chỉ với mock: ứng dụng nhận access token, tự tạo tài khoản khi cần, cấp JWT và chuyển về trang chủ.',
  executionMode: validationData.googleOAuthExecutionMode,
  expectedOAuthOutcome: validationData.googleOAuthExpectedOutcome,
});

export const loginTestCases = Object.freeze([
  activeAccountLoginTestCase,
  incorrectPasswordLoginTestCase,
  lockedAccountLoginTestCase,
  requiredLoginFieldsTestCase,
  googleOAuthLoginTestCase,
]);

export const validLoginTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-LOGIN-001',
  title: 'User signs in with valid credentials',
  module: 'Authentication',
  priority: 'critical',
  tags: Object.freeze([TAGS.smoke, ...authenticationTags]),
  preconditions: Object.freeze([
    'A valid Propify user is configured through environment variables.',
  ]),
  expectedResult: 'The authenticated account control is visible.',
});

export const invalidCredentialsLoginTestCase = Object.freeze({
  id: 'AUTH-LOGIN-002',
  title: 'User is rejected when the password is incorrect',
  module: 'Authentication',
  priority: 'high',
  tags: authenticationTags,
  preconditions: Object.freeze([
    'A valid Propify user email is configured through environment variables.',
  ]),
  expectedResult: 'The login view displays a server rejection and remains unauthenticated.',
  invalidPassword: validationData.mismatchedPassword,
}) satisfies TestCaseDefinition & { readonly invalidPassword: string };

export const invalidEmailLoginTestCase = Object.freeze({
  id: 'AUTH-LOGIN-003',
  title: 'Login rejects an invalid email format before submission',
  module: 'Authentication',
  priority: 'high',
  tags: authenticationTags,
  preconditions: signedOutLoginPreconditions,
  expectedResult: 'The invalid-email message is visible and Continue remains disabled.',
  credentials: Object.freeze({
    email: validationData.invalidRegistrationEmails[0] ?? 'auto_reg@gmail',
    password: validationData.validPassword,
  }),
  expectedMessage: 'Vui lòng nhập email hợp lệ',
}) satisfies TestCaseDefinition & {
  readonly credentials: Readonly<{ readonly email: string; readonly password: string }>;
  readonly expectedMessage: string;
};

export const emptyLoginFieldsTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-LOGIN-004',
  title: 'Login keeps submission disabled when required fields are empty',
  module: 'Authentication',
  priority: 'medium',
  tags: authenticationTags,
  preconditions: signedOutLoginPreconditions,
  expectedResult: 'Continue remains disabled and no authentication request is sent.',
});
