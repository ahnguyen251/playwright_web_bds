import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';
import type { PasswordChangeData } from '../../types/user.types';

const profileTags = Object.freeze([TAGS.regression, TAGS.profile]);
const authenticatedPrecondition = Object.freeze([
  'The default user authentication state was created by auth setup.',
]);

export const profileViewTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-PROFILE-001',
  title: 'Authenticated user can view account information',
  module: 'Authentication Profile',
  priority: 'critical',
  tags: Object.freeze([TAGS.smoke, ...profileTags]),
  preconditions: authenticatedPrecondition,
  expectedResult: 'The profile shows account information without changing account data.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const disabledProfileFieldsTestCase = Object.freeze({
  id: 'AUTH-PROFILE-002',
  title: 'Profile keeps verified email and phone fields disabled',
  module: 'Authentication Profile',
  priority: 'high',
  tags: profileTags,
  preconditions: authenticatedPrecondition,
  expectedResult: 'Email and verified phone cannot be edited.',
  disabledFields: Object.freeze(['email', 'phone'] as const),
  automation: { status: 'NOT_AUTOMATED' as const },
}) satisfies TestCaseDefinition & { readonly disabledFields: readonly ['email', 'phone'] };

export const unchangedProfileTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-PROFILE-003',
  title: 'Profile keeps Save disabled when no data has changed',
  module: 'Authentication Profile',
  priority: 'medium',
  tags: profileTags,
  preconditions: authenticatedPrecondition,
  expectedResult: 'Save remains disabled and no profile update is sent.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const changePasswordConfirmationTestCase = Object.freeze({
  id: 'AUTH-PASSWORD-001',
  title: 'Change password reports a mismatched confirmation without submitting',
  module: 'Authentication Password',
  priority: 'high',
  tags: profileTags,
  preconditions: Object.freeze([
    ...authenticatedPrecondition,
    'The scenario must not click the password-update button.',
  ]),
  expectedResult: 'The confirmation mismatch is visible and the password is not changed.',
  data: Object.freeze<PasswordChangeData>({
    currentPassword: 'Current1!',
    newPassword: 'Automation1!',
    passwordConfirmation: 'Different1!',
  }),
  expectedMessages: Object.freeze(['Xác nhận mật khẩu mới không khớp.']),
  automation: { status: 'NOT_AUTOMATED' as const },
}) satisfies TestCaseDefinition & {
  readonly data: PasswordChangeData;
  readonly expectedMessages: readonly string[];
};

export const profileTestCases = Object.freeze([
  profileViewTestCase,
  disabledProfileFieldsTestCase,
  unchangedProfileTestCase,
  changePasswordConfirmationTestCase,
]);
