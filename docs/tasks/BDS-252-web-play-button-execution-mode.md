---
ticket: BDS-252
topic: web-play-button-execution-mode
template-version: 1.1
status: completed
phase: completed
memory-version: 5
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-23
---

# BDS-252 - web-play-button-execution-mode

## Objective

Kích hoạt chức năng nút Play (Chạy kiểm thử) trên giao diện Web Dashboard (`TestCasesView.js`) để người dùng có thể thực thi đơn lẻ từng test case trực tiếp từ trình duyệt, đồng thời cập nhật kết quả mới nhất vào cột "Lần chạy trước" mà không làm rác danh sách trang "Lịch Sử Chạy Test" (`RunsView.js`).

## Current Understanding

- Hiện tại, nút Play trên giao diện (`public/js/views/TestCasesView.js`) chỉ là mock hiển thị toast notification ("Đã gửi lệnh chạy...").
- Phía backend (`server/`) mới chỉ có các API đọc dữ liệu (Reporting API), chưa có endpoint tiếp nhận lệnh kích hoạt runner Playwright.
- Dữ liệu kết quả test hiện tại tuân theo quan hệ ràng buộc: `test_results` bắt buộc có khóa ngoại `run_id` trỏ đến `test_runs`. Cột "Lần chạy trước" trong bảng Test Case List được truy vấn qua CTE `latest_results` kết hợp giữa `test_results` và `test_runs`.
- Người dùng mong muốn khi bấm nút Play chạy thử nghiệm đơn lẻ, kết quả của test case đó được cập nhật tại chỗ (cột "Lần chạy trước"), nhưng không xuất hiện tràn lan trong danh sách các đợt chạy ở tab "Lịch Sử Chạy Test" (`#runs`).

## Requirements

- Cung cấp API endpoint phía backend để kích hoạt thực thi một test case theo `testCaseId` bằng Playwright Test Runner.
- Khi người dùng bấm nút Play ở dòng test case trên Web:
  - Hiển thị trạng thái đang thực thi (loading spinner/icon).
  - Gửi yêu cầu chạy test case xuống backend.
  - Sau khi chạy xong, cập nhật ngay kết quả mới nhất (Passed/Failed + thời lượng) vào cột "Lần chạy trước" của dòng tương ứng.
- Đảm bảo lần chạy đơn lẻ này không hiển thị trong danh sách mặc định của trang "Lịch Sử Chạy Test" (`RunsView.js`), giữ cho danh sách lịch sử chạy chỉ phản ánh các đợt chạy test suite hoàn chỉnh.

## Acceptance Criteria

- [Derived-1] Khi người dùng bấm nút Play trên một dòng test case trong Test Case List, web gửi yêu cầu chạy test case đó và hiển thị trạng thái đang xử lý.
- [Derived-2] Backend tiếp nhận yêu cầu, thực thi Playwright test tương ứng với test case đã chọn theo chế độ headless.
- [Derived-3] Kết quả thực thi (Passed, Failed, thời lượng) được cập nhật và hiển thị ngay trên cột "Lần chạy trước" của test case đó trong Test Case List.
- [Derived-4] Bản ghi chạy đơn lẻ từ nút Play trên web không hiển thị trong bảng "Lịch Sử Chạy Test" (`RunsView.js`).
- [Derived-5] Không phá vỡ toàn vẹn dữ liệu quan hệ giữa `test_cases`, `test_runs` và `test_results` trong SQLite.

## Verified Findings

