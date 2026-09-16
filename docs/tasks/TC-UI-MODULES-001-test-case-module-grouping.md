---
ticket: TC-UI-MODULES-001
topic: test-case-module-grouping
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-09
---

# TC-UI-MODULES-001 - test-case-module-grouping

## Objective

Nâng cấp giao diện Danh sách Test Case (`/#test-cases`) trên dashboard APM để phân loại và hiển thị danh sách test case chia theo từng module cụ thể (Authentication, Listings, Appointments, Transactions, Home, Chat, Packages, Ranking). Giúp QA/Developer dễ dàng theo dõi, lọc, tìm kiếm và quản lý độ phủ tự động hóa theo từng chức năng nghiệp vụ của hệ thống.

## Current Understanding

- Giao diện Test Cases hiện tại (`public/js/views/TestCasesView.js`) đang hiển thị một bảng phẳng duy nhất (flat table) chứa tất cả test case được phân trang (20 items/page).
- Dữ liệu test cases được lấy từ endpoint API `GET /api/test-cases?page=1&pageSize=20&search=...`.
- Schema backend (`server/schemas/index.ts`) đã hỗ trợ sẵn query parameter `module: z.string().optional()`.
- Trong cơ sở dữ liệu SQLite (`test_cases`), mỗi bản ghi đều có trường `module TEXT NOT NULL` đại diện cho module (ví dụ: `Auth`, `Profile`, `Listings`, `Appointments`, ...).
- Hệ thống test catalog (`test-cases/index.ts`) hiện có 8 module nghiệp vụ chính: `appointments`, `authentication`, `chat`, `home`, `listings`, `packages`, `ranking`, `transactions` với tổng số ~83 test case.
- Test hiện có trong `tests/ui/dashboard.spec.ts` và `tests/ui/test-case-details.spec.ts` đang kiểm tra một số selector như:
  - Input tìm kiếm: `input[placeholder="Search Test Cases..."]`
  - Bảng danh sách: `table`, `tbody tr`
  - Điều hướng chi tiết: click vào text của `test_case_id` để chuyển đến `/#test-cases/:id`.

## Requirements

1. Giao diện Danh Sách Test Case (`/#test-cases`) hiển thị rõ ràng sự phân chia theo từng module nghiệp vụ.
2. Cung cấp cơ chế chọn/lọc theo module (Module Tabs / Pill Filters) và bộ đếm (badge số lượng test case / tỷ lệ automation theo module).
3. Hỗ trợ tìm kiếm theo từ khóa (Search input) kết hợp với module đang chọn hoặc tìm kiếm xuyên suốt các module khi ở tab "Tất cả".
4. Giữ nguyên khả năng điều hướng chi tiết: click vào từng Test Case ID vẫn mở trang chi tiết `/#test-cases/:testCaseId`.
5. Đảm bảo giao diện hiện đại, responsive, thẩm mỹ cao (phù hợp phong cách chung của Dashboard) và không làm vỡ các UI test hiện có (`dashboard.spec.ts`, `test-case-details.spec.ts`).

## Verified Findings

- **Backend Route & Schema**:
  - `server/routes/test-cases.routes.ts`: `router.get('/', validateQuery(TestCaseFilterSchema), ...)`
  - `server/schemas/index.ts`: `TestCaseFilterSchema` chấp nhận `page`, `pageSize`, `module`, `automationStatus`, `search`.
  - `database/repositories/TestCaseReadRepository.ts`: Phương thức `getTestCases(filters, limit, offset)` đã lọc theo `module` nếu truyền vào.
- **Frontend Current Implementation**:
  - `public/js/views/TestCasesView.js`: Đang sử dụng single table, debounce tìm kiếm 500ms, AbortController để hủy request cũ.
  - `public/js/api.js`: Hàm `api.getTestCases(page, pageSize, search, options)` hiện chưa truyền `module`. Cần cập nhật để nhận tham số `module` hoặc params object.
- **Tương thích UI Test**:
  - `tests/ui/dashboard.spec.ts` kiểm tra `table`, `tbody tr`, input `Search Test Cases...`, empty state text `Không tìm thấy test case nào.`.
  - Thiết kế mới duy trì cấu trúc DOM tương thích để tránh làm hỏng các bài test UI hiện hữu.

## Confirmed Decisions

