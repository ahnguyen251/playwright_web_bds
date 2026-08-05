import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const recoveryTags = Object.freeze([TAGS.regression, TAGS.authentication]);

export const emptyPasswordRecoveryTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-RECOVERY-001',
  title: 'Password recovery opens at the email validation stage',
  module: 'Authentication Password Recovery',
  priority: 'high',
  tags: recoveryTags,
  preconditions: Object.freeze([
    'The visitor is signed out.',
    'No password-reset request may be submitted by this scenario.',
  ]),
  expectedResult: 'The email stage is visible and no reset request is sent.',
});

export const passwordRecoveryTestCases = Object.freeze([emptyPasswordRecoveryTestCase]);