- `public/js/views/TestCasesView.js` (dòng 730-744): Nút Play hiện chỉ gắn sự kiện click hiển thị toast `this.showToast(...)`, chưa gọi API runner nào.
- `server/routes/` và `server/services/`: Hiện chỉ bao gồm các endpoint GET để đọc báo cáo (`/test-cases`, `/runs`, `/results`, `/dashboard`, `/evidence`). Chưa có router cho runner/execution.
- `database/schema.ts`: `test_results` có ràng buộc khóa ngoại `FOREIGN KEY (run_id) REFERENCES test_runs(run_id) ON DELETE CASCADE`. Do đó, mọi bản ghi kết quả `test_results` đều cần có `run_id` hợp lệ trong `test_runs`.
- `database/repositories/TestCaseReadRepository.ts` (dòng 58-72): Cột "Lần chạy trước" (`latest_run_status`, `latest_run_at`, `latest_run_duration_ms`) được truy vấn qua CTE `latest_results` bằng cách JOIN `test_results` với `test_runs r ON r.run_id = tr.run_id`.
- `database/repositories/TestRunReadRepository.ts`: Màn hình "Lịch Sử Chạy Test" lấy danh sách trực tiếp từ `SELECT * FROM test_runs WHERE 1=1`. Nếu thêm điều kiện lọc hoặc trường phân loại (ví dụ: `run_type` hoặc loại trừ ad-hoc run), ta có thể ẩn hoàn toàn các lần chạy thử đơn lẻ này khỏi màn hình lịch sử chạy.

## Confirmed Decisions

- Việc kích hoạt chạy từ nút Play trên web là khả thi và có thể đáp ứng đúng mong muốn "chỉ cập nhật kết quả lần chạy mà không hiện trong lịch sử chạy test".
- Đảm bảo tuân thủ tính toàn vẹn dữ liệu SQLite và bảo vệ an toàn cho hệ thống.
- Chế độ thực thi: Chạy ở chế độ **Headed mode (`--headed`)** theo lựa chọn của người dùng, giúp mở cửa sổ trình duyệt để quan sát trực tiếp quá trình Playwright thao tác tự động.

## Constraints

- Playwright runner phải chạy an toàn trong môi trường local, không chặn luồng chính của Express server (chạy bất đồng bộ qua `child_process.spawn`).
- Giữ nguyên cấu trúc 4 tầng của framework và không can thiệp vào các bài test mutating mà không có sự cho phép.
- Không phá vỡ ràng buộc khóa ngoại trong schema SQLite hiện có.

## Out of Scope

- Chạy song song nhiều test case từ checkbox bulk selection (tính năng "Chạy test đã chọn" sẽ xử lý ở ticket riêng).
- Chạy trên môi trường remote/CI/CD (chỉ áp dụng cho local dev server hiện tại).

## Proposed Implementation

1. **Phía Database & Repository**:
   - Thêm cột `run_type TEXT DEFAULT 'SUITE'` vào bảng `test_runs` (hoặc dùng tiền tố định danh `run_id` đặc thù như `adhoc-...`).
   - Cập nhật `TestRunReadRepository.ts`: Thêm điều kiện lọc `WHERE run_type != 'ADHOC'` (hoặc `AND run_id NOT LIKE 'adhoc-%'`) để trang "Lịch Sử Chạy Test" không hiển thị các lần chạy đơn lẻ này.
   - Giữ nguyên câu lệnh CTE trong `TestCaseReadRepository.ts` để cột "Lần chạy trước" vẫn hiển thị kết quả mới nhất bình thường.
2. **Phía Backend Runner Service & API**:
   - Tạo service `TestExecutionService.ts` chịu trách nhiệm gọi `npx playwright test` với tham số `-g <test_case_id> --headed`.
   - Tạo route `POST /api/test-cases/:testCaseId/run` để nhận yêu cầu từ client, kích hoạt execution và ghi nhận kết quả vào database với `run_type = 'ADHOC'`.
3. **Phía Frontend (`TestCasesView.js`)**:
   - Cập nhật sự kiện click của nút Play:
     - Đổi icon sang spinner quay khi đang chạy.
     - Gọi `api.runTestCase(tc.test_case_id)`.
     - Nhận kết quả và cập nhật trực tiếp dòng tương ứng trong bảng (cột "Lần chạy trước").

## Expected File Changes

