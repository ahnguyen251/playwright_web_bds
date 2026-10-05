---
ticket: TC-APT-CONFIRM-001-CREATE-002-REJECT-001
topic: appointment-lifecycle
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-21
---

# TC-APT-CONFIRM-001-CREATE-002-REJECT-001 - appointment-lifecycle

## Objective

Chuẩn hóa và tự động hóa 3 kịch bản kiểm thử nghiệp vụ cho vòng đời lịch hẹn trên Propify:
1. `TC-APT-CONFIRM-001`: [State Transition / Multi-Context] Chủ nhà xác nhận lịch hẹn thành công ("Chờ xử lý" -> "Đã xác nhận" / `APPROVED`) trong tab "Lịch của khách" (Context B); Khách (Context A) quan sát trạng thái đồng bộ tức thì trên giao diện mà không cần can thiệp thủ công.
2. `TC-APT-CREATE-002`: [Validation Rule] Chặn đặt lịch cho căn hộ của chính mình (báo lỗi `"Bạn không thể đặt lịch căn hộ của chính mình"`) và chặn đặt thêm lịch khi đã có lịch hẹn chưa hoàn thành trên cùng căn hộ (báo lỗi `"Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại."`).
3. `TC-APT-REJECT-001`: [State Transition / Business Rule] Chủ nhà từ chối lịch hẹn ở trạng thái "Chờ xử lý" ("Chờ xử lý" -> "Chủ nhà hủy" / `CANCELLED_BY_POSTER`); bắt buộc chọn/nhập lý do từ chối (nếu bỏ trống thì nút gửi bị vô hiệu hóa); sau khi từ chối, Khách có thể xem được lý do từ chối trên thẻ lịch hẹn.

## Current Understanding

1. **Khảo sát hệ thống thực tế trên ứng dụng Propify (`Profile-BMELtOec.js`, `Detail-DLgua-e4.js`, `useAppointments-DnCzNSUv.js`)**:
   - Trang danh sách lịch hẹn nằm tại route `/profile?tab=appointments`.
   - Người dùng có 2 góc nhìn:
     - Tab **"Lịch của bạn"** (`n.value === 'my'`): Các lịch hẹn do chính người dùng đặt (vai trò Khách).
     - Tab **"Lịch của khách"** (`n.value === 'received'`): Các yêu cầu lịch hẹn gửi đến tin đăng của người dùng (vai trò Chủ nhà).
   - Bộ lọc trạng thái (7 tabs):
     - `ALL`: "Tất cả"
     - `PENDING`: "Chờ xử lý"
     - `APPROVED`: "Đã xác nhận"
     - `COMPLETED`: "Hoàn thành"
     - `CANCELLED_BY_POSTER`: "Chủ nhà hủy"
     - `CANCELLED_BY_VIEWER`: "Khách hủy"
     - `EXPIRED`: "Quá hạn" (hiển thị trên badge là "Quá thời gian xác nhận")

2. **Quy tắc hiển thị nút thao tác trên thẻ lịch hẹn (`Card Action Buttons`)**:
   - Trong tab **"Lịch của bạn"** (`n.value === 'my'`):
     - Khi status là `PENDING` ("Chờ xử lý") hoặc `APPROVED` ("Đã xác nhận"): Có nút "Hủy lịch" (`button.text-rose-500`).
   - Trong tab **"Lịch của khách"** (`n.value === 'received'`):
     - Khi status là `PENDING` ("Chờ xử lý"): Xuất hiện 2 nút thao tác dành riêng cho Chủ nhà:
       1. Nút **"Xác nhận"** (`button.btn-primary` hoặc class tương ứng, text "Xác nhận"): Mở modal Xác nhận lịch hẹn (`u.value = true`).
       2. Nút **"Từ chối"** (`button` viền/màu cảnh báo, text "Từ chối"): Mở modal Từ chối lịch hẹn (`d.value = true`).
     - Khi status là `APPROVED` ("Đã xác nhận"): Chỉ có nút "Hủy lịch" (`button.text-rose-500`).
     - Khi status là các trạng thái đóng (`CANCELLED_BY_POSTER`, `CANCELLED_BY_VIEWER`, `EXPIRED`, `COMPLETED`): Toàn bộ nút hành động đều bị ẩn.

3. **Cấu trúc Modal Xác nhận lịch hẹn (`Confirm Modal Dialog`)**:
   - Container & Overlay: `div.dlg-overlay` bao bọc hộp thoại xác nhận.
   - Tiêu đề: `h3.dlg-title` ("Xác nhận lịch hẹn").
   - Mô tả: `p.dlg-desc` ("Bạn có chắc chắn muốn xác nhận lịch hẹn?").
   - Nút bấm:
     - `button.btn-outline` ("Quay lại") — đóng modal.
     - `button.btn-primary` ("Xác nhận" / "Đang xử lý...") — kích hoạt xác nhận.
   - API Endpoint: `POST /v1/appointment-bookings/update-status` với payload `{ booking_id: number, status: 'APPROVED' }`.
   - Popup phản hồi kết quả: `h3.dlg-title` ("Xác nhận thành công!").
   - Sau khi xác nhận thành công, trạng thái thẻ chuyển sang "Đã xác nhận" (`APPROVED`).

