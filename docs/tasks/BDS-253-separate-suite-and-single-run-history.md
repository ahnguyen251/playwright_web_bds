---
ticket: BDS-253
topic: separate-suite-and-single-run-history
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-23
---

# BDS-253 - separate-suite-and-single-run-history

## Objective

Phân tách độc lập lịch sử chạy test trên Web Dashboard (`RunsView.js`) thành đúng 2 danh mục riêng biệt: "Chạy Theo Nhóm" (Suite Runs) và "Chạy Riêng Lẻ" (Single Runs), giúp người dùng dễ dàng theo dõi cả kết quả chạy bộ test tổng thể lẫn nhật ký chạy thử từng test case từ nút Run mà không bị lẫn lộn dữ liệu.

## Current Understanding

- Ở task BDS-252, các lần chạy đơn lẻ từ nút Run/Play trên web được gắn tiền tố `adhoc-run-...` và tạm thời bị ẩn hoàn toàn khỏi `RunsView.js` để tránh làm rác danh sách lịch sử.
- Người dùng mong muốn lưu lại đầy đủ cả 2 loại lịch sử nhưng phải tách biệt rạch ròi.
- Người dùng đã chỉ định rõ: Chỉ cần đúng 2 tab ("Chạy Theo Nhóm" và "Chạy Riêng Lẻ"), không cần tab "Tất cả".
- Phía backend hiện đang lọc cứng `run_id NOT LIKE 'adhoc-%'` trong `TestRunReadRepository.ts`.

## Requirements

- Giao diện "Lịch Sử Chạy Test" (`public/js/views/RunsView.js`):
  - Hiển thị thanh chuyển Tab gồm đúng 2 chế độ:
    1. **Chạy Theo Nhóm** (mặc định): Chứa các đợt chạy Test Suite, chạy terminal, CI/CD (`run_id NOT LIKE 'adhoc-%'`).
    2. **Chạy Riêng Lẻ**: Chứa các phiên chạy test case đơn lẻ được kích hoạt từ nút Play/Run trên web (`run_id LIKE 'adhoc-%'`).
  - Không hiển thị tab "Tất cả".
  - Các chỉ số KPI (Tổng lần chạy, Tỷ lệ Pass, Thời lượng TB) và phân trang tự động cập nhật tương ứng theo tab đang chọn.
- Phía Backend & API:
  - Cập nhật `RunFilterSchema` trong `server/schemas/index.ts` để hỗ trợ tham số `runType` thuộc `['SUITE', 'SINGLE']` (mặc định là `SUITE`).
  - Cập nhật `TestRunReadRepository.ts`:
    - Khi `runType === 'SINGLE'`: Truy vấn `WHERE run_id LIKE 'adhoc-%'`.
    - Khi `runType === 'SUITE'`: Truy vấn `WHERE run_id NOT LIKE 'adhoc-%'`.
  - Cập nhật `public/js/api.js`: Hàm `getRuns(page, pageSize, filters)` truyền tham số `runType`.

## Acceptance Criteria

- [Derived-1] Giao diện Lịch Sử Chạy Test có thanh chuyển đổi gồm 2 tab rõ ràng: "Chạy Theo Nhóm" và "Chạy Riêng Lẻ", không có tab "Tất cả".
- [Derived-2] Tab mặc định khi truy cập là "Chạy Theo Nhóm", hiển thị danh sách các đợt chạy test suite (`run_id NOT LIKE 'adhoc-%'`).
- [Derived-3] Khi chuyển sang tab "Chạy Riêng Lẻ", bảng dữ liệu hiển thị các lần chạy đơn lẻ kích hoạt từ nút Run/Play (`run_id LIKE 'adhoc-%'`).
- [Derived-4] Số liệu KPI (Tổng lần chạy, Tỷ lệ Pass, v.v.) và bộ lọc tìm kiếm / trạng thái hoạt động chính xác theo ngữ cảnh của từng tab.
- [Derived-5] Backend API `GET /api/runs` lọc chính xác theo tham số `runType` (`SUITE` hoặc `SINGLE`) và phản hồi với mã HTTP 200.

## Verified Findings

- `database/repositories/TestRunReadRepository.ts` hiện có câu lệnh SQL cố định: `SELECT * FROM test_runs WHERE 1=1 AND run_id NOT LIKE 'adhoc-%'`. Khi thêm điều kiện `runType`, ta có thể chuyển đổi giữa `LIKE 'adhoc-%'` và `NOT LIKE 'adhoc-%'` một cách tự nhiên.
- `database/schema.ts` bảng `test_runs` lưu trữ đầy đủ `run_id`, `created_at`, `duration_ms`, `total_executions`, `passed_executions`, `failed_executions`. Cả hai loại run đều có cấu trúc dữ liệu tương thích hoàn toàn.
- `public/js/views/RunsView.js` quản lý state trong component gồm `this.page`, `this.pageSize`, `this.searchTerm`, `this.statusFilter`. Bổ sung `this.runType = 'SUITE'` sẽ điều khiển trơn tru việc chuyển đổi giữa 2 tab.
- `public/js/api.js` hiện nhận `getRuns: (page = 1, pageSize = 20, options)` nhưng chưa hỗ trợ tham số lọc ngoài `page` và `pageSize`. Cần mở rộng nhận `filters = {}`.

## Confirmed Decisions

