import { expect, test } from '@playwright/test';

import { TAGS } from '../../../constants/tags';
import { AuthenticationDataFactory } from '../../../test-data/factories/AuthenticationDataFactory';
import { loginTestCases } from '../../../test-cases/authentication/login.test-cases';
import { passwordRecoveryTestCases } from '../../../test-cases/authentication/password-recovery.test-cases';
import { registrationTestCases } from '../../../test-cases/authentication/registration.test-cases';

const expectedIds = [
  'TC-AUTH-REGISTER-001',
  'TC-AUTH-REGISTER-002',
  'TC-AUTH-REGISTER-003',
  'TC-AUTH-REGISTER-004',
  'TC-AUTH-REGISTER-005',
  'TC-AUTH-REGISTER-006',
  'TC-AUTH-REGISTER-007',
  'TC-AUTH-REGISTER-008',
  'TC-AUTH-LOGIN-001',
  'TC-AUTH-LOGIN-002',
  'TC-AUTH-LOGIN-003',
  'TC-AUTH-LOGIN-004',
  'TC-AUTH-LOGIN-005',
  'TC-AUTH-FORGOT-001',
  'TC-AUTH-FORGOT-002',
  'TC-AUTH-FORGOT-003',
] as const;

test('publishes the authoritative 16-case AUTH catalog in document order', () => {
  expect([
    ...registrationTestCases,
    ...loginTestCases,
    ...passwordRecoveryTestCases,
  ].map(({ id }) => id)).toEqual(expectedIds);
});

test('publishes the authoritative registration validation data and messages', () => {
  const validationData = AuthenticationDataFactory.getValidationData();

  expect(validationData.invalidRegistrationEmails).toEqual([
    'auto_reg@gmail',
    'auto_reg',
    'auto@.com',
  ]);
  expect(validationData.invalidRegistrationPasswords).toEqual([
    '1234567',
    'admin123',
    'ADMIN123',
    'AdminAsdf',
  ]);
  expect(validationData.validPassword).toBe('Admin@123');
  expect(validationData.mismatchedPassword).toBe('Admin@1234');
  expect(validationData.expectedMessages).toEqual({
    invalidEmail: 'Email không hợp lệ',
    duplicateEmail: 'Email đã tồn tại',
    invalidPassword: 'Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số',
    mismatchedPassword: 'Phải trùng khớp với mật khẩu đã nhập',
    invalidCredentials: 'Thông tin tài khoản hoặc mật khẩu không chính xác',
    lockedAccount: 'Tài khoản của bạn đã bị khóa',
  });
});

test('marks Gmail-dependent scenarios as external', () => {
  expect(TAGS.external).toBe('@external');
  expect(registrationTestCases[0]?.tags).toContain(TAGS.external);
  expect(passwordRecoveryTestCases[0]?.tags).toContain(TAGS.external);
});
