import { TAGS } from '../../constants/tags';
import type { TestCaseDefinition } from '../../types/test-case.types';

const appointmentTags = Object.freeze([TAGS.regression, TAGS.appointments]);

export const appointmentTestCases: readonly TestCaseDefinition[] = [
  {
    id: 'TC-APT-CREATE-001',
    title: '[State Transition] Đặt lịch hẹn thành công, khởi tạo trạng thái "Chờ xác nhận"',
    module: 'Appointments',
    priority: 'critical',
    tags: appointmentTags,
    preconditions: ['Khách đã đăng nhập (Context A); căn hộ "Đang đăng"; không phải chủ căn hộ; chưa có lịch hẹn chưa hoàn thành tại căn hộ này'],
    testData: 'Ngày/Khung giờ hợp lệ (> giờ hiện tại 2h); Họ tên/SĐT hợp lệ',
    testSteps: '1. Chọn ngày trên Carousel. 2. Chọn khung giờ từ dropdown. 3. Nhập/chỉnh sửa thông tin liên hệ. 4. Nhấn "Đặt lịch hẹn".',
    expectedResult: 'Bản ghi lịch hẹn tạo thành công, trạng thái mặc định "Chờ xác nhận"; gửi thông báo cho các bên.',
    automation: { status: 'AUTOMATED' as const, scriptPath: 'tests/appointments/appointment-booking.mutating.spec.ts' },
  },
  {
    id: 'TC-APT-CREATE-002',
    title: 'Chặn đặt lịch cho căn hộ của chính mình / khi đã có lịch chưa hoàn thành',
    module: 'Appointments',
    priority: 'high',
    tags: appointmentTags,
    preconditions: ['Người dùng là chủ căn hộ đang thao tác; hoặc đã có lịch hẹn chưa hoàn thành tại cùng căn hộ'],
    testData: 'Căn hộ của chính mình; căn hộ đã có lịch trước đó',
    testSteps: '1. Thử đặt lịch cho căn hộ của chính mình. 2. Thử đặt thêm lịch cho căn hộ đã có lịch chưa hoàn thành.',
    expectedResult: 'Case 1: "Bạn không thể đặt lịch căn hộ của chính mình". Case 2: "Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại."',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-APT-CREATE-003',
    title: 'Khung giờ hiển thị chỉ cách giờ hiện tại tối thiểu 2 tiếng; SĐT sai định dạng bị chặn',
    module: 'Appointments',
    priority: 'medium',
    tags: appointmentTags,
    preconditions: ['Đang mở popup đặt lịch'],
    testData: 'Dropdown khung giờ; SĐT sai định dạng',
    testSteps: '1. Mở dropdown Khung giờ, kiểm tra danh sách. 2. Nhập SĐT sai định dạng, submit.',
    expectedResult: 'Case 1: chỉ hiện khung giờ ≥ hiện tại + 2h. Case 2: lỗi định dạng SĐT.',
    automation: { status: 'AUTOMATED' as const, scriptPath: 'tests/appointments/appointment-validation.read-only.spec.ts' },
  },
  {
    id: 'TC-APT-CONFIRM-001',
    title: '[State Transition / Multi-Context] Chủ nhà xác nhận lịch hẹn thành công',
    module: 'Appointments',
    priority: 'critical',
    tags: appointmentTags,
    preconditions: ['Context A (Khách) + Context B (Chủ nhà) đồng thời; lịch hẹn "Chờ xác nhận"'],
    testData: 'Bản ghi lịch hẹn có sẵn',
    testSteps: '1. (Context B) Vào danh sách lịch hẹn, click "Xác nhận lịch hẹn". 2. (Context A) Reload/quan sát.',
    expectedResult: 'Trạng thái chuyển "Đã xác nhận" ngay lập tức; đồng bộ trên cả 2 giao diện.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-APT-REJECT-001',
    title: '[State Transition / Business Rule] Từ chối lịch hẹn — bắt buộc nhập lý do',
    module: 'Appointments',
    priority: 'high',
    tags: appointmentTags,
    preconditions: ['Lịch hẹn "Chờ xác nhận"; Chủ nhà ở trang quản lý lịch hẹn (Context B)'],
    testData: 'Lý do: "Khung giờ này tôi có lịch bàn giao căn hộ khác"',
    testSteps: '1. Click "Từ chối lịch hẹn". 2. Để trống lý do, nhấn "Gửi" → quan sát lỗi. 3. Nhập lý do hợp lệ, nhấn "Gửi".',
    expectedResult: 'Bước 2: chặn, báo lỗi bắt buộc nhập lý do. Bước 3: trạng thái → "Bị từ chối", Khách xem được lý do.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-APT-CANCEL-001',
    title: '[State Transition] Khách/Chủ nhà hủy lịch hẹn "Đã xác nhận" thành công',
    module: 'Appointments',
    priority: 'critical',
    tags: appointmentTags,
    preconditions: ['Lịch hẹn giữa Khách A và Chủ nhà B đang "Đã xác nhận"; còn ≥2h trước giờ hẹn'],
    testData: 'Lý do hủy hợp lệ',
    testSteps: '1. (Context A) Vào "Lịch hẹn của tôi", nhấn "Hủy lịch", xác nhận. 2. (Context B) Vào "Quản lý lịch hẹn", nhấn "Hủy lịch", xác nhận (test riêng biệt cho từng bên).',
    expectedResult: 'Trạng thái chuyển "Khách hủy" (nếu Khách thao tác) hoặc "Chủ nhà hủy" (nếu Chủ nhà thao tác); bên còn lại nhận thông báo.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-APT-CANCEL-002',
    title: 'Chặn hủy khi dưới 2 tiếng trước giờ hẹn / khi bỏ trống lý do',
    module: 'Appointments',
    priority: 'high',
    tags: appointmentTags,
    preconditions: ['Lịch hẹn "Đã xác nhận", còn <2h trước giờ hẹn; hoặc đủ điều kiện hủy nhưng bỏ trống lý do'],
    testData: 'Lịch cận giờ; lý do hủy: ""',
    testSteps: '1. Nhấn "Hủy lịch" khi còn <2h → quan sát. 2. Ở điều kiện đủ hủy, để trống lý do, xác nhận → quan sát.',
    expectedResult: 'Case 1: chặn, giữ nguyên "Đã xác nhận", lỗi "chỉ được hủy trước giờ hẹn tối thiểu 2 giờ". Case 2: chặn lưu, cảnh báo "Vui lòng cung cấp lý do hủy lịch".',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
  {
    id: 'TC-APT-CANCEL-003',
    title: '[Business Rule] Chặn thao tác Hủy khi lịch hẹn đã ở trạng thái đóng (Bị từ chối/Đã gỡ)',
    module: 'Appointments',
    priority: 'medium',
    tags: appointmentTags,
    preconditions: ['Bản ghi lịch hẹn đang "Bị từ chối" hoặc đã bị 1 bên hủy trước đó'],
    testData: 'Thao tác API/UI can thiệp',
    testSteps: '1. Cố gắng kích hoạt Hủy (UI hoặc API request) trên bản ghi đã đóng.',
    expectedResult: 'Hệ thống từ chối thực thi, báo lỗi "Trạng thái lịch hẹn không hợp lệ để thực hiện thao tác", giữ nguyên trạng thái.',
    automation: { status: 'NOT_AUTOMATED' as const },
  },
];

export const getAppointmentTestCase = (id: string): TestCaseDefinition => {
  const testCase = appointmentTestCases.find((candidate) => candidate.id === id);
  if (testCase === undefined) throw new Error(`Unknown appointment test case: ${id}`);
  return testCase;
};

export const appointmentCaseTitle = (id: string): string => {
  const testCase = getAppointmentTestCase(id);
  return `${testCase.id} ${testCase.title} ${testCase.tags.join(' ')}`;
};
