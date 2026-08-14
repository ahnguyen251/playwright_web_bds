import { expect, test } from '@playwright/test';

import { TAGS } from '../../../constants/tags';
import { AuthenticationDataFactory } from '../../../test-data/factories/AuthenticationDataFactory';
import {
  activeAccountLoginTestCase,
  googleOAuthLoginTestCase,
  incorrectPasswordLoginTestCase,
  lockedAccountLoginTestCase,
  loginTestCases,
  requiredLoginFieldsTestCase,
} from '../../../test-cases/authentication/login.test-cases';
import {
  nonexistentEmailPasswordRecoveryTestCase,
  passwordRecoveryTestCases,
  invalidOrExpiredPasswordRecoveryOtpTestCase,
  successfulPasswordRecoveryTestCase,
} from '../../../test-cases/authentication/password-recovery.test-cases';
import {
  duplicateRegistrationEmailTestCase,
  invalidRegistrationEmailTestCase,
  invalidRegistrationPasswordTestCase,
  invalidOrExpiredRegistrationOtpTestCase,
  registrationConfirmationMismatchTestCase,
  registrationOtpResendCountdownTestCase,
  requiredRegistrationFieldsTestCase,
  registrationSuccessTestCase,
  registrationTestCases,
} from '../../../test-cases/authentication/registration.test-cases';

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

test('publishes the authoritative metadata for every registration case', () => {
  expect(
    registrationTestCases.map(({ id, title, priority, tags, expectedResult }) => ({
      id,
      title,
      priority,
      tags,
      expectedResult,
    })),
  ).toEqual([
    {
      id: 'TC-AUTH-REGISTER-001',
      title:
        '[Happy Path] Đăng ký tài khoản thành công với thông tin hợp lệ, hoàn tất xác thực OTP',
      priority: 'critical',
      tags: ['@regression', '@authentication', '@external', '@otp', '@mutating'],
      expectedResult:
        'Nút Đăng ký hiển thị loading và bị disable; tài khoản chuyển ACTIVE, JWT được cấp và điều hướng thành công.',
    },
    {
      id: 'TC-AUTH-REGISTER-002',
      title: '[Required Validation] Chặn đăng ký khi bỏ trống các trường bắt buộc',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult:
        'Không gọi API tạo tài khoản; toàn bộ trường bắt buộc hiển thị lỗi trực quan dưới field.',
    },
    {
      id: 'TC-AUTH-REGISTER-003',
      title: '[Input Validation] Chặn đăng ký khi Email sai định dạng',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult: 'Mỗi email sai hiển thị "Email không hợp lệ" theo thời gian thực.',
    },
    {
      id: 'TC-AUTH-REGISTER-004',
      title: '[Business Rule] Chặn đăng ký khi Email đã tồn tại',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult: 'Hiển thị "Email đã tồn tại" và không tạo tài khoản.',
    },
    {
      id: 'TC-AUTH-REGISTER-005',
      title: '[Input Validation] Báo lỗi biên độ dài và định dạng ký tự của Mật khẩu',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult:
        'Mỗi mật khẩu sai hiển thị "Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số" theo thời gian thực.',
    },
    {
      id: 'TC-AUTH-REGISTER-006',
      title: '[Business Rule] Báo lỗi khi Xác nhận mật khẩu không khớp',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult: 'Hiển thị ngay "Phải trùng khớp với mật khẩu đã nhập".',
    },
    {
      id: 'TC-AUTH-REGISTER-007',
      title: '[Negative / State] OTP sai hoặc hết hạn',
      priority: 'high',
      tags: ['@regression', '@authentication', '@external', '@otp', '@mutating'],
      expectedResult:
        'OTP sai hiển thị lỗi và cho nhập lại; OTP hết hạn yêu cầu gửi lại OTP.',
    },
    {
      id: 'TC-AUTH-REGISTER-008',
      title: '[Boundary] Nút "Gửi lại OTP" bị disable trong countdown, enable sau khi hết',
      priority: 'medium',
      tags: ['@regression', '@authentication', '@external', '@otp', '@mutating'],
      expectedResult:
        'Nút Gửi lại OTP bị disable trong countdown và chuyển enable sau khi hết.',
    },
  ]);
});

test('publishes the authoritative metadata for every login case', () => {
  expect(
    loginTestCases.map(({ id, title, priority, tags, expectedResult }) => ({
      id,
      title,
      priority,
      tags,
      expectedResult,
    })),
  ).toEqual([
    {
      id: 'TC-AUTH-LOGIN-001',
      title: '[Happy Path / Smoke] Đăng nhập thành công với tài khoản Active',
      priority: 'critical',
      tags: ['@smoke', '@regression', '@authentication'],
      expectedResult:
        'Đăng nhập thành công; JWT được lưu chính xác và điều hướng về trang chủ.',
    },
    {
      id: 'TC-AUTH-LOGIN-002',
      title: '[Negative] Đăng nhập thất bại khi sai mật khẩu',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult:
        'Hiển thị "Thông tin tài khoản hoặc mật khẩu không chính xác" và không chuyển hướng.',
    },
    {
      id: 'TC-AUTH-LOGIN-003',
      title: '[State / Rule] Chặn đăng nhập với tài khoản bị khóa',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult: 'Hiển thị "Tài khoản của bạn đã bị khóa" và dừng đăng nhập.',
    },
    {
      id: 'TC-AUTH-LOGIN-004',
      title: '[Required Validation] Bỏ trống Email/SĐT hoặc Mật khẩu',
      priority: 'medium',
      tags: ['@regression', '@authentication'],
      expectedResult: 'Validation chặn và không gửi request đăng nhập.',
    },
    {
      id: 'TC-AUTH-LOGIN-005',
      title: '[Happy Path / OAuth] Đăng nhập qua Google (mock)',
      priority: 'low',
      tags: ['@regression', '@authentication', '@external'],
      expectedResult:
        'Chỉ với mock: ứng dụng nhận access token, tự tạo tài khoản khi cần, cấp JWT và chuyển về trang chủ.',
    },
  ]);
});