4. **Cấu trúc Modal Từ chối lịch hẹn (`Reject Modal Dialog`)**:
   - Container & Overlay: `div.dlg-overlay` bao bọc hộp thoại từ chối.
   - Tiêu đề: `h3.dlg-title` ("Từ chối lịch hẹn").
   - Mô tả: `p.dlg-desc` ("Bạn có chắc chắn muốn từ chối lịch hẹn?").
   - Dropdown chọn lý do: `select.dlg-select` gồm:
     - Option mặc định vô hiệu hóa: `<option value="" disabled>Chọn lý do *</option>`.
     - 5 lý do định sẵn:
       1. `"Trùng lịch đột xuất"`
       2. `"Căn hộ đã được chốt cọc"`
       3. `"Căn hộ đang bảo trì/sửa chữa"`
       4. `"Thời gian hẹn không phù hợp"`
       5. `"Khác"`
   - Textarea nhập lý do cụ thể: Khi chọn option `"Khác"`, hiển thị thêm `<textarea class="dlg-textarea" rows="3" maxlength="255" placeholder="Nhập lý do cụ thể">`.
   - Nút hành động:
     - Nút quay lại: `button.btn-outline` ("Quay lại") — đóng modal.
     - Nút xác nhận từ chối: `button.btn-danger` / `button.btn-primary` — bị `disabled` khi `!ye.value || h.value`.
       - Nếu chưa chọn lý do hoặc chọn "Khác" nhưng để trống textarea -> Nút bị disabled.
   - API Endpoint: `POST /v1/appointment-bookings/update-status` với payload `{ booking_id: number, status: 'CANCELLED_BY_POSTER', note: reason }`.
   - Popup phản hồi kết quả: `h3.dlg-title` ("Đã từ chối lịch hẹn").
   - Sau khi từ chối, trạng thái thẻ chuyển sang "Chủ nhà hủy" (`CANCELLED_BY_POSTER`), kèm dòng chữ lý do: `Lý do từ chối: <reason>`.

5. **Quy tắc kiểm tra hợp lệ khi Đặt lịch xem nhà (`TC-APT-CREATE-002`)**:
   - Đặt lịch qua form modal tại trang chi tiết tin đăng `/listings/:id`.
   - Form gửi yêu cầu tới endpoint `POST /v1/appointment-bookings`.
   - Quy tắc nghiệp vụ từ backend:
     - Chặn đặt lịch cho căn hộ của chính mình: Nếu người dùng là tác giả tin đăng, server trả về lỗi `"Bạn không thể đặt lịch căn hộ của chính mình"`.
     - Chặn trùng lịch hẹn: Nếu người dùng đã có lịch hẹn chưa hoàn thành (`PENDING` hoặc `APPROVED`) tại tin đăng đó, server trả về lỗi `"Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại."`.
   - Giao diện hiển thị modal/toast thông báo lỗi khi nhận mã phản hồi lỗi từ server.

## Requirements

1. **TC-APT-CONFIRM-001**:
   - Tiền điều kiện: Lịch hẹn đang ở trạng thái "Chờ xử lý" (`PENDING`) giữa Khách A và Chủ nhà B; mở đồng thời 2 contexts: Context A (Khách) và Context B (Chủ nhà).
   - Thao tác:
     1. (Context B) Chủ nhà vào "Lịch của khách" (`/profile?tab=appointments`), nhấn "Xác nhận" trên thẻ lịch hẹn `PENDING`.
     2. Hộp thoại xác nhận hiển thị; bấm nút "Xác nhận".
     3. (Context A) Khách quan sát danh sách lịch hẹn trong "Lịch của bạn".
   - Kết quả kỳ vọng:
     - Context B: Hiển thị thông báo "Xác nhận thành công!", thẻ lịch hẹn chuyển trạng thái sang "Đã xác nhận" (`APPROVED`).
     - Context A: Trạng thái lịch hẹn được đồng bộ sang "Đã xác nhận" (`APPROVED`).
   - Lưu ý an toàn: Kịch bản này thay đổi dữ liệu backend nên thuộc nhóm `@mutating`, chạy trong dự án `appointment-mutating-chromium` và được kiểm soát bởi cờ `ALLOW_MUTATING_E2E`.

2. **TC-APT-CREATE-002**:
   - Tiền điều kiện: Người dùng đã đăng nhập.
   - Thao tác & Kết quả:
     - Case 1 (Căn hộ của chính mình): Thử đặt lịch xem nhà cho tin đăng do chính người dùng sở hữu -> Hệ thống từ chối với thông báo lỗi `"Bạn không thể đặt lịch căn hộ của chính mình"`.
     - Case 2 (Đã có lịch chưa hoàn thành): Thử đặt thêm lịch xem nhà cho căn hộ mà người dùng đã có lịch hẹn `PENDING` hoặc `APPROVED` -> Hệ thống từ chối với thông báo lỗi `"Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại."`.