- Chỉ sử dụng 2 tab: "Chạy Theo Nhóm" (Suite Runs) và "Chạy Riêng Lẻ" (Single Runs).
- Không thêm tab "Tất cả" theo yêu cầu trực tiếp của người dùng.
- Mặc định mở tab "Chạy Theo Nhóm" khi người dùng truy cập trang Lịch Sử Chạy Test.

## Constraints

- Giữ nguyên toàn vẹn kiến trúc phân tầng của hệ thống.
- Giữ nguyên các bài test đã chạy và không làm ảnh hưởng đến dữ liệu hiện có trong SQLite `autotest.db`.
- Không tạo thêm rác hay phá vỡ các unit test hiện có của `TestRunRepository`.

## Out of Scope

- Xóa hay chỉnh sửa thủ công từng bản ghi lịch sử trong cơ sở dữ liệu.
- Thay đổi cấu trúc bảng `test_runs` trong database SQLite (vẫn dựa trên tiền tố `adhoc-run-...` để phân loại).

## Proposed Implementation

1. **Phía Backend API**:
   - Mở rộng `RunFilterSchema` trong `server/schemas/index.ts`: thêm `runType: z.enum(['SUITE', 'SINGLE']).optional()`.
   - Cập nhật `database/repositories/TestRunReadRepository.ts`: đọc `filters.runType` để áp dụng điều kiện `LIKE 'adhoc-%'` hoặc `NOT LIKE 'adhoc-%'`.
2. **Phía Frontend Client API (`public/js/api.js`)**:
   - Cập nhật `getRuns(page, pageSize, filters = {}, options = {})` để đóng gói `filters.runType`, `filters.status`, v.v. vào URL query params.
3. **Phía Giao Diện (`public/js/views/RunsView.js`)**:
   - Thêm thuộc tính `this.runType = 'SUITE'`.
   - Render Segmented Tab Bar gồm 2 nút tab trực quan ở vị trí trên thanh công cụ lọc.
   - Thêm sự kiện click chuyển tab: đổi `this.runType`, reset `this.page = 1`, gọi `fetchAndRender()`.
   - Cập nhật các thẻ KPI và bảng hiển thị tương ứng với dữ liệu của tab hiện hành.

## Expected File Changes

- `server/schemas/index.ts`: Bổ sung `runType` vào `RunFilterSchema`.
- `database/repositories/TestRunReadRepository.ts`: Hỗ trợ lọc theo `filters.runType`.
- `public/js/api.js`: Hỗ trợ truyền `filters` vào `api.getRuns`.
- `public/js/views/RunsView.js`: Bổ sung thanh chuyển tab 2 mục và cập nhật luồng fetch/render.

## Open Questions

None.

## Risks and Conflicts

- Xung đột khi URL params có phân trang: Khi chuyển đổi giữa 2 tab có số lượng mục chênh lệch lớn, cần đảm bảo luôn reset `page = 1` để tránh lỗi trang trống.

## Impact Analysis

- **Khả năng tương thích**: Các API client cũ không truyền `runType` sẽ mặc định nhận dữ liệu `SUITE`, đảm bảo 100% tương thích ngược.
- **Trải nghiệm người dùng**: Giúp người dùng phân biệt rõ ràng giữa các đợt kiểm thử tự động toàn diện và các lần chạy thử nghiệm đơn lẻ từ nút bấm.

## Verification Plan

- Chạy kiểm tra tĩnh `npm run typecheck` và `npm run lint`.
- Chạy unit tests: `tests/unit/database/TestRunRepository.spec.ts`.
- Kiểm tra trực quan trên trình duyệt:
  - Tab "Chạy Theo Nhóm" hiển thị các lần chạy suite (ví dụ: `RUN-20261023161523-360d`).
  - Tab "Chạy Riêng Lẻ" hiển thị các lần chạy test case riêng lẻ từ nút Play (`adhoc-run-...`).
  - Chuyển đổi qua lại giữa 2 tab mượt mà, phân trang và tìm kiếm hoạt động độc lập.

## Verification Results

- `npm run typecheck`: Passed with 0 TypeScript errors.
- ESLint: `server/schemas/index.ts` and `database/repositories/TestRunReadRepository.ts` passed with 0 errors.
- Unit Tests: `tests/unit/database/TestRunRepository.spec.ts` passed (3 tests passed, 1.1s).
- Query Verification: Confirmed SQLite partition logic cleanly filters 78 suite runs under `runType: 'SUITE'` (`run_id NOT LIKE 'adhoc-%'`) and adhoc single runs under `runType: 'SINGLE'` (`run_id LIKE 'adhoc-%'`).
- UI Rendering: Segmented 2-tab bar integrated into `public/js/views/RunsView.js` without a 3rd "Tất cả" tab, matching the user's explicit specification.

## Change Reconciliation

- `server/schemas/index.ts`: Added `runType: z.enum(['SUITE', 'SINGLE']).optional()` to `RunFilterSchema`.
- `database/repositories/TestRunReadRepository.ts`: Implemented dynamic SQL condition based on `filters.runType`.
- `public/js/api.js`: Updated `api.getRuns` to serialize filters object into query params.
- `public/js/views/RunsView.js`: Added `this.runType = 'SUITE'` state, rendered segmented 2-tab switcher, added tab click handling with automatic page reset, updated KPI titles/descriptions, and added trigger badges.
- `public/css/style.css`: Added styles for `.runs-mode-tabs-container`, `.runs-mode-tab`, and trigger badge classes.
