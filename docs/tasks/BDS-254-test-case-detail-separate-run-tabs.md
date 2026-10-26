---
ticket: BDS-254
topic: test-case-detail-separate-run-tabs
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-24
---

# BDS-254 - test-case-detail-separate-run-tabs

## Objective

Bổ sung thanh chuyển đổi 2 Tab riêng biệt ("Chạy Theo Nhóm" vs "Chạy Riêng Lẻ") vào bảng lịch sử thực thi trên trang Chi Tiết Test Case (`public/js/views/TestCaseDetailsView.js`), đồng bộ với trang Lịch Sử Chạy Test (`RunsView.js`). Đồng thời sửa lỗi `Evidence archive failed (INVALID_RUN_ID)` khi chạy test case từ nút Play trên web dashboard.

## Current Understanding

- Người dùng thắc mắc:
  1. "tôi đang kh thấy có data": Cơ sở dữ liệu SQLite trước đó chỉ có các lần chạy suite (`RUN-...`), chưa có lần chạy adhoc nào hoàn tất nên tab "Chạy Riêng Lẻ" hiển thị trống.
  2. "ở trang chi tiết của test case cũng phải có 2 tab riêng lẻ chứ nhỉ": Cần 2 tab độc lập cho lịch sử thực thi test case.
  3. Khi bấm Play test case `TC-APT-CANCEL-003`, gặp lỗi: `Evidence archive failed (INVALID_RUN_ID); the run will be rolled back.`
- Nguyên nhân lỗi `INVALID_RUN_ID`: Trong `services/evidence/EvidenceArchiveService.ts`, regex kiểm tra tính an toàn của thư mục lưu chứng cứ `SAFE_RUN_ID` chỉ cho phép tiền tố `RUN-` và `BUSINESS-RUN-` (`/^(?:BUSINESS-)?RUN-\d{14}-[a-f0-9]{4}$/u`), chưa cho phép tiền tố `adhoc-run-...`. Khi test runner gửi ID `adhoc-run-...`, service ném lỗi `INVALID_RUN_ID` và kích hoạt rollback.

## Requirements

1. **Phía Backend & Database Repository**:
   - Mở rộng `ResultFilterSchema` trong `server/schemas/index.ts` để hỗ trợ `runType: z.enum(['SUITE', 'SINGLE']).optional()`.
   - Cập nhật `TestCaseReadRepository.getTestCaseResults` trong `database/repositories/TestCaseReadRepository.ts`:
     - Nếu `filters?.runType === 'SINGLE'`: Thêm điều kiện `AND r.run_id LIKE 'adhoc-%'`.
     - Nếu `filters?.runType === 'SUITE'` (hoặc mặc định): Thêm điều kiện `AND r.run_id NOT LIKE 'adhoc-%'`.
2. **Phía Lưu Trữ Chứng Cứ (EvidenceArchiveService)**:
   - Cập nhật `SAFE_RUN_ID` trong `services/evidence/EvidenceArchiveService.ts` để cho phép định dạng `adhoc-run-\d+-[a-zA-Z0-9_-]+`.
   - Bổ sung unit test kiểm tra chấp nhận adhoc run ID an toàn trong `EvidenceArchiveService.spec.ts`.
3. **Phía Client API (`public/js/api.js`)**:
   - Cập nhật `api.getTestCaseResults(testCaseId, page, pageSize, filters = {}, options)` để serialize `runType` và `status` vào query params.
4. **Phía Giao Diện Chi Tiết Test Case (`public/js/views/TestCaseDetailsView.js`)**:
   - Thêm state `this.runType = 'SUITE'`.
   - Hiển thị thanh chuyển 2 Tab trực quan ngay phía trên bảng lịch sử thực thi:
     - `🏢 Chạy Theo Nhóm (Suite Runs)`
     - `⚡ Chạy Riêng Lẻ (Single Runs)`
   - Khi click chuyển tab: đổi `this.runType`, reset `this.page = 1`, gọi `fetchResultsOnly()` để tải lại dữ liệu đúng nhóm.
   - Thêm nút ▶️ "Chạy Test Case Này" ngay tại tiêu đề trang chi tiết (nếu test case có `automation_status === 'AUTOMATED'`), cho phép người dùng kích hoạt chạy thử nghiệm ngay và thấy kết quả tức thì trong tab "Chạy Riêng Lẻ".

## Acceptance Criteria

- [Derived-1] Trang Chi Tiết Test Case có thanh chuyển đổi gồm đúng 2 tab: "Chạy Theo Nhóm" và "Chạy Riêng Lẻ", không có tab "Tất cả".
- [Derived-2] Tab mặc định là "Chạy Theo Nhóm", hiển thị kết quả thực thi từ các bộ test suite (`run_id NOT LIKE 'adhoc-%'`).
- [Derived-3] Khi bấm sang tab "Chạy Riêng Lẻ", hiển thị các kết quả chạy đơn lẻ (`run_id LIKE 'adhoc-%'`).
- [Derived-4] Nút Play / Run trên web thực thi thành công test case (không còn lỗi `Evidence archive failed (INVALID_RUN_ID)`) và tự động lưu kết quả vào database.
- [Derived-5] Backend endpoint `GET /api/test-cases/:testCaseId/results?runType=...` phản hồi HTTP 200 và lọc chính xác theo `runType`.
- [Derived-6] Toàn bộ mã nguồn vượt qua kiểm tra tĩnh `npm run typecheck` và `npm run lint`.

## Verified Findings