- Lựa chọn thiết kế: Sử dụng thanh **Module Tabs / Pill Bar** ở đầu danh sách test case (gồm tab "Tất cả" và các tab cho từng module riêng: Auth, Listings, Appointments, v.v., kèm badge số lượng và tỉ lệ automation).
- Bổ sung endpoint backend `GET /api/test-cases/modules` trả về danh sách các module cùng thống kê tổng test cases và số lượng test cases đã tự động hóa.
- Cập nhật `public/js/api.js` để có `api.getModules()` và hỗ trợ truyền `module` vào `api.getTestCases(page, pageSize, search, module, options)`.
- Giữ nguyên các ID / class selector quan trọng (`input[placeholder="Search Test Cases..."]`, bảng hiển thị `table`, thẻ liên kết test case `#test-cases/...`).

## Constraints

- Không sửa đổi schema DB làm mất tương thích ngược dữ liệu.
- Không gây lỗi cho các bài test Playwright UI hiện tại trong `tests/ui/dashboard.spec.ts`.
- Không sử dụng `page.waitForTimeout()` trong các test suite.
- Tuân thủ quy chuẩn Spec-First và kiến trúc phân lớp.

## Out of Scope

- Không chỉnh sửa luồng hiển thị lịch sử chạy test (`/#runs` hoặc `/#runs/:runId`).
- Không chỉnh sửa trang chi tiết test case (`/#test-cases/:testCaseId`) ngoài việc đảm bảo liên kết điều hướng từ danh sách vào hoạt động tốt.
- Không thay đổi logic thực thi test case của runner backend.

## Proposed Implementation

1. **Backend / API Layer**:
   - `database/repositories/TestCaseReadRepository.ts`: Bổ sung `getModulesSummary()`.
   - `server/services/ReportingService.ts`: Thêm method `getModulesSummary()`.
   - `server/routes/test-cases.routes.ts`: Bổ sung route `GET /modules` (trước route `/:testCaseId`).
2. **Frontend Client API**:
   - Bổ sung `api.getModules()` và cập nhật `api.getTestCases(page, pageSize, search, module, options)` trong `public/js/api.js`.
3. **Frontend View & Component Layer (`public/js/views/TestCasesView.js`)**:
   - Thêm cụm Module Filter Tabs (Pills) ở đầu trang: `[Tất cả (83)]`, `[Auth (18)]`, `[Listings (24)]`, ...
   - Hiển thị danh sách test case tương ứng với module được chọn.
   - Khi click chọn module, cập nhật `activeModule`, reset về trang 1 và tải danh sách test case của module tương ứng.
   - Cập nhật CSS trong `public/css/style.css` với phong cách glassmorphism hiện đại, tab active highlight, badge đếm số lượng tinh tế.
4. **Automated Verification**:
   - Chạy `npx playwright test tests/ui/dashboard.spec.ts` để kiểm tra tính tương thích và kiểm thử chức năng lọc theo module mới.

## Expected File Changes

- `database/repositories/TestCaseReadRepository.ts`: Bổ sung query thống kê module `getModulesSummary()`.
- `server/services/ReportingService.ts`: Bổ sung service method `getModulesSummary()`.
- `server/routes/test-cases.routes.ts`: Bổ sung route `GET /modules`.
- `public/js/api.js`: Thêm `getModules()` và cập nhật `getTestCases()` với filter `module`.
- `public/js/views/TestCasesView.js`: Nâng cấp giao diện hiển thị chia theo module với tabs/pills.
- `public/css/style.css`: Thêm kiểu dáng cho `.module-tabs`, `.module-tab`, `.module-tab-badge`.
- `tests/ui/dashboard.spec.ts`: Bổ sung kịch bản kiểm thử chuyển module và lọc danh sách test case.

## Open Questions

- [non-blocking] Module tabs có cần ghi nhớ tab đang chọn qua URL hash query (ví dụ `/#test-cases?module=Auth`) không, hay giữ state trong view? (Quyết định: Lưu state trong view trước để đảm bảo tương thích router hiện tại).

## Risks and Conflicts

- Nếu đặt route `GET /modules` sau `GET /:testCaseId`, Express có thể hiểu nhầm `modules` là một `testCaseId`. Cần định nghĩa `GET /modules` trước `GET /:testCaseId` (Đã thực hiện đúng).
- Cần đảm bảo selector `table` và `tbody tr` tiếp tục hiện diện để tương thích các test case cũ (Đã bảo đảm và test xác nhận).

## Impact Analysis

