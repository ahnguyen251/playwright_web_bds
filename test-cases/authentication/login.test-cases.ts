import { TAGS } from '../../constants/tags';
import { AuthenticationDataFactory } from '../../test-data/factories/AuthenticationDataFactory';
import type { TestCaseDefinition } from '../../types/test-case.types';

const validationData = AuthenticationDataFactory.getValidationData();
const authenticationTags = Object.freeze([TAGS.regression, TAGS.authentication]);

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
  preconditions: Object.freeze(['The visitor is signed out and the login view is open.']),
  expectedResult: 'The invalid-email message is visible and Continue remains disabled.',
  credentials: Object.freeze({
    email: validationData.invalidEmails[0] ?? 'plain-address',
    password: validationData.validPassword,
  }),
  expectedMessage: 'Vui lòng nhập email hợp lệ',
}) satisfies TestCaseDefinition & {
  readonly credentials: Readonly<{ email: string; password: string }>;
  readonly expectedMessage: string;
};

export const emptyLoginFieldsTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-LOGIN-004',
  title: 'Login keeps submission disabled when required fields are empty',
  module: 'Authentication',
  priority: 'medium',
  tags: authenticationTags,
  preconditions: Object.freeze(['The visitor is signed out and the login view is open.']),
  expectedResult: 'Continue remains disabled and no authentication request is sent.',
});