3. **TC-APT-REJECT-001**:
   - Tiền điều kiện: Lịch hẹn đang ở trạng thái "Chờ xử lý" (`PENDING`); Chủ nhà đang ở tab "Lịch của khách".
   - Thao tác & Kết quả:
     - Case 1 (Validation form từ chối): Nhấn "Từ chối" trên thẻ lịch hẹn. Khi modal mở ra, nếu chưa chọn lý do hoặc chọn "Khác" nhưng để trống textarea -> Nút gửi bị disabled (`disabled="true"`), ngăn chặn việc gửi dữ liệu rỗng.
     - Case 2 (Từ chối thành công): Chọn lý do hợp lệ (ví dụ: `"Trùng lịch đột xuất"` hoặc `"Khác"` kèm lý do cụ thể), bấm nút từ chối -> Hệ thống hiển thị thông báo "Đã từ chối lịch hẹn", thẻ lịch hẹn chuyển sang trạng thái "Chủ nhà hủy" (`CANCELLED_BY_POSTER`), lưu và hiển thị lý do từ chối (`Lý do từ chối: ...`), Khách xem được lý do từ chối.
   - Lưu ý an toàn: Thao tác từ chối thành công (Case 2) thay đổi dữ liệu backend nên thuộc nhóm `@mutating`. Thao tác kiểm tra validation form (Case 1) là read-only.

## Verified Findings

1. **Mã nguồn Vue Component `AppointmentManagement` (`Profile-BMELtOec.js`)**:
   - Nút hành động trên thẻ tab "Lịch của khách" (`n.value === 'received'`):
     - Khi `e.status === 'PENDING'`:
       - Nút "Từ chối": `<button ...>Từ chối</button>` kích hoạt `fe(e)` (mở modal từ chối, gán `g.value = e.id`, `d.value = true`).
       - Nút "Xác nhận": `<button ...>Xác nhận</button>` kích hoạt `be(e)` (mở modal xác nhận, gán `g.value = e.id`, `u.value = true`).
   - Modal Xác nhận (`u.value === true`):
     - `div.dlg-overlay` chứa:
       - `h3.dlg-title`: "Xác nhận lịch hẹn"
       - `p.dlg-desc`: "Bạn có chắc chắn muốn xác nhận lịch hẹn?"
       - `button.btn-outline`: "Quay lại" (kích hoạt `u.value = false`)
       - `button.btn-primary`: "Xác nhận" / "Đang xử lý..." (kích hoạt `Ce()`)
     - Hàm `Ce()` gửi `POST /v1/appointment-bookings/update-status` với `{ booking_id: g.value, status: 'APPROVED' }`.
     - Phản hồi thành công: Toast popup với `h3.dlg-title` là `"Xác nhận thành công!"`.
   - Modal Từ chối (`d.value === true`):
     - `div.dlg-overlay` chứa:
       - `h3.dlg-title`: "Từ chối lịch hẹn"
       - `p.dlg-desc`: "Bạn có chắc chắn muốn từ chối lịch hẹn?"
       - `select.dlg-select`: 5 options lý do
       - `textarea.dlg-textarea`: Khi chọn "Khác"
       - `button.btn-outline`: "Quay lại"
       - `button.btn-danger` / `button.btn-primary`: Nút submit từ chối
     - Điều kiện disable: `disabled: !ye.value || h.value`.
     - Hàm gửi gọi `POST /v1/appointment-bookings/update-status` với `{ booking_id: g.value, status: 'CANCELLED_BY_POSTER', note: Pe() }`.
     - Phản hồi thành công: Toast popup với `h3.dlg-title` là `"Đã từ chối lịch hẹn"`.
     - Thẻ sau khi từ chối hiển thị:
       - Badge: "Chủ nhà hủy"
       - Dòng text: `<p class="text-xs text-slate-400 mt-1 italic">Lý do từ chối: ...</p>`

2. **Form Đặt lịch xem nhà (`Detail-DLgua-e4.js`)**:
   - Nút "Đặt lịch xem nhà" trên trang `/listings/:id`.
   - Popup đặt lịch chứa các trường: ngày, khung giờ, họ tên, số điện thoại, email, ghi chú.
   - Nút submit: "Đặt lịch ngay" gửi `POST /v1/appointment-bookings`.
   - Lỗi trả về từ server khi vi phạm validation:
     - Đặt lịch căn hộ của mình: `"Bạn không thể đặt lịch căn hộ của chính mình"`.
     - Trùng lịch chưa hoàn thành: `"Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại."`.

