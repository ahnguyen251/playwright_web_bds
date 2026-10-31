---
ticket: BDS-256
topic: skip-reason-handling-and-personal-policy
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-29
---

# BDS-256 - skip-reason-handling-and-personal-policy

## Objective

Khắc phục tình trạng cảnh báo sai lệch ("Không thực hiện tạo tài khoản thử nghiệm bừa bãi trên Production") khi test case bị `SKIPPED` trên Web UI Runner (cụ thể với `TC-APT-CANCEL-001`), đồng thời thiết lập cơ chế báo cáo lý do bỏ qua test case (Skip Reason) trung thực và chuẩn hóa chính sách môi trường cá nhân (Personal / Educational Project).

## Current Understanding

- Người dùng phản ánh ảnh chụp màn hình Web UI (`localhost:3000`):
  `⚠️ Test case TC-APT-CANCEL-001 được BỎ QUA (SKIPPED) do chính sách an toàn môi trường: Không thực hiện tạo tài khoản thử nghiệm bừa bãi trên Production.`
- Người dùng nêu rõ:
  - Bản chất hệ thống là **dự án cá nhân / đồ án tốt nghiệp**, máy chủ web/backend (`https://propifyy.duckdns.org/`) đóng vai trò như môi trường thử nghiệm / demo, không gây ảnh hưởng đến người dùng thực tế bên ngoài.
  - Người dùng thắc mắc: Làm sao để tránh được các cảnh báo này mà vẫn chạy kiểm thử an toàn và chính xác?

## Requirements

1. **Loại bỏ chuỗi cảnh báo hardcode sai lệch trong Web UI (`TestCaseDetailsView.js`)**:
   - Xóa bỏ câu alert cố định `...Không thực hiện tạo tài khoản thử nghiệm bừa bãi trên Production.` khi `res.status === 'SKIPPED'`.
   - Hiển thị lý do skip thực tế trả về từ test run (ví dụ: lý do thiếu dữ liệu tiền đề hoặc cờ an toàn) thay vì thông báo mặc định sai ngữ cảnh.

2. **Thu thập và lưu trữ Skip Reason trung thực trong Playwright Reporter (`test-tracking-reporter.ts`)**:
   - Khi một test case bị `SKIPPED`, trích xuất lý do bỏ qua từ `test.annotations` (hoặc `testInfo.annotations` có `type: 'skip'`).
   - Lưu trữ lý do skip này vào trường `error_message` (hoặc lý do thực thi) trong bảng `test_results`.

3. **Trả về lý do Skip qua API Runner (`TestExecutionService.ts`)**:
   - Đảm bảo API `/api/test-cases/:id/run` trả về trường `errorMessage` (chứa lý do skip) khi test case có trạng thái `SKIPPED`.

4. **Chuẩn hóa hướng dẫn chạy kiểm thử an toàn cho Dự án Cá nhân**:
   - Hướng dẫn cấu hình cờ môi trường `.env` (`ALLOW_MUTATING_E2E=true`, `RUN_PRODUCTION_MUTATING_E2E=true`) khi chạy qua CLI.
   - Giải thích rõ điều kiện dữ liệu nghiệp vụ (pre-condition) đối với các kịch bản state-transition (ví dụ: `TC-APT-CANCEL-001` yêu cầu có sẵn ít nhất một lịch hẹn "Đã xác nhận" trên tài khoản).

## Acceptance Criteria

- [Derived-1] Khi test case bị `SKIPPED` trên Web UI (`TestCaseDetailsView.js` và `TestCasesView.js`), thông báo hiển thị đúng lý do skip thực tế (ví dụ: `Không tìm thấy bản ghi lịch hẹn "Đã xác nhận" khả dụng`), không còn xuất hiện câu hardcode về "tạo tài khoản thử nghiệm".
- [Derived-2] Reporter `test-tracking-reporter.ts` ghi nhận chính xác mô tả lý do skip từ `test.annotations` vào cơ sở dữ liệu `test_results` (`error_message`).
- [Derived-3] API `executeTestCase` trả về đầy đủ `errorMessage` khi test case bị `SKIPPED`, giúp modal kết quả hiển thị minh bạch lý do bỏ qua.
- [Derived-4] Dự án cá nhân có tài liệu/hướng dẫn rõ ràng về việc bật cờ mutating mà không bị chặn an toàn.

## Verified Findings

