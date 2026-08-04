import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

export const validLoginTestCase: TestCaseDefinition = Object.freeze({
  id: 'AUTH-LOGIN-001',
  title: 'User signs in with valid credentials',
  module: 'Authentication',
  priority: 'critical',
  tags: [TAGS.smoke, TAGS.regression, TAGS.authentication],
  preconditions: ['A valid Propify user is configured through environment variables.'],
  expectedResult: 'The authenticated account control is visible.',
});