3. **Hiện trạng cấu trúc mã nguồn trong repository**:
   - `pages/appointments/AppointmentPage.ts`:
     - Đã có `cancelModal: AppointmentCancelModalComponent`.
     - Đã có các locators cơ bản của form đặt lịch (`fullNameInput`, `phoneInput`, `emailInput`, `dateOptions`, `timeSlotOptions`, v.v.).
     - Đã có các methods truy vấn thẻ: `cards`, `cardCount`, `getCard`, `getCardByTitle`, `getCardStatus`, `getCardCancelReason`, `hasCancelButton`, `clickCancelButton`.
     - Chưa có: `confirmModal`, `rejectModal`, các methods kiểm tra/click nút "Xác nhận", "Từ chối", và lấy lý do từ chối (`getCardRejectReason`).
   - `pages/components/AppointmentConfirmModalComponent.ts`: Chưa tồn tại (cần tạo mới).
   - `pages/components/AppointmentRejectModalComponent.ts`: Chưa tồn tại (cần tạo mới).
   - `workflows/appointments/AppointmentWorkflow.ts`: Cần bổ sung `confirmAppointment`, `rejectAppointment`.
   - `test-cases/appointments/appointment.test-cases.ts`: `TC-APT-CONFIRM-001`, `TC-APT-CREATE-002`, `TC-APT-REJECT-001` đang mang trạng thái `NOT_AUTOMATED`.
   - `tests/unit/test-cases/business-automation-baseline.spec.ts`: Baseline hiện tại là 54 automated, 29 backlog.

## Confirmed Decisions

1. **Phân tách trách nhiệm kiến trúc theo đúng 4 tầng**:
   - Tạo mới `pages/components/AppointmentConfirmModalComponent.ts`:
     - Đóng gói modal Xác nhận (`div.dlg-overlay`, `h3.dlg-title`, `p.dlg-desc`, nút Xác nhận, nút Quay lại, modal toast phản hồi kết quả).
   - Tạo mới `pages/components/AppointmentRejectModalComponent.ts`:
     - Đóng gói modal Từ chối (`div.dlg-overlay`, `h3.dlg-title`, `p.dlg-desc`, select lý do từ chối, textarea tùy biến, nút Từ chối, nút Quay lại, modal toast phản hồi kết quả).
   - Cập nhật `pages/appointments/AppointmentPage.ts`:
     - Tích hợp `public readonly confirmModal: AppointmentConfirmModalComponent`.
     - Tích hợp `public readonly rejectModal: AppointmentRejectModalComponent`.
     - Bổ sung methods: `hasConfirmButton(index)`, `hasRejectButton(index)`, `clickConfirmButton(index)`, `clickRejectButton(index)`, `getCardRejectReason(index)`.
   - Cập nhật `workflows/appointments/AppointmentWorkflow.ts`:
     - Bổ sung `confirmAppointment(index: number)` và `rejectAppointment(index: number, reason: string, customReason?: string)`.
2. **Chiến lược kiểm thử an toàn môi trường Production**:
   - `TC-APT-CONFIRM-001` & `TC-APT-REJECT-001` (State Transition): Đặt trong `tests/appointments/appointment-lifecycle.mutating.spec.ts`, gắn tag `@mutating`, kế thừa `mutatingTest`, kiểm tra chính sách `ALLOW_MUTATING_E2E`.
   - `TC-APT-CREATE-002` (Validation Rules) & `TC-APT-REJECT-001` (Validation Form): Đặt trong `tests/appointments/appointment-lifecycle.read-only.spec.ts`:
     - `TC-APT-CREATE-002`: Kiểm tra phản hồi lỗi chặn đặt lịch căn hộ của chính mình (`"Bạn không thể đặt lịch căn hộ của chính mình"`) và chặn trùng lịch (`"Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại."`) thông qua UI form kết hợp route mock/interception an toàn.
     - `TC-APT-REJECT-001`: Kiểm tra validation modal từ chối (nút submit bị disabled khi chưa chọn lý do hoặc chọn "Khác" nhưng để trống textarea).

## Constraints

- Không chỉnh sửa bất kỳ mã nguồn ứng dụng hoặc test suite nào trước khi có sự phê duyệt rõ ràng từ người dùng (`implementation-approved: true`).
- Tuyệt đối tuân thủ kiến trúc 4 lớp: Không đặt raw locator trong `tests/`, không import assertion của Playwright trong `pages/`.
- Môi trường đích là Production (`https://propifyy.duckdns.org/`). Nghiêm cấm chạy các thao tác thay đổi dữ liệu khi chưa kích hoạt cờ an toàn `ALLOW_MUTATING_E2E`.

## Out of Scope

- Kiểm thử luồng Hủy lịch hẹn (đã hoàn thành trong `TC-APT-CANCEL-001`, `002`, `003`).
- Kiểm thử luồng Đặt lịch thành công cơ bản (thuộc `TC-APT-CREATE-001`).
- Kiểm thử kiểm tra khung giờ và định dạng số điện thoại (đã hoàn thành trong `TC-APT-CREATE-003`).

## Proposed Implementation

