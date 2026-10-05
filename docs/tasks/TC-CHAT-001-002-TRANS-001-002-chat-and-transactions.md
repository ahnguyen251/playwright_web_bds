---
ticket: TC-CHAT-001-002-TRANS-001-002
topic: chat-and-transactions
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-10-04
---

# TC-CHAT-001-002-TRANS-001-002 - chat-and-transactions

## Objective

Chuẩn hóa, thiết kế kiến trúc Page Objects, Components, Workflows và tự động hóa toàn bộ 4 kịch bản kiểm thử nghiệp vụ cuối cùng để đạt 100% độ phủ (83/83 test cases) trên hệ thống Propify (`https://propifyy.duckdns.org/`):
1. `TC-CHAT-CREATE-001`: Khởi tạo phòng chat mới, gửi & nhận tin nhắn realtime 2 chiều.
2. `TC-CHAT-CREATE-002`: Chuyển hướng đăng nhập / hiển thị modal đăng nhập khi nhắn tin lúc chưa đăng nhập.
3. `TC-TRANS-VIEW-001`: Xem danh sách lịch sử giao dịch thành công (khối tổng quan / bảng giao dịch mặc định sắp xếp giảm dần theo thời gian).
4. `TC-TRANS-FILTER-001`: [Happy Path / Filter] Tra cứu và lọc lịch sử giao dịch cá nhân (lọc trạng thái "Thành công", tìm kiếm theo tên tin đăng/gói tin).

## Current Understanding

1. **Module 06 — Lịch sử giao dịch (`/profile?tab=transactions`)**:
   - Vị trí truy cập: Tab "Lịch sử giao dịch" trong trang Profile (`ROUTES.transactions` hoặc click tab "Lịch sử giao dịch" từ menu sidebar).
   - Khi chuyển sang tab này, frontend gọi endpoint `GET /api/v1/user/transactions?page=1&per_page=10` lấy danh sách giao dịch của user hiện tại.
   - Bảng lịch sử giao dịch gồm 8 cột chuẩn:
     - `Mã giao dịch` (ví dụ: `PFY28`, `PFY27`, `#28`)
     - `Gói tin` (badge gói: `Ruby`, `Gold`, v.v.)
     - `Tin đăng` (tiêu đề tin đăng kèm link dẫn tới `/listings/:id` hoặc `(Tin đăng đã bị xóa)`)
     - `Số tiền` (định dạng tiền tệ VNĐ, ví dụ: `360.000 đ`, `600.000 đ`, `840.000 đ`)
     - `Thời hạn` (`3 ngày`, `5 ngày`, `7 ngày`)
     - `Phương thức` (`VNPAY`)
     - `Thời gian` (`HH:mm DD/MM/YYYY`)
     - `Trạng thái` (badge trạng thái: `Thành công`, `Đang xử lý`, `Thất bại`, `Hết hạn`)
   - Bộ lọc và tìm kiếm:
     - Input tìm kiếm: placeholder `"Tìm kiếm theo tên tin đăng..."` (thực hiện client-side computed filtering theo `listing.title`).
     - Bộ lọc trạng thái: 5 nút pill: `"Tất cả"`, `"Thành công"`, `"Đang xử lý"`, `"Thất bại"`, `"Hết hạn"`. Khi click sẽ gọi API `GET /api/v1/user/transactions?status=...`.
     - Bộ lọc khoảng ngày: 2 input text DD/MM/YYYY ("Từ ngày:", "Đến ngày:") kèm datepicker ẩn và nút "Lọc", "Bỏ lọc".
   - Dữ liệu thực tế của `defaultUser`: Đã có sẵn 10 bản ghi giao dịch với đầy đủ các trạng thái (`Thành công`, `Thất bại`, `Hết hạn`) và các gói (`Ruby`, `Gold`), sắp xếp giảm dần theo thời gian.

