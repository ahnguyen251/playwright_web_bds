import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const chatTags = Object.freeze([TAGS.regression, TAGS.chat]);

export const chatTestCases: readonly TestCaseDefinition[] = [
  {
    id: 'TC-CHAT-CREATE-001',
    title: 'Khởi tạo phòng chat mới, gửi & nhận tin nhắn realtime 2 chiều',
    module: 'Chat',
    priority: 'critical',
    tags: chatTags,
    preconditions: ['Khách thuê đã đăng nhập; tin đăng "Đang đăng"; chưa có lịch sử chat trước đó'],
    testData: 'Nội dung tin nhắn hợp lệ',
    testSteps: '1. (Context A - Khách) Nhấn "Nhắn tin" tại chi tiết tin đăng. 2. Hệ thống tạo Room_ID, vào cửa sổ Chat. 3. Gửi tin nhắn. 4. (Context B - Chủ tin) Quan sát nhận tin realtime, phản hồi lại.',
    expectedResult: 'Tin nhắn hiển thị tức thời ở cả 2 phía qua Socket; Chủ tin nhận Push Notification.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-CHAT-CREATE-002',
    title: 'Chuyển hướng đăng nhập khi nhắn tin lúc chưa đăng nhập',
    module: 'Chat',
    priority: 'medium',
    tags: chatTags,
    preconditions: ['Người dùng chưa đăng nhập'],
    testData: '-',
    testSteps: '1. Nhấn "Nhắn tin" khi chưa đăng nhập.',
    expectedResult: 'Chặn vào phòng chat, chuyển hướng đến màn hình Đăng nhập.',
    automation: { status: 'NOT_AUTOMATED' as const },
  }
];
