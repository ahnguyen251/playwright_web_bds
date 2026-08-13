import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';

interface LoginTestCase extends TestCaseDefinition {
  readonly invalidPassword?: string;
  readonly expectedMessage?: string;
  readonly credentials?: Readonly<{ readonly email: string; readonly password: string }>;
}

const validationData = AuthenticationDataFactory.getValidationData();
const authenticationTags = Object.freeze([TAGS.regression, TAGS.authentication]);
const signedOutLoginPreconditions = Object.freeze(['The visitor is signed out and the login view is open.']);

export const validLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-001',
  title: '[Happy Path / Smoke] Đăng nhập thành công với tài khoản Active',
  module: 'Authentication Login',
  priority: 'critical',
  tags: Object.freeze([TAGS.smoke, ...authenticationTags]),
  preconditions: Object.freeze(['An active configured Propify account exists.', ...signedOutLoginPreconditions]),
  expectedResult: 'Authentication succeeds, JWT is persisted, and the user reaches the home page.',
});

export const invalidCredentialsLoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-002',
  title: '[Negative] Đăng nhập thất bại khi sai mật khẩu',
  module: 'Authentication Login',
  priority: 'high',
  tags: authenticationTags,
  preconditions: Object.freeze(['An active configured Propify account exists.']),
  expectedResult: 'The invalid-credentials message is displayed and the page does not redirect.',
  invalidPassword: validationData.mismatchedPassword,
  expectedMessage: validationData.expectedMessages.invalidCredentials,
}) satisfies LoginTestCase & { readonly invalidPassword: string };

export const lockedAccountLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-003',
  title: '[State / Rule] Chặn đăng nhập với tài khoản bị khóa',
  module: 'Authentication Login',
  priority: 'high',
  tags: authenticationTags,
  preconditions: Object.freeze(['A Locked account is configured through the optional environment pair.']),
  expectedResult: 'The locked-account message is displayed and authentication stops.',
  expectedMessage: validationData.expectedMessages.lockedAccount,
});

export const emptyLoginFieldsTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-004',
  title: '[Required Validation] Bỏ trống Email/SĐT hoặc Mật khẩu',
  module: 'Authentication Login',
  priority: 'medium',
  tags: authenticationTags,
  preconditions: signedOutLoginPreconditions,
  expectedResult: 'Validation blocks submission and no login request is sent.',
});

export const googleOAuthLoginTestCase: LoginTestCase = Object.freeze({
  id: 'TC-AUTH-LOGIN-005',
  title: '[Happy Path / OAuth] Đăng nhập qua Google (mock)',
  module: 'Authentication Login',
  priority: 'low',
  tags: Object.freeze([...authenticationTags, TAGS.external]),
  preconditions: Object.freeze(['A repository-owned Google OAuth mock contract is available.']),
  expectedResult: 'The mocked OAuth flow supplies an access token and navigates to the home page.',
});

export const loginTestCases = Object.freeze([
  validLoginTestCase,
  invalidCredentialsLoginTestCase,
  lockedAccountLoginTestCase,
  emptyLoginFieldsTestCase,
  googleOAuthLoginTestCase,
]);

// Compatibility metadata for pre-unified executable tests. It is replaced in Task 5.
export const invalidEmailLoginTestCase = Object.freeze({
  id: 'AUTH-LOGIN-003',
  title: 'Login rejects an invalid email format before submission',
  module: 'Authentication Login',
  priority: 'high',
  tags: authenticationTags,
  preconditions: signedOutLoginPreconditions,
  expectedResult: 'The invalid-email message is visible and Continue remains disabled.',
  credentials: Object.freeze({
    email: validationData.invalidRegistrationEmails[0] ?? 'auto_reg@gmail',
    password: validationData.validPassword,
  }),
  expectedMessage: validationData.expectedMessages.invalidEmail,
}) satisfies TestCaseDefinition & {
  readonly credentials: Readonly<{ readonly email: string; readonly password: string }>;
  readonly expectedMessage: string;
};