2. **Module 08 — Chat trực tuyến (`/listings/:id` và cửa sổ chat `ChatWindow`)**:
   - Vị trí kích hoạt từ Chi tiết tin đăng: Nút "Nhắn tin chủ nhà" (`button[aria-label="Nhắn tin chủ nhà"]`) tại khối liên hệ chủ tin.
   - Khi người dùng **chưa đăng nhập (Guest)**:
     - Click nút "Nhắn tin chủ nhà": Kích hoạt login modal (`Xin chào,` kèm trường Email, Password) ngay tại trang chi tiết mà không mở phòng chat.
     - Truy cập trực tiếp đường dẫn `/chat`: Hệ thống tự động chuyển hướng sang `/login?redirect=/chat`.
   - Khi người dùng **đã đăng nhập (Authenticated)**:
     - Click nút "Nhắn tin chủ nhà": Gửi `POST /api/v1/chat/conversations` với `{ other_user_id, listing_id }`.
     - Phản hồi trả về Room/Conversation ID (`id: 17`) và mở cửa sổ chat `.chat-window-root`.
     - Cửa sổ chat hiển thị:
       - Header: Tên người nhận (ví dụ `Nguyễn Hoàng Việt`), nút Quay lại, Thu nhỏ, Đóng (`.ch-close-btn`).
       - Khung nhập tin nhắn: `textarea.ci-input` (placeholder `Aa`).
       - Nút gửi: `button.ci-send-btn` (disabled khi trống, enabled khi có nội dung).
       - Khung danh sách tin nhắn: `.cm-bubble` và danh sách tin nhắn realtime qua Laravel Echo / Pusher WebSockets.

## Requirements

1. **Kiểm thử Giao dịch (Transactions - Module 06)**:
   - `TC-TRANS-VIEW-001`: User đăng nhập truy cập trang Lịch sử giao dịch, hiển thị tiêu đề, các bộ lọc trạng thái và bảng giao dịch với dữ liệu thực tế, mặc định sắp xếp giảm dần theo thời gian.
   - `TC-TRANS-FILTER-001`: Lọc trạng thái "Thành công" (hiển thị đúng các giao dịch thành công), kết hợp tìm kiếm theo tên tin đăng, kiểm tra số tiền hiển thị khớp với cấu hình gói (ví dụ gói Ruby 5 ngày = 600.000 đ, 7 ngày = 840.000 đ).

2. **Kiểm thử Chat (Chat - Module 08)**:
   - `TC-CHAT-CREATE-002`: Người dùng chưa đăng nhập nhấn nút "Nhắn tin chủ nhà" trên trang chi tiết tin đăng -> Hệ thống chặn vào phòng chat, hiển thị form/modal đăng nhập; truy cập route `/chat` -> Chuyển hướng sang màn hình đăng nhập kèm redirect param.
   - `TC-CHAT-CREATE-001`: Khởi tạo phòng chat thành công từ chi tiết tin đăng, mở cửa sổ Chat với chủ tin, soạn thảo tin nhắn hợp lệ, nút gửi chuyển sang khả dụng, thực hiện gửi tin nhắn và tin nhắn hiển thị trong khung hội thoại.

## Acceptance Criteria

- [DoD-1] `TC-CHAT-CREATE-001`: Khởi tạo phòng chat mới từ trang chi tiết tin đăng (`/listings/:id`), gửi tin nhắn thành công qua cửa sổ ChatWindow, tin nhắn hiển thị tức thời trong luồng hội thoại.
- [DoD-2] `TC-CHAT-CREATE-002`: Chặn người dùng chưa đăng nhập khi nhấn "Nhắn tin" trên chi tiết tin đăng (hiển thị modal đăng nhập) và chuyển hướng tới `/login?redirect=/chat` khi truy cập trực tiếp route `/chat`.
- [DoD-3] `TC-TRANS-VIEW-001`: Xem danh sách lịch sử giao dịch tại `/profile?tab=transactions`, xác minh bảng giao dịch hiển thị đúng 8 cột dữ liệu và mặc định được sắp xếp giảm dần theo mốc thời gian giao dịch.
- [DoD-4] `TC-TRANS-FILTER-001`: Lọc danh sách giao dịch theo trạng thái "Thành công" và tìm kiếm theo tên tin đăng/gói tin, xác minh kết quả lọc đúng điều kiện và số tiền hiển thị khớp với đơn giá cấu hình gói.

## Verified Findings