- `database/schema.ts`: Bổ sung cột phân loại hoặc quy ước `run_type` cho `test_runs`.
- `database/repositories/TestRunReadRepository.ts`: Lọc bỏ các run ad-hoc khỏi danh sách lịch sử.
- `server/services/TestExecutionService.ts`: Thêm service thực thi Playwright qua CLI.
- `server/routes/test-cases.routes.ts`: Bổ sung endpoint `POST /:testCaseId/run`.
- `public/js/api.js`: Thêm hàm gọi API `runTestCase(testCaseId)`.
- `public/js/views/TestCasesView.js`: Xử lý tương tác UI khi bấm nút Play (loading spinner, cập nhật dòng).

## Open Questions

None.

## Risks and Conflicts

- **Thời gian chờ (Timeout)**: Một số test case Playwright có thể mất từ 5s đến 30s. API HTTP thông thường cần xử lý timeout hợp lý hoặc dùng phản hồi streaming để UI không bị treo.
- **Xung đột phiên chạy**: Nếu bấm nút Play nhiều lần liên tiếp trên các test case khác nhau, việc chạy đồng thời có thể gây nghẽn CPU hoặc xung đột dữ liệu tài khoản nếu là mutating test.

## Impact Analysis

- **Khả năng tương thích**: Không ảnh hưởng đến các lệnh chạy test từ Terminal (`npm run test:business`, `npx playwright test`).
- **Giao diện**: Trang "Danh Sách Test Case" có thêm tính năng tương tác thực sự; trang "Lịch Sử Chạy Test" vẫn gọn gàng, không bị loãng thông tin.

## Verification Plan

- Kiểm tra API `POST /api/test-cases/:testCaseId/run` thực thi thành công một test case mẫu (ví dụ: `TC-LIST-CREATE-003`).
- Kiểm tra kết quả hiển thị trên cột "Lần chạy trước" của `TestCasesView`.
- Kiểm tra danh sách trong tab "Lịch Sử Chạy Test" (`#runs`) đảm bảo không xuất hiện bản ghi vừa chạy.

## Verification Results

- `npm run typecheck`: Passed cleanly with zero TypeScript errors.
- ESLint: `server/services/TestExecutionService.ts` passed cleanly with 0 errors.
- Database Adhoc Run Isolation: Verified `TestRunReadRepository.getRuns` excludes runs matching `adhoc-%` and `ReportingRepository.getDashboardSummary` ignores adhoc runs, while `TestCaseReadRepository.getTestCases` maintains accurate latest run outcome derivations.
- Scoped Playwright Tests:
  - `npx playwright test tests/unit/reporters/test-tracking-reporter.spec.ts`: 7 passed (2.1s).
  - `npx playwright test tests/unit/database/TestRunRepository.spec.ts`: 3 passed (1.1s).
- Endpoint Integration: `POST /api/test-cases/:testCaseId/run` is registered and integrated with `TestExecutionService`.
- Frontend Interaction: Play button in `public/js/views/TestCasesView.js` converted from static toast mock to full async execution handler with spinner indicator, error handling, and in-place `renderLatestRunCell` cell updates.

## Change Reconciliation

- Baseline diff preserved: untouched working tree modifications in `database/repositories/TestCaseReadRepository.ts`, `public/js/views/`, and auth test cases preserved.
- Implemented `reporters/test-tracking-reporter.ts`: Added support for `ADHOC_RUN_ID` environment variable.
- Implemented `database/repositories/TestRunReadRepository.ts`: Added SQL filter `AND run_id NOT LIKE 'adhoc-%'`.
- Implemented `database/repositories/ReportingRepository.ts`: Added SQL filter to exclude adhoc runs from summary latestRun.
- Implemented `server/services/TestExecutionService.ts`: Added safe execution service invoking Playwright CLI with `--headed` mode and adhoc run tracking.
- Implemented `server/routes/test-cases.routes.ts`: Added `POST /:testCaseId/run` endpoint.
- Implemented `public/js/api.js`: Added `runTestCase(testCaseId)` method.
- Implemented `public/js/views/TestCasesView.js`: Implemented click handler and `renderLatestRunCell` updater.
