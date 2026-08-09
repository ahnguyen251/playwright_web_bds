import { expect, test } from '@playwright/test';

import {
  getListingTestCase,
  listingCaseTitle,
  listingTestCases,
} from '../../../test-cases/listings/listing.test-cases';

test('bảo đảm đủ 58 mã kịch bản tin đăng duy nhất và truy vết được', () => {
  const ids = listingTestCases.map(({ id }) => id);

  expect(listingTestCases).toHaveLength(58);
  expect(new Set(ids).size).toBe(ids.length);
  expect(
    listingTestCases.every(
      ({ requirementId, playwrightTest }) =>
        requirementId.length > 0 && playwrightTest.length > 0,
    ),
  ).toBe(true);
});

test('phân loại mọi kịch bản thay đổi trạng thái là mutating', () => {
  const mutatingRequirements = new Set(['UC-08', 'UC-11-EDIT', 'UC-11-WITHDRAW', 'UC-12']);

  expect(
    listingTestCases
      .filter(({ requirementId }) => mutatingRequirements.has(requirementId))
      .every(({ classification }) => classification === 'mutating'),
  ).toBe(true);
  expect(
    listingTestCases
      .filter(({ requirementId }) => !mutatingRequirements.has(requirementId))
      .every(({ classification }) => classification === 'read-only'),
  ).toBe(true);
});

test('đánh dấu mọi test case Tin đăng sử dụng tiếng Việt', () => {
  const hasVietnameseCharacter = /[^\x00-\x7F]/;

  expect(
    listingTestCases.every(
      ({ language, title, scenario, preconditions, expectedResult }) =>
        language === 'vi' &&
        hasVietnameseCharacter.test(title) &&
        hasVietnameseCharacter.test(scenario) &&
        preconditions.every((precondition) => hasVietnameseCharacter.test(precondition)) &&
        hasVietnameseCharacter.test(expectedResult),
    ),
  ).toBe(true);
});

test('trả về tiêu đề Playwright ổn định từ metadata bất biến', () => {
  const testCase = getListingTestCase('LIST-UC10-002');

  expect(Object.isFrozen(testCase)).toBe(true);
  expect(listingCaseTitle(testCase.id)).toContain(testCase.id);
  expect(listingCaseTitle(testCase.id)).toContain(testCase.title);
  expect(() => getListingTestCase('LIST-UNKNOWN')).toThrow(
    'Unknown listing test case: LIST-UNKNOWN',
  );
});