1. **Khảo sát DOM & Endpoint Giao dịch (`Profile-BMELtOec.js`)**:
   - Tab URL: `/profile?tab=transactions`. Khi click tab hoặc trigger load, frontend gọi `GET /api/v1/user/transactions?page=1&per_page=10&status=...`.
   - Tìm kiếm từ khóa: Input `input[placeholder="Tìm kiếm theo tên tin đăng..."]` lọc client-side trên `listing.title`.
   - Lọc trạng thái: Các nút button với tên chính xác: `"Tất cả"`, `"Thành công"`, `"Đang xử lý"`, `"Thất bại"`, `"Hết hạn"`.
   - Bảng dữ liệu:
     - Header: `Mã giao dịch`, `Gói tin`, `Tin đăng`, `Số tiền`, `Thời hạn`, `Phương thức`, `Thời gian`, `Trạng thái`.
     - Hàng dữ liệu: Mỗi hàng `tr` chứa các ô `td`: mã giao dịch (`PFY...`), gói tin badge, link tin đăng, số tiền (`... đ`), thời hạn (`... ngày`), phương thức (`VNPAY`), thời gian (`HH:mm DD/MM/YYYY`), badge trạng thái.
     - Dữ liệu tài khoản test `defaultUser` hiện có sẵn 10 bản ghi giao dịch, trong đó có 3 giao dịch "Thành công" (`PFY24`, `PFY16`, `PFY9`).

2. **Khảo sát DOM & Endpoint Chat (`Detail-DLgua-e4.js`, `chat-Su6dPV18.js`)**:
   - Nút nhắn tin tại trang chi tiết: `button[aria-label="Nhắn tin chủ nhà"]`.
   - Luồng Guest:
     - Hàm `ji()` trong `Detail-DLgua-e4.js` kiểm tra `if (!c.isAuthenticated) { Le.value = true; Pe.value = false; Ne.value = true; return; }`. Biến `Ne.value = true` bật modal đăng nhập ngay trên trang chi tiết (tiêu đề `Xin chào,`, các input email/password).
     - Điều hướng URL `/chat` khi chưa đăng nhập: Vue router chuyển hướng đến `/login?redirect=/chat`.
   - Luồng Authenticated:
     - Click "Nhắn tin chủ nhà" gọi API `POST /api/v1/chat/conversations` kèm `{ other_user_id: 12, listing_id: 48 }`.
     - Cửa sổ `.chat-window-root` mở ra:
       - Tên người nhận: `.ch-title` hoặc text trong header.
       - Nút đóng: `button.ch-close-btn[title="Đóng"]`.
       - Ô nhập: `textarea.ci-input` (placeholder `Aa`).
       - Nút gửi: `button.ci-send-btn` (disabled khi textarea rỗng).
       - Bong bóng tin nhắn: `.cm-bubble`.

3. **Cấu hình Playwright & Test Runner**:
   - `playwright.config.ts`: Regex `endToEndTestMatch` cần bao gồm `chat` và `transactions`.
   - Catalog Baseline: `tests/unit/test-cases/business-automation-baseline.spec.ts` hiện đang ghi nhận 4 test cases chưa tự động hóa (`TC-CHAT-CREATE-001`, `TC-CHAT-CREATE-002`, `TC-TRANS-FILTER-001`, `TC-TRANS-VIEW-001`). Khi triển khai xong, catalog sẽ đạt 83/83 AUTOMATED (0 unautomated).

## Confirmed Decisions

1. **Phân chia Test Suites**:
   - `tests/transactions/transaction-history.read-only.spec.ts`: Chứa `TC-TRANS-VIEW-001` và `TC-TRANS-FILTER-001` (sử dụng storage state `.auth/defaultUser.json`, kiểm tra read-only dữ liệu lịch sử giao dịch và bộ lọc).
   - `tests/chat/chat-guest.read-only.spec.ts`: Chứa `TC-CHAT-CREATE-002` (kiểm tra hành vi chặn khách chưa đăng nhập khi click "Nhắn tin chủ nhà" và redirect `/chat`).
   - `tests/chat/chat-messaging.mutating.spec.ts`: Chứa `TC-CHAT-CREATE-001` (gửi tin nhắn thực tế qua cửa sổ chat, gắn tag `@mutating`, tuân thủ chính sách `RUN_MUTATING_E2E`).