- `EvidenceArchiveService.ts` dòng 39 chỉ khớp `/^(?:BUSINESS-)?RUN-\d{14}-[a-f0-9]{4}$/u`. Bằng việc mở rộng regex thành `/^(?:(?:BUSINESS-)?RUN-\d{14}-[a-f0-9]{4}|adhoc-run-\d+-[a-zA-Z0-9_-]+)$/u`, thư mục chứng cứ staging được tạo an toàn và hợp lệ.
- Thực thi thử nghiệm `TC-APT-CANCEL-003` thành công (`status: PASSED`), kết quả được ghi nhận vào `test_runs` và `test_results` với mã `adhoc-run-1792825366415-0d6ecb73`.

## Confirmed Decisions

- Giữ nguyên cấu trúc 2 tab chuẩn ("Chạy Theo Nhóm" và "Chạy Riêng Lẻ"), nhất quán trên toàn bộ hệ thống (`RunsView` và `TestCaseDetailsView`).
- Cho phép định dạng an toàn `adhoc-run-\d+-[a-zA-Z0-9_-]+` trong `EvidenceArchiveService.ts`.

## Constraints

- Tuân thủ kiến trúc phân tầng 4 lớp.
- Không phá vỡ tương thích với các lệnh gọi `getTestCaseResults` hiện hữu.
- Không thay đổi schema database SQLite.

## Out of Scope

- Tự động tạo dữ liệu chạy giả lập cho `adhoc-run-...`.
- Thay đổi cấu trúc bảng `test_results` hay `test_cases`.

## Proposed Implementation

1. **`services/evidence/EvidenceArchiveService.ts`**: Cập nhật regex `SAFE_RUN_ID` hỗ trợ `adhoc-run-...`.
2. **`server/schemas/index.ts`**: Thêm `runType: z.enum(['SUITE', 'SINGLE']).optional()` vào `ResultFilterSchema`.
3. **`database/repositories/TestCaseReadRepository.ts`**: Cập nhật `getTestCaseResults` áp dụng điều kiện `r.run_id LIKE 'adhoc-%'` nếu `filters?.runType === 'SINGLE'`, ngược lại dùng `NOT LIKE 'adhoc-%'`.
4. **`public/js/api.js`**: Cập nhật `getTestCaseResults` hỗ trợ object filter hoặc string filter.
5. **`public/js/views/TestCaseDetailsView.js`**:
   - Thêm `this.runType = 'SUITE'`.
   - Render 2 tab chuyển đổi phía trên bảng lịch sử kết quả.
   - Bắt sự kiện chuyển tab và gọi `fetchResultsOnly()`.
   - Thêm nút Chạy Play trực tiếp trên header trang chi tiết.

## Expected File Changes

- `services/evidence/EvidenceArchiveService.ts`
- `tests/unit/services/evidence/EvidenceArchiveService.spec.ts`
- `server/schemas/index.ts`
- `database/repositories/TestCaseReadRepository.ts`
- `public/js/api.js`
- `public/js/views/TestCaseDetailsView.js`

## Open Questions

None.

## Risks and Conflicts

None.

## Impact Analysis

- Trải nghiệm người dùng trở nên liền mạch và các lần chạy đơn lẻ từ nút Play chạy ổn định, lưu trữ đầy đủ chứng cứ (evidence) và hiển thị chính xác trong giao diện.

## Verification Plan

- Chạy `node scripts/validate_discussion.js docs/tasks/BDS-254-test-case-detail-separate-run-tabs.md --phase completion --update-metadata`.
- Chạy `npm run typecheck` và `npm run lint`.
- Chạy toàn bộ unit tests của `EvidenceArchiveService`.
- Kích hoạt chạy thực tế `TC-APT-CANCEL-003` và xác nhận kết quả ghi vào DB thành công.

## Verification Results

- `npm run typecheck`: Passed with 0 errors.
- `npx eslint services/evidence/EvidenceArchiveService.ts tests/unit/services/evidence/EvidenceArchiveService.spec.ts`: Passed with 0 errors.
- `npx playwright test tests/unit/services/evidence/EvidenceArchiveService.spec.ts`: Passed (13/13 passed, 1.6s).
- Run Execution Verification: Kích hoạt chạy `TC-APT-CANCEL-003` thành công:
  - Response: `{ success: true, testCaseId: "TC-APT-CANCEL-003", runId: "adhoc-run-1792825366415-0d6ecb73", status: "PASSED", durationMs: 5887 }`.
  - Cơ sở dữ liệu SQLite đã lưu bản ghi `adhoc-run-...` vào `test_runs` và `test_results`.
  - Endpoint `GET /api/runs?runType=SINGLE` trả về 1 đợt chạy.
  - Endpoint `GET /api/test-cases/TC-APT-CANCEL-003/results?runType=SINGLE` trả về 6 lượt chạy đơn lẻ.

## Change Reconciliation

- `services/evidence/EvidenceArchiveService.ts`: Cập nhật regex `SAFE_RUN_ID` cho phép định dạng `adhoc-run-...`.
- `tests/unit/services/evidence/EvidenceArchiveService.spec.ts`: Thêm unit test kiểm tra chấp nhận `adhoc-run-...`.
- `server/schemas/index.ts`: Added `runType: z.enum(['SUITE', 'SINGLE']).optional()` to `ResultFilterSchema`.
- `database/repositories/TestCaseReadRepository.ts`: Added `runType` filter (`SINGLE` -> `LIKE 'adhoc-%'`, `SUITE` -> `NOT LIKE 'adhoc-%'`).
- `public/js/api.js`: Extended `api.getTestCaseResults` to serialize `runType` and filter properties.
- `public/js/views/TestCaseDetailsView.js`: Added `this.runType = 'SUITE'` state, rendered segmented 2-tab control, added tab switching logic, updated empty states, and added "Chạy Test Case Này" play button.