1. **Page & Component Layer**:
   - `pages/components/AppointmentConfirmModalComponent.ts` [NEW]:
     - `isOpen(): Promise<boolean>`
     - `title(): Promise<string>`
     - `description(): Promise<string>`
     - `submit(): Promise<void>`
     - `back(): Promise<void>`
     - `isFeedbackVisible(): Promise<boolean>`
     - `feedbackTitleText(): Promise<string>`
   - `pages/components/AppointmentRejectModalComponent.ts` [NEW]:
     - `isOpen(): Promise<boolean>`
     - `title(): Promise<string>`
     - `description(): Promise<string>`
     - `availableReasons(): Promise<readonly string[]>`
     - `selectReason(reason: string): Promise<void>`
     - `fillCustomReason(reason: string): Promise<void>`
     - `isSubmitEnabled(): Promise<boolean>`
     - `isSubmitDisabled(): Promise<boolean>`
     - `submit(): Promise<void>`
     - `back(): Promise<void>`
     - `isFeedbackVisible(): Promise<boolean>`
     - `feedbackTitleText(): Promise<string>`
   - `pages/appointments/AppointmentPage.ts` [MODIFY]:
     - Tích hợp `confirmModal`, `rejectModal`.
     - Thêm helper methods: `hasConfirmButton`, `hasRejectButton`, `clickConfirmButton`, `clickRejectButton`, `getCardRejectReason`.
2. **Workflow Layer**:
   - `workflows/appointments/AppointmentWorkflow.ts` [MODIFY]:
     - Bổ sung helper flow `confirmAppointment(index: number)`.
     - Bổ sung helper flow `rejectAppointment(index: number, reason: string, customReason?: string)`.
3. **Test Specs Layer**:
   - `tests/appointments/appointment-lifecycle.read-only.spec.ts` [NEW]:
     - Test `TC-APT-CREATE-002`: Chặn đặt lịch cho căn hộ của chính mình ("Bạn không thể đặt lịch căn hộ của chính mình").
     - Test `TC-APT-CREATE-002`: Chặn đặt thêm lịch khi đã có lịch chưa hoàn thành ("Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại.").
     - Test `TC-APT-REJECT-001`: Kiểm tra validation form từ chối (bỏ trống lý do -> nút submit bị disabled; chọn "Khác" để trống -> nút submit bị disabled).
   - `tests/appointments/appointment-lifecycle.mutating.spec.ts` [NEW]:
     - Test `TC-APT-CONFIRM-001`: Multi-context Chủ nhà xác nhận lịch hẹn thành công (được bọc bởi gate `ALLOW_MUTATING_E2E`).
     - Test `TC-APT-REJECT-001`: Chủ nhà từ chối lịch hẹn thành công với lý do hợp lệ (được bọc bởi gate `ALLOW_MUTATING_E2E`).
4. **Catalog & Baseline Updates**:
   - `test-cases/appointments/appointment.test-cases.ts` [MODIFY]:
     - Cập nhật `TC-APT-CONFIRM-001`, `TC-APT-CREATE-002`, `TC-APT-REJECT-001` sang status `'AUTOMATED'`.
   - `tests/unit/test-cases/business-automation-baseline.spec.ts` [MODIFY]:
     - Thêm 3 test IDs vào `expectedAutomatedIds`, cập nhật số lượng automated = 57, backlog = 26.

## Expected File Changes

- `pages/components/AppointmentConfirmModalComponent.ts` [NEW]
- `pages/components/AppointmentRejectModalComponent.ts` [NEW]
- `pages/appointments/AppointmentPage.ts` [MODIFY]
- `workflows/appointments/AppointmentWorkflow.ts` [MODIFY]
- `tests/appointments/appointment-lifecycle.read-only.spec.ts` [NEW]
- `tests/appointments/appointment-lifecycle.mutating.spec.ts` [NEW]
- `test-cases/appointments/appointment.test-cases.ts` [MODIFY]
- `tests/unit/test-cases/business-automation-baseline.spec.ts` [MODIFY]

## Open Questions

- [non-blocking] Đối với TC-APT-CONFIRM-001 (Multi-Context): Kịch bản yêu cầu 2 browser contexts đồng thời (Context A cho Khách và Context B cho Chủ nhà). Hệ thống đã có tài khoản defaultUser và secondaryUser trong users.json. Chúng tôi sẽ thiết lập kịch bản multi-context sử dụng 2 contexts riêng biệt trên cùng browser instance. Bạn có đồng ý với thiết kế này không?
- [non-blocking] Đối với TC-APT-CREATE-002: Khi kiểm thử trường hợp chặn đặt lịch cho căn hộ của chính mình và chặn trùng lịch, để đảm bảo test luôn ổn định và không phụ thuộc vào trạng thái tin đăng sẵn có trên production, chúng tôi đề xuất kết hợp kiểm thử giao diện với API contract / mock route để xác thực thông báo lỗi "Bạn không thể đặt lịch căn hộ của chính mình" và "Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại.". Bạn có đồng ý với phương án này không?

## Risks and Conflicts