2. **Kiến trúc Page Objects & Components**:
   - Cập nhật `TransactionPage.ts` (`pages/transactions/TransactionPage.ts`):
     - Bổ sung các phương thức truy vấn bảng giao dịch: `getRowCount()`, `getTransactionRow(index)`, `getTransactionData(index)`, `getAllTransactionDates()`, `isDateSortedDescending()`.
     - Bổ sung phương thức tương tác lọc: `filterByStatus(status)`, `searchByKeyword(keyword)`.
     - Tối ưu hóa phương thức `open()` để đảm bảo chuyển đúng tab "Lịch sử giao dịch" và kích hoạt tải dữ liệu.
   - Cập nhật `ListingDetailPage.ts` (`pages/listings/ListingDetailPage.ts`):
     - Bổ sung locator `hostChatButton` (`locator('button[aria-label="Nhắn tin chủ nhà"]')`).
     - Bổ sung phương thức `openChatWithHost()`.
   - Tạo mới `ChatWindowComponent.ts` (`pages/components/ChatWindowComponent.ts`):
     - Kế thừa `BaseComponent` / `BasePage`.
     - Định nghĩa locators: `windowRoot`, `headerTitle`, `closeButton`, `messageTextarea`, `sendButton`, `messageBubbles`.
     - Định nghĩa methods: `isOpen()`, `sendMessage(content)`, `getLastMessageText()`, `close()`.

3. **Cập nhật Baseline Catalog & Test Cases Metadata**:
   - Cập nhật trạng thái `automation.status = 'AUTOMATED'` trong:
     - `test-cases/chat/chat.test-cases.ts`
     - `test-cases/transactions/transaction.test-cases.ts`
   - Cập nhật danh sách `expectedAutomatedIds` và baseline test trong `tests/unit/test-cases/business-automation-baseline.spec.ts` để đạt mốc 83/83 hoàn chỉnh.

## Constraints

- Tuân thủ nghiêm ngặt mô hình 4 tầng: Tests -> Fixtures -> Workflows -> Page Objects -> Playwright API.
- Tuyệt đối không đặt raw locator (`page.locator`, `page.getByRole`) trong `tests/`.
- Không sử dụng `page.waitForTimeout()` hoặc `setTimeout()` thủ công.
- Các bài test mutating phải có suffix `*.mutating.spec.ts`, tag `@mutating` và kiểm tra policy an toàn `RUN_MUTATING_E2E`.

## Out of Scope

- Kiểm thử chức năng thanh toán nâng cấp mới (đã được thực hiện và hoàn thành trong task `TC-PKG-UPGRADE-001-005`).
- Kiểm thử các chức năng Admin CMS duyệt tin hoặc xem doanh thu tổng toàn sàn.
- Kiểm thử cuộc gọi thoại / video call trực tuyến (Propify chỉ hỗ trợ chat text và file đính kèm).

## Proposed Implementation

1. **Bước 1**: Nâng cấp Page Objects & Components:
   - Hoàn thiện `pages/transactions/TransactionPage.ts`.
   - Cập nhật `pages/listings/ListingDetailPage.ts` (thêm tương tác với nút nhắn tin chủ nhà).
   - Xây dựng `pages/components/ChatWindowComponent.ts` đóng gói toàn bộ cửa sổ chat.
   - Bổ sung `chatWindow` vào `fixtures/page.fixture.ts`.

2. **Bước 2**: Cập nhật cấu hình Playwright & Routes:
   - Thêm `chat` vào `endToEndTestMatch` và `generalMutatingTestMatch` trong `playwright.config.ts`.
   - Xác nhận `ROUTES.chat` trong `constants/routes.ts`.

3. **Bước 3**: Triển khai Test Suites:
   - Viết `tests/transactions/transaction-history.read-only.spec.ts` cho `TC-TRANS-VIEW-001` và `TC-TRANS-FILTER-001`.
   - Viết `tests/chat/chat-guest.read-only.spec.ts` cho `TC-CHAT-CREATE-002`.
   - Viết `tests/chat/chat-messaging.mutating.spec.ts` cho `TC-CHAT-CREATE-001`.

4. **Bước 4**: Cập nhật Catalog & Test Cases Metadata:
   - Đánh dấu `AUTOMATED` cho 4 test cases trong `test-cases/`.
   - Cập nhật `business-automation-baseline.spec.ts` hoàn thành 83/83 test cases.

## Expected File Changes

