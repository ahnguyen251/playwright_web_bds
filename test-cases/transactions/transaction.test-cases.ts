import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const transactionTags = Object.freeze([TAGS.regression, TAGS.transactions]);

export const transactionTestCases: readonly TestCaseDefinition[] = [
  {
    id: 'TC-TRANS-VIEW-001',
    title: 'Xem danh sách lịch sử giao dịch thành công',
    module: 'Transactions',
    priority: 'high',
    tags: transactionTags,
    preconditions: ['User đã đăng nhập, có giao dịch'],
    testData: 'User A có giao dịch',
    testSteps: '1. Nhấn "Lịch sử giao dịch" tại menu tài khoản.',
    expectedResult: 'Hiển thị khối tổng quan (Thành công/Chờ thanh toán/Tổng chi) + bảng giao dịch, mặc định sắp xếp thời gian giảm dần.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-TRANS-FILTER-001',
    title: '[Happy Path / Filter] Tra cứu và lọc lịch sử giao dịch cá nhân',
    module: 'Transactions',
    priority: 'high',
    tags: transactionTags,
    preconditions: ['Đã có giao dịch thành công và thất bại'],
    testData: 'Trạng thái: "Thành công"; Loại gói: "Ruby"',
    testSteps: '1. Nhập mã giao dịch/áp dụng lọc trạng thái "Thành công". 2. Chọn loại gói "Ruby", tìm kiếm.',
    expectedResult: 'Kết quả lọc real-time đúng điều kiện; số tiền hiển thị khớp với cấu hình gói.',
    automation: { status: 'NOT_AUTOMATED' as const },
  }
];