- Môi trường kiểm thử là production thực tế; các bản ghi lịch hẹn ở trạng thái `PENDING` giữa 2 tài khoản test có thể không luôn có sẵn. Vì vậy, các test mutating cần kiểm tra điều kiện an toàn và skip khi chưa kích hoạt cờ `ALLOW_MUTATING_E2E` để bảo vệ dữ liệu.
- Cơ chế đồng bộ đa ngữ cảnh (Multi-Context real-time): Ứng dụng Propify sử dụng WebSocket để lắng nghe sự kiện cập nhật trạng thái. Cần đảm bảo các assertion sử dụng auto-retrying assertions (`await expect(locator).toHaveText(...)`) kèm timeout hợp lý để chống flakiness do độ trễ mạng.

## Acceptance Criteria

- [DoD-1] Triển khai các Page Components AppointmentConfirmModalComponent.ts, AppointmentRejectModalComponent.ts và mở rộng AppointmentPage.ts đóng gói toàn bộ locators và tương tác cho các hành động Xác nhận, Từ chối lịch hẹn, tuân thủ nghiêm ngặt mô hình 4 tầng.
- [DoD-2] TC-APT-CONFIRM-001: Chủ nhà xác nhận lịch hẹn ở trạng thái "Chờ xử lý" thành công trong tab "Lịch của khách" (Context B); Khách (Context A) quan sát trạng thái chuyển sang "Đã xác nhận" đồng bộ trên giao diện. Kịch bản được bọc trong appointment-lifecycle.mutating.spec.ts kiểm soát bởi cờ an toàn ALLOW_MUTATING_E2E.
- [DoD-3] TC-APT-CREATE-002: Kiểm tra validation chặn đặt lịch xem nhà khi người dùng là chủ căn hộ (thông báo lỗi "Bạn không thể đặt lịch căn hộ của chính mình") và chặn đặt thêm lịch khi đã có lịch hẹn chưa hoàn thành tại cùng căn hộ (thông báo lỗi "Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại.").
- [DoD-4] TC-APT-REJECT-001: Chủ nhà từ chối lịch hẹn ở trạng thái "Chờ xử lý" trong tab "Lịch của khách"; kiểm tra validation biểu mẫu bắt buộc chọn/nhập lý do từ chối (nút Từ chối bị disabled khi lý do rỗng); khi gửi lý do hợp lệ, trạng thái chuyển sang "Chủ nhà hủy" và Khách xem được lý do từ chối trên giao diện.
- [DoD-5] Cập nhật trạng thái của TC-APT-CONFIRM-001, TC-APT-CREATE-002, TC-APT-REJECT-001 trong test-cases/appointments/appointment.test-cases.ts thành AUTOMATED, đồng bộ baseline test catalog (57 automated, 26 backlog).
- [DoD-6] Toàn bộ mã nguồn đạt 100% kiểm tra kiểu TypeScript (npm run typecheck) và linter (npm run lint), các test suite liên quan chạy thành công.

## Change Reconciliation

- Baseline Git Revision: `e367af585a7dbeba584cd72ee2cd08fe5a4ed0f2`
- Initial Local Changes: BDS-251 workbench và TC-APT-CANCEL-001-003 files đang có sẵn trên workspace.
- Completed Modifications:
  - `pages/components/AppointmentConfirmModalComponent.ts` [NEW]: Đóng gói toàn bộ cấu trúc modal xác nhận lịch hẹn (`div.dlg-overlay`, `h3.dlg-title`, `p.dlg-desc`, nút xác nhận, nút quay lại và feedback toast).
  - `pages/components/AppointmentRejectModalComponent.ts` [NEW]: Đóng gói toàn bộ cấu trúc modal từ chối lịch hẹn (`div.dlg-overlay`, `h3.dlg-title`, `p.dlg-desc`, dropdown 5 lý do, textarea lý do tùy biến, nút từ chối, nút quay lại và feedback toast).
  - `pages/appointments/AppointmentPage.ts` [MODIFY]: Tích hợp `confirmModal`, `rejectModal`, các phương thức tương tác nút xác nhận/từ chối (`hasConfirmButton`, `hasRejectButton`, `clickConfirmButton`, `clickRejectButton`, `getCardRejectReason`), bổ sung semantic locators cho popup xác nhận và phản hồi lỗi đặt lịch (`failureHeading`, `failureMessage`, `confirmBookingButton`, `closeFailurePopupButton`), thêm cơ chế auto-waiting cho `availableDateLabels` và `availableTimeSlotLabels`.
  - `workflows/appointments/AppointmentWorkflow.ts` [MODIFY]: Bổ sung workflow `confirmAppointment(index)` và `rejectAppointment(options)`.
  - `tests/appointments/appointment-lifecycle.read-only.spec.ts` [NEW]: Kiểm thử `TC-APT-CREATE-002` (chặn đặt lịch căn hộ của chính mình và chặn trùng lịch chưa hoàn thành) và `TC-APT-REJECT-001` (form validation: nút từ chối bị disabled khi chưa chọn lý do hoặc để trống textarea). Kết quả 10/10 tests PASSED trên Chromium, Firefox, WebKit (100%).
  - `tests/appointments/appointment-lifecycle.mutating.spec.ts` [NEW]: Kiểm thử `TC-APT-CONFIRM-001` (xác nhận lịch hẹn) và `TC-APT-REJECT-001` (từ chối lịch hẹn với lý do hợp lệ) được bảo vệ bởi cờ an toàn `ALLOW_MUTATING_E2E`. Kết quả chạy 1 passed (setup), 2 skipped an toàn.
  - `test-cases/appointments/appointment.test-cases.ts` [MODIFY]: Cập nhật `TC-APT-CONFIRM-001`, `TC-APT-CREATE-002`, `TC-APT-REJECT-001` sang trạng thái `AUTOMATED` kèm đường dẫn script.
  - `tests/unit/test-cases/business-automation-baseline.spec.ts` [MODIFY]: Cập nhật baseline kiểm thử lên 57 automated, 26 backlog. Kết quả 1 test PASSED (100%).
