import { expect, test } from '@playwright/test';
import { allTestCases } from '../../../test-cases';
import { TestCaseRegistry } from '../../../utils/TestCaseRegistry';

const expectedAutomatedIds = [
  'TC-APT-CREATE-001',
  'TC-APT-CREATE-003',
  'TC-AUTH-FORGOT-001',
  'TC-AUTH-FORGOT-002',
  'TC-AUTH-FORGOT-003',
  'TC-AUTH-LOGIN-001',
  'TC-AUTH-LOGIN-002',
  'TC-AUTH-LOGIN-003',
  'TC-AUTH-LOGIN-004',
  'TC-AUTH-LOGIN-005',
  'TC-AUTH-REGISTER-001',
  'TC-AUTH-REGISTER-002',
  'TC-AUTH-REGISTER-003',
  'TC-AUTH-REGISTER-004',
  'TC-AUTH-REGISTER-005',
  'TC-AUTH-REGISTER-006',
  'TC-LIST-CREATE-001',
  'TC-LIST-CREATE-002',
  'TC-LIST-DETAIL-001',
  'TC-LIST-DETAIL-002',
  'TC-LIST-EDIT-001',
  'TC-LIST-EDIT-002',
  'TC-LIST-FAVORITE-001',
  'TC-LIST-FAVORITE-002',
  'TC-LIST-FILTER-001',
  'TC-LIST-FILTER-002',
  'TC-LIST-REMOVE-001',
  'TC-LIST-REMOVE-002',
  'TC-LIST-SEARCH-001',
  'TC-LIST-VIEW-001',
  'TC-LIST-VIEW-002',
  'TC-PROFILE-CHANGEPW-004',
  'TC-PROFILE-CHANGEPW-003',
] as const;

test('catalog records the current executable business coverage baseline', () => {
  const automatedIds = allTestCases
    .filter(({ automation }) => automation.status === 'AUTOMATED')
    .map(({ id }) => id)
    .sort();

  expect(allTestCases).toHaveLength(83);
  expect(automatedIds).toEqual([...expectedAutomatedIds].sort());
  expect(allTestCases.length - automatedIds.length).toBe(50);
  expect(() => new TestCaseRegistry().validate(allTestCases)).not.toThrow();
});
