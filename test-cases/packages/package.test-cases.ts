import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const packageTags = Object.freeze([TAGS.regression, TAGS.packages]);

export const packageTestCases: readonly TestCaseDefinition[] = [
  {
    id: 'TC-PKG-UPGRADE-001',
    title: '[Happy Path / E2E] Nâng cấp gói tin thành công qua VNPAY Sandbox',
    module: 'Packages',
    priority: 'critical',
    tags: packageTags,
    preconditions: ['User đã đăng nhập, sở hữu tin đăng dạng thường (hoặc "Đang duyệt" theo UC-13)'],
    testData: 'Gói: "Ruby"/VIP tương ứng; Thẻ test VNPAY',
    testSteps: '1. Tại quản lý tin, chọn "Nâng cấp gói tin". 2. Chọn gói, click "Thanh toán". 3. Điền thông tin thẻ test, OTP test tại VNPAY Sandbox, xác nhận. 4. Chờ redirect về Propify.',
    expectedResult: 'Hiển thị "Thanh toán thành công"; loại tin cập nhật lên VIP tương ứng; ghi nhận giao dịch mới vào DB.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-PKG-UPGRADE-002',
    title: '[State Transition] Nâng cấp lên hạng VIP cao hơn tính lại Cấp ưu tiên & Hệ số nhân ngay lập tức',
    module: 'Packages',
    priority: 'high',
    tags: packageTags,
    preconditions: ['User sở hữu tin đang chạy gói VIP Bạc (Cấp 2, hệ số x2.0)'],
    testData: 'Gói nâng cấp: VIP Vàng (Cấp 3, hệ số x3.0)',
    testSteps: '1. Chọn nâng cấp VIP Bạc → VIP Vàng. 2. Hoàn tất thanh toán sandbox. 3. Kiểm tra thông tin gói trên UI/DB.',
    expectedResult: 'Cấp ưu tiên 2→3; hệ số nhân x2.0→x3.0; Điểm hiển thị được recalculate ngay.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-PKG-UPGRADE-003',
    title: '[Business Rule] Chặn hạ cấp gói VIP khi gói hiện tại còn hiệu lực',
    module: 'Packages',
    priority: 'high',
    tags: packageTags,
    preconditions: ['User sở hữu tin đang chạy gói VIP Kim Cương (Cấp 4)'],
    testData: 'Thử chọn gói: VIP Bạc (Cấp 2)',
    testSteps: '1. Mở popup nâng cấp gói tại tin VIP Kim Cương. 2. Quan sát danh sách gói khả dụng.',
    expectedResult: 'Các gói có Cấp ưu tiên thấp hơn hiện tại bị disable/ẩn, không cho chọn hạ cấp.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-PKG-UPGRADE-004',
    title: 'Hủy nâng cấp / Đổi gói-thời hạn tại màn hình xác nhận',
    module: 'Packages',
    priority: 'medium',
    tags: packageTags,
    preconditions: ['Đã chọn gói và thời hạn, ở màn xác nhận'],
    testData: 'Đổi gói khác; đổi thời hạn khác',
    testSteps: '1. Nhấn Hủy tại màn xác nhận → không thực hiện thanh toán. 2. Đổi gói/thời hạn khác → số tiền cập nhật lại tương ứng.',
    expectedResult: 'Case 1: đóng màn hình, không thanh toán. Case 2: số tiền/quyền lợi cập nhật đúng theo lựa chọn mới.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-PKG-UPGRADE-005',
    title: 'Hiển thị lỗi khi thanh toán thất bại / bị hủy tại cổng thanh toán',
    module: 'Packages',
    priority: 'medium',
    tags: packageTags,
    preconditions: ['Đang ở bước xác nhận VNPAY Sandbox'],
    testData: 'Kết quả sandbox: Failed hoặc User Cancel',
    testSteps: '1. Thực hiện thanh toán với kết quả giả lập thất bại. 2. Thực hiện hủy tại cổng thanh toán.',
    expectedResult: 'Case 1: thông báo giao dịch thất bại. Case 2: thông báo hủy thanh toán.',
    automation: { status: 'NOT_AUTOMATED' as const },
  }
];