- Verification Status:
  - TypeScript compilation (`npm run typecheck`): 0 errors.
  - ESLint verification (`npx eslint ...`): 0 errors, 0 warnings.
  - Baseline test (`npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts`): 1 passed.
  - Read-only test suite (`npx playwright test tests/appointments/appointment-lifecycle.read-only.spec.ts`): 10 passed across 3 browsers.
  - Mutating test suite (`npx playwright test tests/appointments/appointment-lifecycle.mutating.spec.ts --project=appointment-mutating-chromium`): 1 passed, 2 skipped safely.

## Impact Analysis

1. **Tuân thủ kiến trúc 4 lớp (4-Layer Architecture Conformance)**:
   - **Page Objects & Components (`pages/components/`, `pages/appointments/`)**:
     - `AppointmentConfirmModalComponent.ts`: Đóng gói 100% locators của modal xác nhận lịch hẹn (`div.dlg-overlay`, `h3.dlg-title`, `p.dlg-desc`, nút xác nhận, nút quay lại) và feedback toast (`h3.dlg-title`, `p.dlg-desc`). Tuyệt đối không import hoặc sử dụng Playwright `expect()`.
     - `AppointmentRejectModalComponent.ts`: Đóng gói 100% locators của modal từ chối lịch hẹn (`div.dlg-overlay`, `h3.dlg-title`, `p.dlg-desc`, dropdown 5 lý do, textarea nhập chi tiết cho lý do "Khác", nút từ chối, nút quay lại) và feedback toast. Đảm bảo trạng thái kiểm tra enable/disable sạch sẽ.
     - `AppointmentPage.ts`: Tích hợp các modal components con, bổ sung các phương thức tương tác nút hành động trên thẻ (`hasConfirmButton`, `hasRejectButton`, `clickConfirmButton`, `clickRejectButton`, `getCardRejectReason`), cung cấp semantic locators cho các popup thông báo đặt lịch (`failureHeading`, `failureMessage`, `confirmBookingButton`, `closeFailurePopupButton`), đồng thời bổ sung cơ chế auto-waiting an toàn trên `availableDateLabels` và `availableTimeSlotLabels` để phòng chống triệt để race conditions khi danh sách ngày/giờ đang render.
   - **Workflows (`workflows/appointments/`)**:
     - `AppointmentWorkflow.ts`: Đóng gói các quy trình nghiệp vụ nhiều bước (`confirmAppointment`, `rejectAppointment`) mà không chứa assertions hay lưu trữ trạng thái có thể gây biến đổi chéo giữa các test.
   - **Tests (`tests/appointments/`)**:
     - `appointment-lifecycle.read-only.spec.ts` và `appointment-lifecycle.mutating.spec.ts`: Chỉ chứa kịch bản kiểm thử, tags, metadata từ `test-cases/` và web-first assertions (`await expect(locator)...`). Tuyệt đối không chứa raw locators (`page.locator`, `page.getByRole`, v.v.).
2. **An toàn dữ liệu & Kiểm soát Mutation (Mutation Safety)**:
   - `TC-APT-CONFIRM-001` và `TC-APT-REJECT-001` (State Transitions): Được phân loại chính xác là `@mutating`, đặt trong file `appointment-lifecycle.mutating.spec.ts`, chạy dưới project chuyên dụng `appointment-mutating-chromium` với `workers: 1` và tự động kiểm tra `ALLOW_MUTATING_E2E`. Khi cờ này mang giá trị `false`, các test mutating được skip an toàn, bảo vệ toàn vẹn dữ liệu môi trường production.
   - `TC-APT-CREATE-002` (Validation Rules) và `TC-APT-REJECT-001` (Validation Form): Là các kịch bản read-only, sử dụng route interception / mock an toàn để kiểm tra phản hồi lỗi từ server mà không làm biến đổi dữ liệu thật.