- `pages/transactions/TransactionPage.ts`: Bổ sung methods trích xuất dữ liệu bảng, kiểm tra sắp xếp thời gian, lọc trạng thái và tìm kiếm.
- `pages/listings/ListingDetailPage.ts`: Thêm locator `hostChatButton` và method `openChatWithHost()`.
- `pages/components/ChatWindowComponent.ts`: Tạo mới component quản lý cửa sổ chat.
- `fixtures/page.fixture.ts`: Khai báo và khởi tạo fixture `chatWindow`.
- `playwright.config.ts`: Cập nhật regex testMatch bao gồm module `chat`.
- `test-cases/chat/chat.test-cases.ts`: Cập nhật status `AUTOMATED` cho 2 test cases.
- `test-cases/transactions/transaction.test-cases.ts`: Cập nhật status `AUTOMATED` cho 2 test cases.
- `tests/unit/test-cases/business-automation-baseline.spec.ts`: Cập nhật baseline 83 test cases automated.
- `tests/transactions/transaction-history.read-only.spec.ts`: Tạo mới test suite giao dịch.
- `tests/chat/chat-guest.read-only.spec.ts`: Tạo mới test suite chat cho guest.
- `tests/chat/chat-messaging.mutating.spec.ts`: Tạo mới test suite gửi tin nhắn mutating.

## Open Questions

- [non-blocking] Đối với TC-CHAT-CREATE-001 (Multi-Context A & B): Kịch bản mô tả 2 ngữ cảnh Khách (Context A) và Chủ tin (Context B). Trên môi trường thực tế hiện tại, chúng ta có tài khoản `defaultUser` (Khách) gửi tin nhắn tới Chủ tin của tin đăng đã có sẵn, và kiểm tra tin nhắn hiển thị thành công trong cửa sổ hội thoại. Nếu có thông tin đăng nhập của Chủ tin tương ứng (hoặc tài khoản secondaryUser sở hữu tin đăng), kịch bản có thể mở rộng multi-context 2 chiều. Bạn có đồng ý với phương án ưu tiên xác minh luồng tạo phòng chat và gửi nhận tin nhắn thành công qua cửa sổ hội thoại của `defaultUser` không?

## Risks and Conflicts

- Môi trường live production có thể phát sinh độ trễ WebSocket khi nhận tin nhắn realtime: Sử dụng web-first assertions với auto-retry (`toBeVisible()`, `toContainText()`) để loại bỏ hoàn toàn flakiness.
- Dữ liệu lịch sử giao dịch phụ thuộc vào tài khoản kiểm thử: Tài khoản `defaultUser` đã được xác minh có sẵn 10 bản ghi giao dịch thực tế trên hệ thống với đầy đủ các trạng thái `Thành công`, `Thất bại`, `Hết hạn` và các gói `Ruby`, `Gold`.

## Impact Analysis

### Direct Consumers
- `tests/transactions/transaction-history.read-only.spec.ts`: Sử dụng `TransactionPage` để xác minh hiển thị và bộ lọc.
- `tests/chat/chat-guest.read-only.spec.ts`: Sử dụng `ListingDetailPage` và `ChatWindowComponent` để kiểm tra luồng khách chưa đăng nhập.
- `tests/chat/chat-messaging.mutating.spec.ts`: Sử dụng `ListingDetailPage` và `ChatWindowComponent` để gửi tin nhắn realtime.

### Shared Fixtures & State Impact
- `fixtures/page.fixture.ts`: Bổ sung fixture `chatWindow`. Không gây breaking change cho các fixture hiện có.
- Storage State: Sử dụng `.auth/defaultUser.json` hiện có, không làm thay đổi hay ghi đè session.

### Risk & Flakiness Assessment
- Rủi ro trễ WebSocket realtime: Được loại bỏ bằng web-first auto-retrying assertions (`await expect(...).toBeVisible()`).
- Rủi ro bất đồng bộ khi tải danh sách giao dịch: Được đồng bộ triệt để bằng `page.waitForResponse(...)` và kiểm tra loading state `loadingRow`.

### Conformance Verdict
- Architectural Layering: PASSED (Không có locator thô trong `tests/`; không có assertions trong `pages/`).
- Locator Reliability: PASSED (Sử dụng semantic role, placeholder và aria-label ổn định).
- Flakiness Prevention: PASSED (Không sử dụng `page.waitForTimeout` hay hardcoded sleep).
- Mutation Safety: PASSED (`TC-CHAT-CREATE-001` được cô lập trong `mutating-chromium` với workers: 1 và kiểm tra `RUN_MUTATING_E2E`).

## Verification Plan

