import { expect, test } from '@playwright/test';

import { profileTestCases } from '../../../test-cases/authentication/profile.test-cases';

const expectedIds = [
  'TC-PROFILE-VIEW-001',
  'TC-PROFILE-VIEW-002',
  'TC-PROFILE-EDIT-001',
  'TC-PROFILE-EDIT-002',
  'TC-PROFILE-EDIT-003',
  'TC-PROFILE-CHANGEPW-001',
  'TC-PROFILE-CHANGEPW-002',
  'TC-PROFILE-CHANGEPW-003',
  'TC-PROFILE-CHANGEPW-004',
] as const;

test('publishes all nine Module 2 Profile cases in document order', () => {
  expect(profileTestCases.map(({ id }) => id)).toEqual(expectedIds);
});

test('records the confirmed full-name boundary as a 50-character business rule', () => {
  const boundaryCase = profileTestCases.find(({ id }) => id === 'TC-PROFILE-EDIT-003');

  expect(boundaryCase?.testData).toBe('Chuỗi 60 ký tự');
  expect(boundaryCase?.expectedResult).toBe('Trường tự động cắt, chỉ giữ chính xác 50 ký tự đầu.');
});

test('records the confirmed change-password complexity rule', () => {
  const invalidPasswordCase = profileTestCases.find(({ id }) => id === 'TC-PROFILE-CHANGEPW-003');

  expect(invalidPasswordCase?.testData).toBe(
    'Mật khẩu mới dưới 8 ký tự hoặc thiếu chữ hoa, chữ thường hay chữ số',
  );
  expect(invalidPasswordCase?.expectedResult).toBe(
    'Hiển thị lỗi mật khẩu mới phải có tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số; giữ nguyên form để nhập lại.',
  );
});

test('publishes automation status only from fresh executable verification evidence', () => {
  expect(
    Object.fromEntries(
      profileTestCases.map(({ id, automation }) => [
        id,
        { status: automation.status, scriptPath: automation.scriptPath },
      ]),
    ),
  ).toEqual({
    'TC-PROFILE-VIEW-001': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/profile.positive.spec.ts',
    },
    'TC-PROFILE-VIEW-002': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/profile.negative.spec.ts',
    },
    'TC-PROFILE-EDIT-001': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/profile.mutating.spec.ts',
    },
    'TC-PROFILE-EDIT-002': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/profile.validation.spec.ts',
    },
    'TC-PROFILE-EDIT-003': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/profile.validation.spec.ts',
    },
    'TC-PROFILE-CHANGEPW-001': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/change-password.mutating.spec.ts',
    },
    'TC-PROFILE-CHANGEPW-002': {
      status: 'IN_PROGRESS',
      scriptPath: 'tests/profile/change-password.mutating.spec.ts',
    },
    'TC-PROFILE-CHANGEPW-003': {
      status: 'AUTOMATED',
      scriptPath: 'tests/profile/change-password.validation.spec.ts',
    },
    'TC-PROFILE-CHANGEPW-004': {
      status: 'AUTOMATED',
      scriptPath: 'tests/profile/change-password.validation.spec.ts',
    },
  });
});