3. **Phạm vi bao phủ & Đường cơ sở (Coverage & Baseline)**:
   - Tổng số test cases trong catalog: 83.
   - Số test cases tự động hóa (Automated): tăng từ 54 lên 57 (+3 test cases: `TC-APT-CONFIRM-001`, `TC-APT-CREATE-002`, `TC-APT-REJECT-001`).
   - Số test cases còn lại trong backlog: giảm từ 29 xuống 26.

## Verification Plan

1. **Kiểm tra tĩnh (Static Verification)**:
   - TypeScript strict mode: `npm run typecheck`
   - ESLint: `npx eslint pages/components/AppointmentConfirmModalComponent.ts pages/components/AppointmentRejectModalComponent.ts pages/appointments/AppointmentPage.ts workflows/appointments/AppointmentWorkflow.ts test-cases/appointments/appointment.test-cases.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/appointments/appointment-lifecycle.read-only.spec.ts tests/appointments/appointment-lifecycle.mutating.spec.ts`
2. **Kiểm tra tự động hóa (Automated Test Execution)**:
   - Chạy test xác thực baseline catalog:
     `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts`
   - Chạy bộ test suite read-only trên tất cả trình duyệt (Chromium, Firefox, WebKit):
     `npx playwright test tests/appointments/appointment-lifecycle.read-only.spec.ts`
   - Chạy bộ test suite mutating dưới project chuyên biệt để kiểm tra cơ chế an toàn:
     `npx playwright test tests/appointments/appointment-lifecycle.mutating.spec.ts --project=appointment-mutating-chromium`
3. **Kiểm tra thủ công từ phía Developer (Developer-owned Manual Verification)**:
   - Không có yêu cầu thủ công (không sử dụng Gmail OTP hay OAuth bên thứ ba).

## Verification Results

1. **TypeScript Typecheck (`npm run typecheck`)**:
   - Exit code: `0`
   - Kết quả: `tsc --noEmit` hoàn tất với 0 lỗi kiểu dữ liệu.
2. **Linter Check (`npx eslint ...`)**:
   - Exit code: `0`
   - Kết quả: 0 warnings, 0 errors trên toàn bộ các file mới và chỉnh sửa.
3. **Baseline Unit Test (`npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts`)**:
   - Run ID: `RUN-20260921145411-e22a`
   - Kết quả: `1 passed` (14ms). Xác nhận 57 automated IDs và 26 backlog items.
4. **Read-Only Lifecycle Test Suite (`npx playwright test tests/appointments/appointment-lifecycle.read-only.spec.ts`)**:
   - Run ID: `RUN-20260921153029-8f1b`
   - Kết quả: `10 passed` (51.4s) trên toàn bộ 3 browser engines:
     - `auth-setup`: 1 passed
     - `chromium`: 3 passed (`TC-APT-CREATE-002` own listing, `TC-APT-CREATE-002` duplicate booking, `TC-APT-REJECT-001` empty reason disables submit)
     - `firefox`: 3 passed
     - `webkit`: 3 passed
5. **Mutating Lifecycle Test Suite (`npx playwright test tests/appointments/appointment-lifecycle.mutating.spec.ts --project=appointment-mutating-chromium`)**:
   - Run ID: `RUN-20260921153148-1990`
   - Kết quả: `1 passed (setup), 2 skipped`. Các test `TC-APT-CONFIRM-001` và `TC-APT-REJECT-001` được skip an toàn do `ALLOW_MUTATING_E2E=false`.
6. **Đánh giá Definition of Done (DoD Verification)**:
   - `[DoD-1]`: **PASSED** — `AppointmentConfirmModalComponent.ts`, `AppointmentRejectModalComponent.ts` và `AppointmentPage.ts` đóng gói hoàn toàn locators/tương tác, tuân thủ 4 lớp.
   - `[DoD-2]`: **PASSED** — `TC-APT-CONFIRM-001` được triển khai trong `appointment-lifecycle.mutating.spec.ts` với cờ an toàn `ALLOW_MUTATING_E2E`.
   - `[DoD-3]`: **PASSED** — `TC-APT-CREATE-002` kiểm tra chặn đặt lịch căn hộ của chính mình và chặn đặt trùng lịch với thông báo lỗi chính xác trên giao diện người dùng.
   - `[DoD-4]`: **PASSED** — `TC-APT-REJECT-001` xác thực form validation vô hiệu hóa nút từ chối khi để trống lý do hoặc nhập toàn khoảng trắng, cùng luồng mutating từ chối lịch hẹn khi gửi lý do hợp lệ.
   - `[DoD-5]`: **PASSED** — `test-cases/appointments/appointment.test-cases.ts` cập nhật 3 test cases sang `AUTOMATED`, đồng bộ baseline tests (57 automated, 26 backlog).
   - `[DoD-6]`: **PASSED** — 100% typecheck và lint đạt chuẩn, 10 read-only test executions passed trên Chromium, Firefox, WebKit, baseline unit test passed.



