import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const homeTags = Object.freeze([TAGS.regression, TAGS.listings]);

export const homeTestCases: readonly TestCaseDefinition[] = [
  {
    id: 'TC-HOME-SEARCH-001',
    title: 'Tìm kiếm tương đối theo địa chỉ/tên tin đăng',
    module: 'Home',
    priority: 'high',
    tags: homeTags,
    preconditions: ['Có tin đăng đã duyệt'],
    testData: 'Từ khóa khớp 1 phần địa chỉ/tiêu đề',
    testSteps: '1. Nhập từ khóa vào thanh tìm kiếm. 2. Thực hiện tìm kiếm.',
    expectedResult: 'Trả về các tin đăng phù hợp theo kiểu tìm kiếm tương đối.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-HOME-FILTER-001',
    title: 'Lọc theo khoảng giá có sẵn (Cho thuê / Mua bán)',
    module: 'Home',
    priority: 'high',
    tags: homeTags,
    preconditions: ['Trang chủ có tin đăng ở nhiều mức giá'],
    testData: 'Chọn mốc giá tương ứng nhu cầu',
    testSteps: '1. Chọn nhu cầu (Cho thuê/Mua bán). 2. Chọn mốc giá có sẵn. 3. Áp dụng.',
    expectedResult: 'Danh sách chỉ hiển thị tin đúng khoảng giá đã chọn.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-HOME-FILTER-002',
    title: 'Lọc theo khoảng giá tùy chỉnh và diện tích',
    module: 'Home',
    priority: 'high',
    tags: homeTags,
    preconditions: ['Trang chủ có dữ liệu'],
    testData: 'Giá Từ–Đến tùy chỉnh; Diện tích Từ–Đến',
    testSteps: '1. Nhập khoảng giá tùy chỉnh, áp dụng. 2. Nhập khoảng diện tích, áp dụng.',
    expectedResult: 'Danh sách hiển thị đúng các tin nằm trong khoảng đã nhập.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-HOME-FAVORITE-001',
    title: 'Thêm/bỏ tin yêu thích từ thẻ tin đăng (Card) tại trang chủ',
    module: 'Home',
    priority: 'medium',
    tags: homeTags,
    preconditions: ['Người dùng đã đăng nhập; tin đăng chưa yêu thích'],
    testData: 'Tin đăng bất kỳ',
    testSteps: '1. Nhấn icon Yêu thích trên Card. 2. Nhấn lại lần 2.',
    expectedResult: 'Lần 1: icon chuyển active, tin xuất hiện trong "Yêu thích". Lần 2: tin biến mất khỏi "Yêu thích".',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
];