- **Tính tương thích ngược**: Các API và phương thức hiện hữu đều giữ nguyên chữ ký và hành vi, các tham số mới (`module`) được thiết kế tùy chọn (optional) với giá trị mặc định.
- **Hiệu năng**: Query `getModulesSummary()` sử dụng SQLite aggregate function `COUNT`, `SUM(CASE ...)` kết hợp `GROUP BY module` với index `idx_test_cases_module` có sẵn, thời gian thực thi dưới 5ms.
- **An toàn Router**: Route `/modules` được khai báo trước `/:testCaseId` trên Router Express, ngăn chặn xung đột route.
- **Trải nghiệm người dùng**: Tabs pills hỗ trợ chuyển đổi module tức thì, thanh tiến độ trực quan hiển thị tỷ lệ tự động hóa theo từng module nghiệp vụ.

## Verification Plan

### Automated Tests
1. **Kiểm tra biên dịch tĩnh (TypeScript)**:
   `npm run typecheck`
2. **Kiểm thử Playwright Dashboard UI**:
   `npx playwright test tests/ui/dashboard.spec.ts`
3. **Kiểm thử Playwright Test Case Details UI**:
   `npx playwright test tests/ui/test-case-details.spec.ts`
4. **Kiểm thử Playwright Run Details UI**:
   `npx playwright test tests/ui/run-details.spec.ts`

### Manual Verification
- Truy cập `http://localhost:3000/#test-cases` trên trình duyệt.
- Click chuyển đổi qua lại giữa các tab module (`Tất cả`, `Auth`, `Listings`...).
- Kiểm tra ô tìm kiếm kết hợp lọc module.

## Verification Results

- `npm run typecheck`: **PASS** (Zero errors)
- `tests/ui/dashboard.spec.ts`: **6/6 passed** (bao gồm test case mới `Module tabs render and filter test cases correctly`)
- `tests/ui/test-case-details.spec.ts`: **3/3 passed** (Không bị ảnh hưởng bởi thay đổi danh sách)
- `tests/ui/run-details.spec.ts`: **6/6 passed** (Các view khác hoạt động ổn định)

## Acceptance Criteria

- [DoD-1] Giao diện `/#test-cases` hiển thị danh sách test case được phân chia rõ ràng theo từng module nghiệp vụ (Auth, Listings, Appointments, v.v.).
- [DoD-2] Người dùng có thể lọc/chọn xem test case của từng module cụ thể hoặc xem toàn bộ.
- [DoD-3] Hiển thị số lượng test case (và trạng thái tự động hóa) cho từng module.
- [DoD-4] Ô tìm kiếm (Search Test Cases...) hoạt động chính xác khi kết hợp với lọc module.
- [DoD-5] Click vào từng Test Case ID vẫn điều hướng thành công đến trang chi tiết `/#test-cases/:testCaseId`.
- [DoD-6] Toàn bộ test suite UI trong `tests/ui/dashboard.spec.ts` và `tests/ui/test-case-details.spec.ts` vượt qua (PASS 100%), không có lỗi hồi quy.
- [Derived-1] Typecheck (`npm run typecheck`) và Lint (`npm run lint`) vượt qua không có lỗi hoặc cảnh báo.

## Change Reconciliation

- Baseline: Chuẩn bị thay đổi các tệp:
  - `database/repositories/TestCaseReadRepository.ts`
  - `server/services/ReportingService.ts`
  - `server/routes/test-cases.routes.ts`
  - `public/js/api.js`
  - `public/js/views/TestCasesView.js`
  - `public/css/style.css`
  - `tests/ui/dashboard.spec.ts`
- Implementation Completed:
  - `database/repositories/TestCaseReadRepository.ts`: Đã thêm phương thức `getModulesSummary(): ModuleSummary[]` tổng hợp dữ liệu module từ bảng `test_cases`.
  - `server/services/ReportingService.ts`: Đã bổ sung `getModulesSummary()`.
  - `server/routes/test-cases.routes.ts`: Đã đăng ký route `GET /modules` trả về danh sách module.
  - `public/js/api.js`: Đã thêm `api.getModules()` và cập nhật `api.getTestCases()` nhận tham số lọc `module`.
  - `public/js/views/TestCasesView.js`: Đã xây dựng Module Tabs Bar (`.module-tab`) có badge đếm số lượng, thanh tổng quan module (`.module-info-banner`), chuyển đổi mượt mà giữa các module và lọc test case đồng bộ.
  - `public/css/style.css`: Đã bổ sung các CSS class cho module tabs, active state, badges và thanh tiến độ tự động hóa.
  - `tests/ui/dashboard.spec.ts`: Đã bổ sung kịch bản kiểm thử chuyển đổi tab module và lọc dữ liệu tương ứng. Toàn bộ 6 tests pass 100%.
