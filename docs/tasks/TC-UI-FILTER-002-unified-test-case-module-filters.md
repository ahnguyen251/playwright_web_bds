---
ticket: TC-UI-FILTER-002
topic: unified-test-case-module-filters
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-10-06
---

# TC-UI-FILTER-002 - unified-test-case-module-filters

## Objective

Đồng bộ hóa toàn bộ danh sách bộ lọc Mô-đun (Module Tabs/Pills) trên giao diện quản trị kiểm thử Playwright APM (`/#test-cases` và `/#summary`) khớp chuẩn xác với tài liệu [document/Propify_Playwright_TestCase_Unified.md](file:///d:/DATN/DATNver3/document/Propify_Playwright_TestCase_Unified.md), hợp nhất Module 01 thành 'Authentication' (16 test cases) và sắp xếp thứ tự module theo đúng cấu trúc nghiệp vụ từ Module 01 đến Module 08.

## Current Understanding

1. Tài liệu chuẩn [Propify_Playwright_TestCase_Unified.md](file:///d:/DATN/DATNver3/document/Propify_Playwright_TestCase_Unified.md) định nghĩa toàn bộ 83 test cases của hệ thống Client được chia thành các phân hệ nghiệp vụ:
   - Module 01 — AUTHENTICATION (AUTH): 16 test cases (8 Đăng ký, 5 Đăng nhập, 3 Quên mật khẩu).
   - Module 02 — PROFILE (HỒ SƠ TÀI KHOẢN): 9 test cases.
   - Module 03 — HOMEPAGE / TÌM KIẾM & BỘ LỌC TRANG CHỦ (HOME): 4 test cases.
   - Module 03.x — XẾP HẠNG & THỨ TỰ HIỂN THỊ TIN ĐĂNG (RANKING): 6 test cases.
   - Module 04 — LISTING / QUẢN LÝ TIN ĐĂNG (LIST): 31 test cases.
   - Module 05 — APPOINTMENT / QUẢN LÝ LỊCH HẸN (APT): 8 test cases.
   - Module 06 — LỊCH SỬ GIAO DỊCH (TRANS): 2 test cases.
   - Module 07 — NÂNG CẤP GÓI TIN & THANH TOÁN (PACKAGE): 5 test cases.
   - Module 08 — CHAT (NHẮN TIN TRỰC TUYẾN): 2 test cases.
2. Hiện tại, trong mã nguồn `test-cases/authentication/`:
   - `registration.test-cases.ts` đang gán `module: 'Authentication Registration'`.
   - `login.test-cases.ts` đang gán `module: 'Authentication Login'`.
   - `password-recovery.test-cases.ts` đang gán `module: 'Authentication Password Recovery'`.
   Điều này dẫn đến việc trong cơ sở dữ liệu SQLite (`test_cases`) và trên giao diện APM Dashboard hiển thị 3 tab module con rời rạc thay vì 1 module 'Authentication' thống nhất.
3. Thứ tự hiển thị các module pill trên giao diện hiện đang lấy từ truy vấn SQL `ORDER BY module ASC` trong `TestCaseReadRepository.getModulesSummary()`. Thứ tự theo bảng chữ cái tiếng Anh này làm đảo lộn cấu trúc tự nhiên Module 01 -> Module 08 của tài liệu.

## Requirements

1. Chuẩn hóa trường `module: 'Authentication'` cho toàn bộ 16 test cases trong:
   - `test-cases/authentication/registration.test-cases.ts` (8 test cases).
   - `test-cases/authentication/login.test-cases.ts` (5 test cases).
   - `test-cases/authentication/password-recovery.test-cases.ts` (3 test cases).
2. Đồng bộ lại dữ liệu vào database SQLite (`data/autotest.db`) qua script `scripts/sync-test-cases.ts` (`npm run db:sync`).
3. Cập nhật thứ tự sắp xếp trả về của danh sách module từ API/Repository sao cho danh sách tab module trên giao diện tuân theo thứ tự chuẩn xác của tài liệu markdown:
   `Authentication` (16) -> `Profile` (9) -> `Home` (4) -> `Ranking` (6) -> `Listings` (31) -> `Appointments` (8) -> `Transactions` (2) -> `Packages` (5) -> `Chat` (2).
4. Cập nhật `public/js/views/SummaryView.js` (`moduleMetaMap`) và `public/js/views/TestCasesView.js` (`moduleSub`) để hiển thị thông tin mô tả và màu sắc đồng bộ với 9 module chuẩn.
5. Bảo đảm tất cả các unit test và UI test hiện có (`dashboard.spec.ts`, `test-case-workbench.spec.ts`) tiếp tục vượt qua (PASS 100%).

## Acceptance Criteria

- [DoD-1] Toàn bộ 16 test cases thuộc Module 01 (Authentication) trong `test-cases/authentication/` có giá trị `module: 'Authentication'`.
- [DoD-2] Lệnh `npm run db:sync` thực thi thành công, cơ sở dữ liệu SQLite cập nhật chính xác 16 bản ghi sang module `Authentication` và không còn bản ghi nào thuộc `Authentication Registration`, `Authentication Login`, `Authentication Password Recovery`.
- [DoD-3] Endpoint API `GET /api/test-cases/modules` trả về danh sách 9 module theo đúng thứ tự logic chuẩn của tài liệu markdown: `Authentication`, `Profile`, `Home`, `Ranking`, `Listings`, `Appointments`, `Transactions`, `Packages`, `Chat`.
- [DoD-4] Giao diện Danh Sách Test Case (`/#test-cases`) hiển thị đúng 9 module pills kèm pill `Tất cả (83)` theo thứ tự chuẩn hóa; tab `Authentication` hiển thị badge `16`.
- [DoD-5] Lọc theo tab `Authentication` trả về đúng 16 test cases (bao gồm các test cases đăng ký, đăng nhập và khôi phục mật khẩu).
- [DoD-6] Giao diện Bảng Điều Khiển Tổng Quan (`/#summary`) ánh xạ nhãn và màu sắc chính xác cho `Authentication` và 8 module còn lại.
- [DoD-7] Kiểm tra kiểm thử tĩnh (`npm run typecheck` và `npm run lint`) cùng test suite UI liên quan (`tests/ui/dashboard.spec.ts`, `tests/ui/test-case-workbench.spec.ts`) vượt qua thành công không có lỗi.

## Verified Findings

- `test-cases/authentication/registration.test-cases.ts` chứa 8 test cases với `module: 'Authentication Registration'`.
- `test-cases/authentication/login.test-cases.ts` chứa 5 test cases với `module: 'Authentication Login'`.
- `test-cases/authentication/password-recovery.test-cases.ts` chứa 3 test cases với `module: 'Authentication Password Recovery'`.
- `test-cases/authentication/profile.test-cases.ts` chứa 9 test cases với `module: 'Profile'` (đã chuẩn hóa khớp Module 02).
- `test-cases/home/home.test-cases.ts` chứa 4 test cases với `module: 'Home'`.
- `test-cases/ranking/ranking.test-cases.ts` chứa 6 test cases với `module: 'Ranking'`.
- `test-cases/listings/listing.test-cases.ts` chứa 31 test cases với `module: 'Listings'`.
- `test-cases/appointments/appointment.test-cases.ts` chứa 8 test cases với `module: 'Appointments'`.
- `test-cases/transactions/transaction.test-cases.ts` chứa 2 test cases với `module: 'Transactions'`.
- `test-cases/packages/package.test-cases.ts` chứa 5 test cases với `module: 'Packages'`.
- `test-cases/chat/chat.test-cases.ts` chứa 2 test cases với `module: 'Chat'`.
- Tổng cộng 83 test cases, hoàn toàn khớp số lượng từng module trong [Propify_Playwright_TestCase_Unified.md](file:///d:/DATN/DATNver3/document/Propify_Playwright_TestCase_Unified.md).
- `database/repositories/TestCaseReadRepository.ts`: Phương thức `getModulesSummary()` hiện đang dùng `ORDER BY module ASC`. Có thể dùng `CASE module WHEN 'Authentication' THEN 1 ... END` hoặc sắp xếp theo danh sách chuẩn trong mã TypeScript để bảo đảm thứ tự bất biến theo chuẩn tài liệu.
- `public/js/views/SummaryView.js` có `moduleMetaMap` chứa các key cũ `'Authentication Login'`, `'Authentication Registration'`, `'Authentication Password Recovery'`.

## Confirmed Decisions

- Người dùng đã lựa chọn qua tương tác trực tiếp:
  - Đồng bộ Module 01 thành 'Authentication' (16 test cases gộp Đăng ký, Đăng nhập, Quên mật khẩu).
  - Cập nhật trực tiếp trường `module: 'Authentication'` trong các file `test-cases/authentication/` và chạy `npm run db:sync` để đồng bộ vào SQLite.
  - Sắp xếp các tab theo thứ tự từ Module 01 đến 08 đúng chuẩn file markdown [Propify_Playwright_TestCase_Unified.md](file:///d:/DATN/DATNver3/document/Propify_Playwright_TestCase_Unified.md).

## Constraints

- Không làm thay đổi `id`, `title`, `expectedResult` hay script path của 83 test cases.
- Giữ nguyên cấu trúc API response của `GET /api/test-cases` và `GET /api/test-cases/modules`.
- Tuân thủ quy chuẩn 4-layer architecture và không đặt Playwright locator trong test file hoặc page object assertions.

## Out of Scope

- Thêm mới hoặc xóa bỏ kịch bản kiểm thử trong catalog.
- Thay đổi cấu trúc cơ sở dữ liệu `test_cases` (chỉ cập nhật giá trị cột `module`).
- Chỉnh sửa trang chi tiết lần chạy test (`/#runs`).

## Proposed Implementation

1. **Test Case Catalog Layer**:
   - Thay thế `module: 'Authentication Registration'`, `module: 'Authentication Login'`, `module: 'Authentication Password Recovery'` thành `module: 'Authentication'` trong:
     - `test-cases/authentication/registration.test-cases.ts`
     - `test-cases/authentication/login.test-cases.ts`
     - `test-cases/authentication/password-recovery.test-cases.ts`
2. **Database Synchronization**:
   - Chạy `npm run db:sync` để cập nhật bảng `test_cases` trong `data/autotest.db`.
3. **Repository / Server Layer**:
   - Trong `database/repositories/TestCaseReadRepository.ts`: Cập nhật hàm `getModulesSummary()` sắp xếp thứ tự module theo chuẩn markdown:
     `Authentication`, `Profile`, `Home`, `Ranking`, `Listings`, `Appointments`, `Transactions`, `Packages`, `Chat`.
4. **Dashboard View Layer**:
   - `public/js/views/SummaryView.js`: Cập nhật `moduleMetaMap` thay thế 3 module con bằng key `'Authentication': { label: 'Authentication (Xác thực tài khoản)', color: '#10b981' }`.
   - `public/js/views/TestCasesView.js`: Bổ sung mô tả phụ cho `'Authentication'` (`(Xác thực & Tài khoản)`), `'Home'`, `'Ranking'`, `'Transactions'`, `'Packages'`, `'Chat'` trong `renderModuleInfoBanner()`.
5. **Verification**:
   - Chạy `npm run typecheck`, `npm run lint`.
   - Chạy `npx playwright test tests/ui/dashboard.spec.ts tests/ui/test-case-workbench.spec.ts`.
   - Kiểm tra API `http://localhost:3000/api/test-cases/modules` và giao diện `http://localhost:3000/#test-cases`.

## Expected File Changes

- `test-cases/authentication/registration.test-cases.ts`: Cập nhật `module: 'Authentication'`.
- `test-cases/authentication/login.test-cases.ts`: Cập nhật `module: 'Authentication'`.
- `test-cases/authentication/password-recovery.test-cases.ts`: Cập nhật `module: 'Authentication'`.
- `database/repositories/TestCaseReadRepository.ts`: Cập nhật thứ tự sắp xếp theo danh mục chuẩn trong `getModulesSummary()`.
- `public/js/views/SummaryView.js`: Cập nhật `moduleMetaMap` hợp nhất `Authentication`.
- `public/js/views/TestCasesView.js`: Cập nhật nhãn phụ mô-đun trong `renderModuleInfoBanner()`.
- `tests/ui/dashboard.spec.ts`: Xác nhận tính tương thích của bộ lọc module.

## Open Questions

- [non-blocking] Không còn câu hỏi mở nào tồn đọng trước khi triển khai; tất cả định hướng thiết kế và dữ liệu đã được người dùng phê duyệt trực tiếp.

## Risks and Conflicts

- Cơ sở dữ liệu SQLite cục bộ `data/autotest.db` cần được đồng bộ lại qua `npm run db:sync` để API trả về giá trị mới ngay lập tức.
- Giữ vững tính tương thích của các bài test UI trong `dashboard.spec.ts` (vốn sử dụng in-memory DB với dữ liệu seed riêng).

## Impact Analysis

- **Tuân thủ Kiến trúc 4 tầng (4-Layer Conformance)**:
  - Tầng `test-cases/`: Các định nghĩa test case giữ nguyên cấu trúc `TestCaseDefinition`, chỉ đồng nhất thuộc tính `module: 'Authentication'` cho 16 kịch bản phân hệ xác thực. Không chứa logic DOM, assertions hay runtime state.
  - Tầng `database/repositories/`: Phương thức `getModulesSummary()` áp dụng sắp xếp xác định (deterministic ordering) bằng `CASE module ...` trong SQL, không thay đổi schema cơ sở dữ liệu hay gây breaking changes cho các API consumer.
  - Tầng `public/js/views/`: Giao diện hiển thị danh sách module tabs và summary metrics giữ trọn vẹn semantic HTML, CSS selectors và khả năng tương thích ngược với các bài kiểm thử Playwright UI.
- **Khả năng chống chập chờn (Anti-Flakiness & Resilience)**:
  - Giữ nguyên cơ chế AbortController hủy bỏ request cũ và debounce tìm kiếm trong `TestCasesView.js`.
  - Không phát sinh `page.waitForTimeout()` hoặc polling thủ công.
- **An toàn đột biến (Mutation Safety)**:
  - Thay đổi chỉ tác động đến cấu hình catalog và tầng đọc/hiển thị báo cáo APM cục bộ; không can thiệp vào các kịch bản mutating hay cổng an toàn E2E.
- **Độ chính xác kiểu dữ liệu (Type Safety)**:
  - Không có bất kỳ lỗi biên dịch nào trên toàn bộ codebase TypeScript (`npm run typecheck`). Đã loại bỏ các interface thừa không sử dụng trong `registration.test-cases.ts`.

## Verification Plan

| Mã VR | Tiêu chí nghiệm thu liên quan | Phương thức xác minh | Đối tượng phụ trách | Lệnh / Kịch bản thực thi | Kết quả kỳ vọng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VR-1` | `[DoD-1]` | Catalog Check | Agent | `npx ts-node scripts/validate-test-cases.ts` | 16 test cases có `module === 'Authentication'`, 83/83 mapped |
| `VR-2` | `[DoD-2]` | DB Sync Script | Agent | `npm run db:sync` | 83 test cases được đồng bộ, không còn phân hệ con |
| `VR-3` | `[DoD-3]` | Query & API Test | Agent | Direct SQLite query / API route check | 9 modules đúng thứ tự từ Module 01 đến 08 |
| `VR-4` | `[DoD-4]`, `[DoD-5]` | Playwright UI Test | Agent | `npx playwright test tests/ui/test-case-workbench.spec.ts` | Lọc theo module và trạng thái hoạt động chính xác |
| `VR-5` | `[DoD-6]` | Dashboard UI Test | Agent | `npx playwright test tests/ui/dashboard.spec.ts` | Giao diện tổng quan và tabs module pass 100% |
| `VR-6` | `[DoD-7]` | Static Check | Agent | `npm run typecheck` & `npx eslint ...` | Zero errors, zero warnings |

## Verification Results

- `VR-1` (`[DoD-1]`): **PASS**. `npx ts-node scripts/validate-test-cases.ts` xác nhận 83/83 test cases hợp lệ; 16 test cases đăng ký, đăng nhập và khôi phục mật khẩu đều thuộc `module: 'Authentication'`.
- `VR-2` (`[DoD-2]`): **PASS**. `npm run db:sync` cập nhật thành công 83 bản ghi vào `test_cases` trong `data/autotest.db`; không còn bản ghi nào thuộc `Authentication Registration`, `Authentication Login`, `Authentication Password Recovery`.
- `VR-3` (`[DoD-3]`): **PASS**. Truy vấn `getModulesSummary()` trả về danh sách 9 module với thứ tự cố định: `Authentication (16)` -> `Profile (9)` -> `Home (4)` -> `Ranking (6)` -> `Listings (31)` -> `Appointments (8)` -> `Transactions (2)` -> `Packages (5)` -> `Chat (2)`.
- `VR-4` (`[DoD-4]`, `[DoD-5]`): **PASS**. `npx playwright test tests/ui/test-case-workbench.spec.ts` chạy 3/3 tests thành công (exit 0).
- `VR-5` (`[DoD-6]`): **PASS**. `npx playwright test tests/ui/dashboard.spec.ts` chạy 6/6 tests thành công (exit 0), module tabs và metrics grid hoạt động chính xác.
- `VR-6` (`[DoD-7]`): **PASS**. `npm run typecheck` thành công với 0 lỗi; `npx eslint` trên tất cả các tệp sửa đổi đạt 0 lỗi, 0 cảnh báo.


## Change Reconciliation

- Baseline commit: `83ded4c6859f70612d7e802d2e7cfe11be8cfccd`.
- Completed changes:
  - `test-cases/authentication/registration.test-cases.ts`: Chuẩn hóa `module: 'Authentication'` cho 8 test cases, loại bỏ unused interface để tuân thủ ESLint.
  - `test-cases/authentication/login.test-cases.ts`: Chuẩn hóa `module: 'Authentication'` cho 5 test cases.
  - `test-cases/authentication/password-recovery.test-cases.ts`: Chuẩn hóa `module: 'Authentication'` cho 3 test cases.
  - `database/repositories/TestCaseReadRepository.ts`: Bổ sung `ORDER BY CASE module ...` trong `getModulesSummary()` để đảm bảo thứ tự module trả về từ API cố định theo tài liệu markdown.
  - `public/js/views/SummaryView.js`: Đồng bộ `moduleMetaMap` với 9 module chuẩn, bổ sung class tương thích cho KPI cards.
  - `public/js/views/TestCasesView.js`: Bổ sung mô tả nhãn phụ cho tất cả 9 module trong `subMap`.
  - `public/js/views/RunsView.js`: Chuẩn hóa thông báo empty state khi chưa có lần chạy nào.
  - `data/autotest.db`: Đồng bộ lại dữ liệu SQLite qua `npm run db:sync`.