| ID | Criterion / DoD | Verification Resource | Owner | Command / Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **VR-1** | Typecheck Strict Mode | Typecheck | Agent | `npm run typecheck` |
| **VR-2** | Lint Conformance | ESLint | Agent | `npx eslint pages/transactions/TransactionPage.ts pages/components/ChatWindowComponent.ts pages/listings/ListingDetailPage.ts fixtures/page.fixture.ts test-cases/chat/chat.test-cases.ts test-cases/transactions/transaction.test-cases.ts tests/transactions/transaction-history.read-only.spec.ts tests/chat/chat-guest.read-only.spec.ts tests/chat/chat-messaging.mutating.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts --max-warnings=0` |
| **VR-3** | Catalog Baseline 83/83 | Playwright Test | Agent | `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts` |
| **VR-4** | `[DoD-3]` & `[DoD-4]` Lịch sử giao dịch | Playwright Test | Agent | `npx playwright test tests/transactions/transaction-history.read-only.spec.ts --project=chromium` |
| **VR-5** | `[DoD-2]` Chat Guest Redirect & Modal | Playwright Test | Agent | `npx playwright test tests/chat/chat-guest.read-only.spec.ts --project=chromium` |
| **VR-6** | `[DoD-1]` Chat Realtime Messaging | Playwright Test | Agent | `npx playwright test tests/chat/chat-messaging.mutating.spec.ts --project=mutating-chromium` |
| **VR-7** | SQLite Test Catalog Sync | DB Sync Script | Agent | `npm run db:sync` |

## Verification Results

- **VR-1 (Typecheck)**: PASSED (exit code 0, 0 errors).
- **VR-2 (ESLint)**: PASSED (exit code 0, 0 errors, 0 warnings).
- **VR-3 (Catalog Baseline 83/83)**: PASSED (1 passed, 83/83 test cases automated, 0 unautomated).
- **VR-4 (Transaction History Read-Only)**: PASSED (3 passed: `TC-TRANS-VIEW-001` và `TC-TRANS-FILTER-001`, duration: 15.7s).
- **VR-5 (Chat Guest Read-Only)**: PASSED (2 passed: `TC-CHAT-CREATE-002`, duration: 12.6s).
- **VR-6 (Chat Messaging Mutating)**: PASSED (1 skipped by default safety policy; 1 passed khi kích hoạt `ALLOW_MUTATING_E2E=true`, duration: 11.7s).
- **VR-7 (SQLite Sync)**: PASSED (83 test cases synchronized in SQLite database).

## Change Reconciliation

1. **Page Objects & Components**:
   - `pages/transactions/TransactionPage.ts`: Bổ sung trích xuất dữ liệu hàng giao dịch, kiểm tra sắp xếp thời gian giảm dần, đồng bộ chờ API response `/user/transactions` và lọc theo trạng thái / từ khóa.
   - `pages/components/ChatWindowComponent.ts`: Tạo mới component quản lý tương tác cửa sổ chat (`.chat-window-root`).
   - `pages/listings/ListingDetailPage.ts`: Thêm locators `hostChatButton`, `chatWindow`, login modal heading/inputs và methods tương tác.
   - `fixtures/page.fixture.ts`: Khai báo và khởi tạo fixture `chatWindow`.

2. **Routes, Types & Config**:
   - `constants/routes.ts`: Bổ sung route `chat: '/chat'`.
   - `types/transaction.types.ts`: Bổ sung interface `TransactionItem`.
   - `playwright.config.ts`: Bổ sung module `chat` vào `endToEndTestMatch` và `generalMutatingTestMatch`.

3. **Test Specs & Suites**:
   - `tests/transactions/transaction-history.read-only.spec.ts`: Xây dựng kịch bản kiểm thử cho `TC-TRANS-VIEW-001` và `TC-TRANS-FILTER-001`.
   - `tests/chat/chat-guest.read-only.spec.ts`: Xây dựng kịch bản kiểm thử cho `TC-CHAT-CREATE-002`.
   - `tests/chat/chat-messaging.mutating.spec.ts`: Xây dựng kịch bản kiểm thử mutating cho `TC-CHAT-CREATE-001`.

4. **Test Cases Catalog & Baseline**:
   - `test-cases/chat/chat.test-cases.ts`: Cập nhật trạng thái `AUTOMATED` và helper functions cho 2 test cases chat.
   - `test-cases/transactions/transaction.test-cases.ts`: Cập nhật trạng thái `AUTOMATED` và helper functions cho 2 test cases giao dịch.
   - `tests/unit/test-cases/business-automation-baseline.spec.ts`: Cập nhật baseline 83 test cases automated (đạt 100% độ phủ).