- `public/js/views/TestCaseDetailsView.js:286`: Chuỗi cảnh báo `alert('⚠️ Test case ${tc.test_case_id} được BỎ QUA (SKIPPED) do chính sách an toàn môi trường: Không thực hiện tạo tài khoản thử nghiệm bừa bãi trên Production.')` bị hardcode cố định cho mọi kịch bản `SKIPPED`.
- `tests/appointments/appointment-cancellation.mutating.spec.ts:25-30`: `TC-APT-CANCEL-001` tự động gọi `test.skip(true, 'RESEED/CONFIRMED APPOINTMENT REQUIRED: Không tìm thấy bản ghi lịch hẹn "Đã xác nhận" khả dụng để thực hiện hủy.')` khi tài khoản hiện tại không có lịch hẹn nào mang trạng thái "Đã xác nhận".
- `reporters/test-tracking-reporter.ts`: Hiện chỉ lấy `errorMessage = result.error?.message`. Khi test bị skip, `result.error` là `undefined`, dẫn đến `error_message` trong SQLite lưu giá trị `NULL`.
- `server/services/TestExecutionService.ts`: Đã tự động kích hoạt các cờ mutating (`RUN_MUTATING_E2E=true`, `ALLOW_MUTATING_E2E=true`) khi spawn tiến trình con Playwright, chứng minh test không bị skip bởi mutation gate mà bị skip do điều kiện dữ liệu lịch hẹn trên trang web.

## Confirmed Decisions

- Không dùng alert hardcode. Luôn ưu tiên hiển thị lý do skip thực tế thu thập từ Playwright runner.
- Nếu không có lý do skip cụ thể, hiển thị thông báo trung tính: `Test case [ID] được bỏ qua (SKIPPED) theo điều kiện kịch bản kiểm thử.`

## Constraints

- Giữ nguyên cấu trúc bảng `test_results` của SQLite (tận dụng cột `error_message` vốn có để lưu trữ skip reason, không cần migration thay đổi schema phá vỡ tương thích).
- Giữ nguyên cơ chế an toàn của Playwright framework khi chạy CI.

## Out of Scope

- Tự động reseed / can thiệp vào cơ sở dữ liệu production backend của bên thứ ba (`propifyy.duckdns.org`).

## Proposed Implementation

1. **Cập nhật `reporters/test-tracking-reporter.ts`**:
   - Khi `result.status === 'skipped'`, kiểm tra `test.annotations.find(a => a.type === 'skip')?.description`. Nếu có, gán làm `errorMessage`.
2. **Cập nhật `public/js/views/TestCaseDetailsView.js`**:
   - Thay thế alert hardcode bằng thông báo linh hoạt sử dụng `res.errorMessage` hoặc mở modal chi tiết để người dùng xem trực quan.
3. **Cập nhật `public/js/views/TestCasesView.js`**:
   - Hiển thị toast kèm lý do skip thực tế nếu có (`res.errorMessage`).
4. **Cung cấp hướng dẫn cho người dùng về dữ liệu và file `.env`**.

## Expected File Changes

- `reporters/test-tracking-reporter.ts`: Trích xuất skip reason từ `test.annotations` và `result.annotations` khi `result.status === "skipped"`.
- `tests/unit/reporters/test-tracking-reporter.spec.ts`: Bổ sung kịch bản unit test xác thực skip reason được lưu trữ vào ErrorMessage.
- `public/js/views/TestCaseDetailsView.js`: Hiển thị lý do skip thực tế thay vì chuỗi hardcode về tạo tài khoản.
- `public/js/views/TestCasesView.js`: Tinh chỉnh toast hiển thị lý do skip thực tế.
- `public/js/components/ResultDetailsModal.js`: Gắn nhãn "Lý Do Bỏ Qua (Skip Reason)" khi test case có trạng thái SKIPPED.

## Open Questions

- [non-blocking] Đối với dự án cá nhân, bạn có muốn cấu hình mặc định trong `.env` chuyển sang `ALLOW_MUTATING_E2E=true` và `RUN_PRODUCTION_MUTATING_E2E=true` để có thể chạy trực tiếp từ CLI bất cứ lúc nào mà không cần truyền biến môi trường thủ công không?

## Risks and Conflicts

- Không có rủi ro xung đột. Thay đổi hoàn toàn tương thích ngược với các test case hiện tại.

## Impact Analysis

- Cải thiện trải nghiệm người dùng: không còn hiểu lầm thông báo lỗi về tài khoản khi chạy các module nghiệp vụ khác như lịch hẹn, tin đăng.
- Minh bạch kết quả chạy kiểm thử trên dashboard và báo cáo.

## Verification Plan

- Chạy `node scripts/validate_discussion.js` kiểm tra tính hợp lệ của tài liệu.
- Chạy `npm run typecheck` và `npx eslint` trên các file đã sửa đổi.
- Chạy `npx playwright test tests/unit/reporters/test-tracking-reporter.spec.ts --project=framework`.

## Verification Results

- `npm run typecheck`: 0 errors (PASSED).
- `npx eslint reporters/test-tracking-reporter.ts tests/unit/reporters/test-tracking-reporter.spec.ts`: 0 errors, 0 warnings (PASSED).
- `npx playwright test tests/unit/reporters/test-tracking-reporter.spec.ts --project=framework`: 8 passed (PASSED).

## Change Reconciliation

- Đã loại bỏ chuỗi alert hardcode trong `TestCaseDetailsView.js`.
- Đã bổ sung logic trích xuất skip reason từ annotations trong `test-tracking-reporter.ts`.
- Đã bổ sung unit test trong `test-tracking-reporter.spec.ts`.
- Đã cập nhật `TestCasesView.js` và `ResultDetailsModal.js` để hiển thị lý do skip thân thiện.