test('publishes the authoritative metadata for every forgot-password case', () => {
  expect(
    passwordRecoveryTestCases.map(({ id, title, priority, tags, expectedResult }) => ({
      id,
      title,
      priority,
      tags,
      expectedResult,
    })),
  ).toEqual([
    {
      id: 'TC-AUTH-FORGOT-001',
      title: '[Happy Path / E2E] Khôi phục mật khẩu thành công qua OTP Email',
      priority: 'critical',
      tags: ['@regression', '@authentication', '@external', '@otp', '@mutating'],
      expectedResult: 'Khôi phục mật khẩu thành công và điều hướng về trang Đăng nhập.',
    },
    {
      id: 'TC-AUTH-FORGOT-002',
      title: '[Negative] Email không tồn tại',
      priority: 'high',
      tags: ['@regression', '@authentication'],
      expectedResult: 'Hiển thị lỗi, dừng luồng và không gửi OTP.',
    },
    {
      id: 'TC-AUTH-FORGOT-003',
      title: '[Negative / State] OTP sai hoặc hết hạn',
      priority: 'high',
      tags: ['@regression', '@authentication', '@external', '@otp', '@mutating'],
      expectedResult:
        'OTP sai hiển thị lỗi và cho nhập lại; OTP hết hạn yêu cầu gửi lại OTP.',
    },
  ]);
});

test('publishes literal case-specific data required by later AUTH executors', () => {
  expect(registrationSuccessTestCase.credentials).toEqual({
    email: 'auto_reg@gmail.com',
    password: 'Admin@123',
    passwordConfirmation: 'Admin@123',
  });
  expect(invalidRegistrationEmailTestCase.invalidEmails).toEqual([
    'auto_reg@gmail',
    'auto_reg',
    'auto@.com',
  ]);
  expect(invalidRegistrationPasswordTestCase.invalidPasswords).toEqual([
    '1234567',
    'admin123',
    'ADMIN123',
    'AdminAsdf',
  ]);
  expect(requiredRegistrationFieldsTestCase.data).toEqual({
    fullName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });
  expect(duplicateRegistrationEmailTestCase.credentialAlias).toBe('defaultUser');
  expect(registrationConfirmationMismatchTestCase.data).toMatchObject({
    password: 'Admin@123',
    passwordConfirmation: 'Admin@1234',
  });
  expect(invalidOrExpiredRegistrationOtpTestCase.otpConditions).toEqual([
    'incorrect',
    'expired',
  ]);
  expect(registrationOtpResendCountdownTestCase.countdown).toBe('default');
  expect(activeAccountLoginTestCase.credentialAlias).toBe('defaultUser');
  expect(incorrectPasswordLoginTestCase.expectedMessage).toBe(
    'Thông tin tài khoản hoặc mật khẩu không chính xác',
  );
  expect(lockedAccountLoginTestCase.credentialAlias).toBe('lockedUser');
  expect(requiredLoginFieldsTestCase.missingFieldVariants).toEqual([
    'email-or-phone',
    'password',
  ]);
  expect(googleOAuthLoginTestCase.executionMode).toBe('mock-only');
  expect(googleOAuthLoginTestCase.expectedOAuthOutcome).toEqual({
    receivesAccessToken: true,
    createsAccountWhenMissing: true,
    issuesJwt: true,
    redirectsTo: 'home',
  });
  expect(successfulPasswordRecoveryTestCase.newPassword).toBe('NewAdmin@123');
  expect(nonexistentEmailPasswordRecoveryTestCase.emailSource).toBe('unique-unregistered');
  expect(invalidOrExpiredPasswordRecoveryOtpTestCase.otpConditions).toEqual([
    'incorrect',
    'expired',
  ]);
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
  expect(validationData.registrationSuccessCredentials).toEqual({
    email: 'auto_reg@gmail.com',
    password: 'Admin@123',
    passwordConfirmation: 'Admin@123',
  });
  expect(validationData.passwordRecoveryNewPassword).toBe('NewAdmin@123');
  expect(validationData.nonexistentEmailSource).toBe('unique-unregistered');
  expect(validationData.googleOAuthExecutionMode).toBe('mock-only');
  expect(validationData.googleOAuthExpectedOutcome).toEqual({
    receivesAccessToken: true,
    createsAccountWhenMissing: true,
    issuesJwt: true,
    redirectsTo: 'home',
  });
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
