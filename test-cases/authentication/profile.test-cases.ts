import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const profileTags = Object.freeze([TAGS.regression, TAGS.profile]);
const authenticatedPrecondition = Object.freeze(['Người dùng đã đăng nhập']);

export const profileViewTestCase1: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-VIEW-001',
  title: '[Happy Path] Hiển thị chính xác thông tin tài khoản hiện hành',
  module: 'Profile',
  priority: 'critical',
  tags: Object.freeze([TAGS.smoke, ...profileTags]),
  preconditions: authenticatedPrecondition,
  testData: 'Dữ liệu phiên đăng nhập hiện tại',
  testSteps: '1. Truy cập "Thông tin tài khoản".',
  expectedResult: 'UI kết xuất chính xác từ DB: Avatar, Họ tên, Email, SĐT, Badge trạng thái Active.',
  automation: { status: 'AUTOMATED' as const, scriptPath: 'tests/profile/profile.positive.spec.ts' },
});

export const profileViewTestCase2: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-VIEW-002',
  title: '[Negative] Chuyển hướng đăng nhập khi token không hợp lệ',
  module: 'Profile',
  priority: 'high',
  tags: profileTags,
  preconditions: Object.freeze(['Token hết hạn/không hợp lệ']),
  testData: 'Token invalid',
  testSteps: '1. Với token invalid, truy cập "Thông tin tài khoản".',
  expectedResult: 'Redirect về trang đăng nhập.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const profileEditTestCase1: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-EDIT-001',
  title: '[Happy Path / CRUD] Chỉnh sửa thông tin cá nhân thành công kèm upload Avatar',
  module: 'Profile',
  priority: 'critical',
  tags: profileTags,
  preconditions: Object.freeze(['Người dùng đã đăng nhập, ở màn Chỉnh sửa thông tin']),
  testData: 'Họ tên mới hợp lệ; File ảnh: avatar_valid.png',
  testSteps: '1. Nhập họ tên mới hợp lệ. 2. Upload avatar mới (PNG). 3. Click "Lưu".',
  expectedResult: 'Dữ liệu cập nhật thành công vào DB; hiển thị Toast thông báo hoàn tất; avatar mới cập nhật ngay trên header.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const profileEditTestCase2: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-EDIT-002',
  title: '[Business Rule] Không gọi API khi không có thay đổi dữ liệu',
  module: 'Profile',
  priority: 'medium',
  tags: profileTags,
  preconditions: Object.freeze(['Form hiển thị dữ liệu hiện tại, không chỉnh sửa gì']),
  testData: 'Giữ nguyên thông tin cũ',
  testSteps: '1. Click "Lưu" mà không chỉnh sửa gì.',
  expectedResult: 'Hiển thị "Không có thay đổi dữ liệu"; không gọi API Update.',
  automation: { status: 'AUTOMATED' as const, scriptPath: 'tests/profile/profile.validation.spec.ts' },
});

export const profileEditTestCase3: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-EDIT-003',
  title: '[Boundary] Cắt chuỗi (truncate) khi paste Họ tên vượt quá 50 ký tự',
  module: 'Profile',
  priority: 'medium',
  tags: profileTags,
  preconditions: Object.freeze(['Đang ở màn hình Chỉnh sửa thông tin cá nhân']),
  testData: 'Chuỗi 60 ký tự',
  testSteps: '1. Copy chuỗi 60 ký tự. 2. Paste vào field "Họ và tên".',
  expectedResult: 'Trường tự động cắt, chỉ giữ 50 ký tự đầu.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const profileChangePwTestCase1: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-CHANGEPW-001',
  title: '[Happy Path / State Transition] Đổi mật khẩu thành công và thu hồi phiên cũ',
  module: 'Profile',
  priority: 'critical',
  tags: profileTags,
  preconditions: authenticatedPrecondition,
  testData: 'MK cũ đúng; MK mới hợp lệ; Xác nhận khớp',
  testSteps: '1. Nhập đúng MK hiện tại. 2. Nhập MK mới hợp lệ + xác nhận khớp. 3. Nhấn "Xác nhận".',
  expectedResult: 'Mật khẩu cập nhật vào DB; token hiện tại trong LocalStorage/Cookie bị thu hồi; tự động đẩy về trang Đăng nhập.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const profileChangePwTestCase2: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-CHANGEPW-002',
  title: '[Negative] Sai mật khẩu hiện tại',
  module: 'Profile',
  priority: 'high',
  tags: profileTags,
  preconditions: authenticatedPrecondition,
  testData: 'MK cũ sai',
  testSteps: '1. Nhập sai MK hiện tại, các trường còn lại đúng. 2. Nhấn "Xác nhận".',
  expectedResult: 'Lỗi "Mật khẩu hiện tại không chính xác"; giữ nguyên form, không đổi dữ liệu.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const profileChangePwTestCase3: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-CHANGEPW-003',
  title: '[Negative] Mật khẩu mới không hợp lệ',
  module: 'Profile',
  priority: 'high',
  tags: profileTags,
  preconditions: authenticatedPrecondition,
  testData: 'MK mới không đạt rule',
  testSteps: '1. Nhập đúng MK hiện tại. 2. Nhập MK mới không hợp lệ. 3. Nhấn "Xác nhận".',
  expectedResult: 'Hiển thị lỗi, quay lại bước nhập.',
  automation: { status: 'NOT_AUTOMATED' as const },
});

export const profileChangePwTestCase4: TestCaseDefinition = Object.freeze({
  id: 'TC-PROFILE-CHANGEPW-004',
  title: '[Negative] Xác nhận mật khẩu không khớp',
  module: 'Profile',
  priority: 'high',
  tags: profileTags,
  preconditions: authenticatedPrecondition,
  testData: 'Xác nhận MK khác MK mới',
  testSteps: '1. Nhập đúng MK hiện tại, MK mới hợp lệ. 2. Nhập xác nhận khác giá trị. 3. Nhấn "Xác nhận".',
  expectedResult: 'Hiển thị lỗi không khớp.',
  automation: { status: 'AUTOMATED' as const, scriptPath: 'tests/profile/change-password.validation.spec.ts' },
});

export const profileTestCases = Object.freeze([
  profileViewTestCase1,
  profileViewTestCase2,
  profileEditTestCase1,
  profileEditTestCase2,
  profileEditTestCase3,
  profileChangePwTestCase1,
  profileChangePwTestCase2,
  profileChangePwTestCase3,
  profileChangePwTestCase4,
]);

export const getProfileTestCase = (id: string): TestCaseDefinition => {
  const testCase = profileTestCases.find((candidate) => candidate.id === id);
  if (testCase === undefined) throw new Error(`Unknown profile test case: ${id}`);
  return testCase;
};

export const profileCaseTitle = (id: string): string => {
  const testCase = getProfileTestCase(id);
  return `${testCase.id} ${testCase.title} ${testCase.tags.join(' ')}`;
};

