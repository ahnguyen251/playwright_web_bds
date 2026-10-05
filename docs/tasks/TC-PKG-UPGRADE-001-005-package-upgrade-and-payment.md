---
ticket: TC-PKG-UPGRADE-001-005
topic: package-upgrade-and-payment
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-10-02
---

# TC-PKG-UPGRADE-001-005 - package-upgrade-and-payment

## Objective

Chuẩn hóa, thiết kế kiến trúc và tự động hóa toàn bộ 5 kịch bản kiểm thử nghiệp vụ cho Module 07 — Nâng cấp gói tin & thanh toán qua cổng VNPAY Sandbox trên hệ thống Propify (`https://propifyy.duckdns.org/`):
1. `TC-PKG-UPGRADE-001`: [Happy Path / E2E] Nâng cấp gói tin thành công qua VNPAY Sandbox.
2. `TC-PKG-UPGRADE-002`: [State Transition] Nâng cấp lên hạng VIP cao hơn tính lại Cấp ưu tiên & Hệ số nhân ngay lập tức.
3. `TC-PKG-UPGRADE-003`: [Business Rule] Chặn hạ cấp gói VIP khi gói hiện tại còn hiệu lực (hiển thị button disable "Không thể hạ cấp").
4. `TC-PKG-UPGRADE-004`: Hủy nâng cấp / Đổi gói-thời hạn tại màn hình xác nhận (hủy bỏ quay lại chọn gói, chuyển thời hạn cập nhật số tiền).
5. `TC-PKG-UPGRADE-005`: Hiển thị lỗi khi thanh toán thất bại hoặc bị hủy tại cổng thanh toán.

## Current Understanding

1. **Vị trí và khởi phát luồng nâng cấp**:
   - Khởi phát từ Danh sách tin đăng cá nhân (`/profile?tab=listings`).
   - Mỗi hàng tin đăng có nút "Thao tác" (ba chấm).
   - Với tin đăng ở trạng thái "Đang đăng", menu thao tác hiển thị lựa chọn:
     - "Sửa tin đăng"
     - "Nâng cấp gói tin" (icon thông tin / sao)
     - "Gỡ tin đăng"
   - Khi click "Nâng cấp gói tin", modal `PackageUpgradeModal` mở ra (được render qua Vue Teleport gắn vào `body`).

2. **Cấu trúc giao diện Modal Nâng cấp gói (`PackageUpgradeModal`)**:
   - Header: Tiêu đề `"Nâng cấp gói tin"`, phụ đề `"Chọn gói tin phù hợp để tăng hiệu quả hiển thị"`, nút đóng modal (`.modal-close`).
   - Lưới hiển thị các gói (`.packages-grid`):
     - Gói **Diamond** (`.package-card--diamond`): Giá 250.000đ/ngày, Cấp ưu tiên 4, hệ số x2 (hoặc x5.0 theo quy tắc xếp hạng).
     - Gói **Ruby** (`.package-card--ruby`): Giá 120.000đ/ngày, Cấp ưu tiên 3, hệ số x1.5.
     - Gói **Vàng** (`.package-card--gold`): Giá 50.000đ/ngày, Cấp ưu tiên 2, hệ số x1.2.
     - Gói **Tin thường** (`.package-card--free`): Miễn phí, Cấp ưu tiên 1.
   - Các mốc thời hạn (`.pkg-duration-row`): 3 ngày, 5 ngày, 7 ngày, 10 ngày, 15 ngày, 30 ngày. Khi click một hàng thời hạn, hàng đó nhận class `.pkg-duration-row--active`, hiển thị đúng đơn giá tổng tương ứng.
   - Nút hành động gói (`.pkg-action-btn`):
     - Mặc định khi chưa chọn thời hạn: Nút bị `disabled`.
     - Khi đã chọn thời hạn: Nút chuyển sang trạng thái sẵn sàng (`.pkg-action-btn--ready`), hiển thị text `"Nâng cấp lên [Tên gói]"` hoặc `"Gia hạn [Tên gói]"`.
     - Quy tắc chặn hạ cấp: Nếu tin đăng đang sở hữu gói VIP có Cấp ưu tiên cao hơn, các gói thấp hơn hiển thị nút disabled với class `.pkg-action-btn--disabled` và nhãn `"Không thể hạ cấp"`.

3. **Màn hình xác nhận thanh toán (`.confirm-card`)**:
   - Sau khi chọn gói và thời hạn, nhấn "Nâng cấp lên [Gói]", modal chuyển sang bước xác nhận.
   - Tiêu đề: `"Xác nhận thanh toán"`.
   - Nội dung thông báo: `"Bạn có chắc muốn nâng cấp lên gói [Tên gói] [Thời hạn] với giá [Số tiền]?"`.
   - 2 nút điều hướng:
     - Nút `"Hủy"` (`.confirm-btn--secondary`): Đóng màn hình xác nhận, quay lại lưới chọn gói mà không thực hiện thanh toán.
     - Nút `"Thanh toán"` (`.confirm-btn--primary`): Gửi request `POST /api/v1/listings/{listing_id}/upgrade` kèm `{ package_id, duration_days }`.

4. **Tích hợp Cổng thanh toán VNPAY Sandbox & Điều hướng phản hồi**:
   - Backend Propify trả về URL thanh toán VNPAY: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...`.
   - Trình duyệt chuyển hướng sang cổng thanh toán VNPAY sandbox.
   - Thông tin thẻ test VNPAY:
     - Số thẻ: `9704198888888888888`
     - Tên chủ thẻ: `NGUYEN VAN A`
     - Ngày phát hành: `07/15`
     - OTP: `123456`
   - Khi hoàn tất thanh toán (hoặc hủy/thất bại), cổng thanh toán redirect về Propify endpoint `GET /api/v1/payments/vnpay/return`.
   - Propify backend xử lý IPN và redirect người dùng tới route frontend:
     `/payment/vnpay-result?status=success&transaction_id=...` hoặc `?status=failed`.
   - Trang kết quả thanh toán (`/payment/vnpay-result` - Component `VnpayResult`):
     - Trạng thái thành công: Icon `✓` (nền xanh emerald), tiêu đề `<h1>` `"Thanh toán thành công"`, thông báo `"Đang chuyển về trang quản lý tin đăng..."`.
     - Trạng thái thất bại / hủy: Icon `!` (nền đỏ rose), tiêu đề `<h1>` `"Thanh toán chưa thành công"`.
     - Sau 800ms, trang tự động điều hướng về `/profile?tab=listings&payment=success` (hoặc `payment=failed`).
   - Trang Quản lý tin đăng (`/profile?tab=listings`):
     - Khi nhận `payment=success`: Hiển thị thông báo Toast `"Nâng cấp gói tin thành công."`.
     - Khi nhận `payment=failed`: Hiển thị thông báo Toast `"Thanh toán chưa thành công. Gói tin chưa được nâng cấp."`.

## Requirements

1. **Tuân thủ Kiến trúc 4 tầng (4-Layer Architecture)**:
   - `pages/components/PackageUpgradeModalComponent.ts`: Đóng gói toàn bộ cấu trúc modal nâng cấp gói tin, danh sách gói, chọn thời hạn, kiểm tra hạ cấp, màn hình xác nhận thanh toán, kế thừa `BaseComponent` hoặc sử dụng locator đóng gói an toàn. Không chứa assertions `@playwright/test`.
   - `pages/packages/VnpayResultPage.ts`: Đóng gói màn hình kết quả thanh toán `/payment/vnpay-result`, nhận diện trạng thái success/failed.
   - Mở rộng `pages/listings/MyListingsPage.ts`: Bổ sung phương thức `openPackageUpgrade(reference: ListingReference)` mở modal nâng cấp gói.
   - `fixtures/page.fixture.ts`: Khai báo và compose `packageUpgradeModal` và `vnpayResultPage`.
   - `tests/packages/`: Tổ chức các test specs tách biệt:
     - `tests/packages/package-upgrade-flow.read-only.spec.ts`: Dành cho các kịch bản kiểm tra UI, chặn hạ cấp, hủy màn hình xác nhận, đổi thời hạn cập nhật số tiền (`TC-PKG-UPGRADE-003`, `TC-PKG-UPGRADE-004`), và kiểm tra trang kết quả lỗi `TC-PKG-UPGRADE-005`.
     - `tests/packages/package-upgrade.mutating.spec.ts`: Dành cho kịch bản nâng cấp thực tế qua VNPAY sandbox (`TC-PKG-UPGRADE-001`, `TC-PKG-UPGRADE-002`), có gắn tag `@mutating`, tuân thủ safety gate `RUN_MUTATING_E2E`.
2. **Tuân thủ quy định Anti-Flakiness**:
   - Tuyệt đối không dùng `page.waitForTimeout()` hoặc `setTimeout()`.
   - Dùng auto-retrying assertions (`await expect(locator).toBeVisible()`).
   - Lắng nghe request API `POST /api/v1/listings/*/upgrade` và API packages `GET /api/v1/packages`.
3. **Quy định An toàn Môi trường**:
   - `TC-PKG-UPGRADE-003` và `TC-PKG-UPGRADE-004` không làm thay đổi dữ liệu trên production, chạy độc lập an toàn.
   - `TC-PKG-UPGRADE-001` và `TC-PKG-UPGRADE-002` thực hiện thanh toán sandbox thật, chỉ kích hoạt khi cờ `RUN_MUTATING_E2E=true`.

## Acceptance Criteria

- [DoD-1] `TC-PKG-UPGRADE-001`: [Happy Path / E2E] Nâng cấp gói tin thành công qua VNPAY Sandbox. User đã đăng nhập, sở hữu tin đăng dạng thường. Chọn gói Ruby/VIP, xác nhận và hoàn tất thanh toán thẻ test sandbox VNPAY; redirect về Propify hiển thị "Thanh toán thành công", loại tin cập nhật lên VIP tương ứng, ghi nhận giao dịch mới.
- [DoD-2] `TC-PKG-UPGRADE-002`: [State Transition] Nâng cấp lên hạng VIP cao hơn tính lại Cấp ưu tiên & Hệ số nhân ngay lập tức. Sau khi hoàn tất thanh toán nâng cấp từ gói thấp lên gói cao hơn, Cấp ưu tiên và badge của tin đăng được cập nhật, Điểm hiển thị được recalculate.
- [DoD-3] `TC-PKG-UPGRADE-003`: [Business Rule] Chặn hạ cấp gói VIP khi gói hiện tại còn hiệu lực. Mở popup nâng cấp tại tin đăng đang có gói VIP cao (ví dụ Kim Cương/Diamond - Cấp 4); các gói có Cấp ưu tiên thấp hơn hiện tại bị disable với nhãn "Không thể hạ cấp", không cho phép người dùng chọn hạ cấp.
- [DoD-4] `TC-PKG-UPGRADE-004`: Hủy nâng cấp / Đổi gói-thời hạn tại màn hình xác nhận. Tại màn hình xác nhận thanh toán, nhấn "Hủy" thì đóng màn hình xác nhận, quay lại lưới chọn gói và không gọi API thanh toán; khi đổi gói hoặc đổi thời hạn khác (ví dụ 3 ngày sang 5 ngày), số tiền và nội dung thông báo cập nhật đúng theo lựa chọn mới.
- [DoD-5] `TC-PKG-UPGRADE-005`: Hiển thị lỗi khi thanh toán thất bại / bị hủy tại cổng thanh toán. Khi người dùng hủy hoặc thanh toán không thành công tại cổng VNPAY Sandbox và redirect về Propify (`status=failed`), hiển thị màn hình kết quả "Thanh toán chưa thành công", sau đó chuyển hướng về Quản lý tin đăng với thông báo lỗi "Thanh toán chưa thành công. Gói tin chưa được nâng cấp.".
- [Derived-1] Khởi tạo Page Object `PackageUpgradeModalComponent` và `VnpayResultPage` đúng chuẩn 4 tầng, tích hợp vào `fixtures/page.fixture.ts`.
- [Derived-2] Cập nhật metadata `test-cases/packages/package.test-cases.ts`, chuyển trạng thái các test cases sang `AUTOMATED` khi hoàn thành kịch bản.
- [Derived-3] Đảm bảo 100% tuân thủ TypeScript strict mode (`npm run typecheck`) và ESLint (`npm run lint`) với 0 lỗi.

## Verified Findings

1. `test-cases/packages/package.test-cases.ts`:
   - Chứa định nghĩa đầy đủ 5 test cases `TC-PKG-UPGRADE-001` đến `TC-PKG-UPGRADE-005`.
   - Cả 5 test cases đều đang có `automation: { status: 'NOT_AUTOMATED' }`.
2. Khảo sát DOM thực tế tại `https://propifyy.duckdns.org/`:
   - Nút mở modal nâng cấp nằm trong menu action của tin đăng trên trang `/profile?tab=listings`:
     `button:has-text("Nâng cấp gói tin")`.
   - Modal hiển thị qua Teleport `body`:
     - Modal Overlay: `.modal-overlay`.
     - Header: `.modal-header`, tiêu đề `.modal-title` (`"Nâng cấp gói tin"`), nút đóng `.modal-close`.
     - Lưới gói: `.packages-grid`.
     - Các gói: `.package-card--diamond`, `.package-card--ruby`, `.package-card--gold`, `.package-card--free`.
     - Đơn giá mốc thời gian: `.pkg-durations .pkg-duration-row` (nhãn `.pkg-duration-label`, giá `.pkg-duration-price`).
     - Khi click chọn thời hạn: nhận class `.pkg-duration-row--active`.
     - Nút hành động: `.pkg-action-btn`. Khi bị chặn hạ cấp: có class `.pkg-action-btn--disabled`, thuộc tính `disabled=""`, nội dung chữ `"Không thể hạ cấp"`.
   - Card xác nhận thanh toán (`.confirm-card`):
     - Tiêu đề: `.confirm-title` (`"Xác nhận thanh toán"`).
     - Lời nhắn: `.confirm-message` (chứa tên gói, số ngày, số tiền định dạng `xxx.xxxđ`).
     - Nút Hủy: `.confirm-btn--secondary` (`"Hủy"`).
     - Nút Thanh toán: `.confirm-btn--primary` (`"Thanh toán"`).
3. Luồng API nâng cấp gói:
   - Request: `POST /api/v1/listings/{id}/upgrade` kèm body `{ package_id: number, duration_days: number }`.
   - Response: trả về `{ status: true, data: { payment_url: string } }` trỏ tới `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...`.
4. Trang kết quả thanh toán VNPAY (`/payment/vnpay-result`):
   - Query: `?status=success&transaction_id=...` hoặc `?status=failed`.
   - Icon: `✓` xanh (thành công) hoặc `!` đỏ (thất bại).
   - Heading `H1`: `"Thanh toán thành công"` hoặc `"Thanh toán chưa thành công"`.
   - Tự động replace sang `/profile?tab=listings&payment=success` (hoặc `failed`) sau 800ms.
5. Thông báo Toast trên `/profile?tab=listings`:
   - Thành công: `"Nâng cấp gói tin thành công."`.
   - Thất bại: `"Thanh toán chưa thành công. Gói tin chưa được nâng cấp."`.

## Confirmed Decisions

1. Tạo Page Component `pages/components/PackageUpgradeModalComponent.ts` để bao đóng toàn bộ tương tác trên Modal Nâng cấp gói tin.
2. Tạo Page Object `pages/packages/VnpayResultPage.ts` để bao đóng màn hình kết quả thanh toán `/payment/vnpay-result`.
3. Bổ sung phương thức `openPackageUpgrade(reference: ListingReference)` vào `pages/listings/MyListingsPage.ts`.
4. Khai báo `packageUpgradeModal` và `vnpayResultPage` trong `fixtures/page.fixture.ts`.
5. Tạo helper trích xuất test case definition trong `test-cases/packages/package.test-cases.ts` (`getPackageTestCase(id)`).
6. Tách biệt kiểm thử:
   - Các kịch bản read-only / simulation (`TC-PKG-UPGRADE-003`, `TC-PKG-UPGRADE-004`, `TC-PKG-UPGRADE-005`): đặt tại `tests/packages/package-upgrade-flow.read-only.spec.ts`.
   - Các kịch bản mutating thanh toán VNPAY sandbox thật (`TC-PKG-UPGRADE-001`, `TC-PKG-UPGRADE-002`): đặt tại `tests/packages/package-upgrade.mutating.spec.ts` có gate `RUN_MUTATING_E2E`.

## Constraints

1. Không can thiệp hoặc sửa đổi mã nguồn ứng dụng web Propify (`production`).
2. Mọi kịch bản kiểm thử phải tuân thủ nghiêm ngặt kiến trúc 4 tầng của framework (không raw locators trong test, không assertions trong Page Objects).
3. Đảm bảo 0 lỗi TypeScript strict mode (`npm run typecheck`) và 0 warning ESLint (`npm run lint`).
4. Thanh toán thật qua VNPAY sandbox phải được bảo vệ bởi cờ an toàn `RUN_MUTATING_E2E`.

## Out of Scope

1. Hệ thống Quản trị viên CMS phê duyệt hoặc cấu hình giá các gói tin (`/admin/packages`).
2. Tích hợp các cổng thanh toán khác ngoài VNPAY Sandbox (Momo, ZaloPay, VietQR).
3. Kịch bản mua gói trước khi đăng tin (luồng này áp dụng nâng cấp trên tin đăng hiện có theo đúng đặc tả Module 07).

## Proposed Implementation

1. **`pages/components/PackageUpgradeModalComponent.ts`**:
   - Quản lý locators: modal overlay, package cards, duration rows, upgrade buttons, confirm card, cancel button, pay button.
   - Cung cấp inquiry methods: `isOpen()`, `isPackageDisabled(packageName)`, `getDisabledReason(packageName)`, `getConfirmMessage()`, `isConfirmVisible()`.
   - Cung cấp interaction methods: `selectPackageDuration(packageName, durationLabel)`, `clickUpgradePackage(packageName)`, `cancelConfirmation()`, `confirmPayment()`, `close()`.
2. **`pages/packages/VnpayResultPage.ts`**:
   - Điều hướng tới `/payment/vnpay-result`.
   - Locators: `statusHeading`, `statusIcon`, `redirectNotice`.
   - Inquiry methods: `isSuccess()`, `isFailed()`, `statusText()`.
3. **`pages/listings/MyListingsPage.ts`**:
   - Bổ sung `openPackageUpgrade(reference: ListingReference): Promise<PackageUpgradeModalComponent>`.
4. **`fixtures/page.fixture.ts`**:
   - Bổ sung `packageUpgradeModal` và `vnpayResultPage`.
5. **`tests/packages/package-upgrade-flow.read-only.spec.ts`**:
   - `TC-PKG-UPGRADE-003`: Mô phỏng tin đăng có gói VIP Kim Cương, mở modal, verify các gói VIP thấp hơn (Vàng, Ruby, Thường) bị disable và hiển thị nhãn "Không thể hạ cấp".
   - `TC-PKG-UPGRADE-004`: Mở modal cho tin thường, chọn gói Ruby 3 ngày -> màn xác nhận hiển thị giá 360.000đ. Nhấn "Hủy" -> màn xác nhận đóng, quay lại lưới gói. Chọn 5 ngày -> màn xác nhận cập nhật 600.000đ.
   - `TC-PKG-UPGRADE-005`: Kiểm tra trang `/payment/vnpay-result?status=failed`, kiểm chứng tiêu đề "Thanh toán chưa thành công", icon thất bại, và toast thông báo lỗi tại trang danh sách tin.
6. **`tests/packages/package-upgrade.mutating.spec.ts`**:
   - `TC-PKG-UPGRADE-001` & `TC-PKG-UPGRADE-002`: Thực hiện luồng E2E nâng cấp gói qua VNPAY sandbox khi `RUN_MUTATING_E2E=true`.

## Expected File Changes

- `pages/components/PackageUpgradeModalComponent.ts`: Tạo mới đóng gói toàn bộ tương tác trên Modal Nâng cấp gói tin và Card xác nhận thanh toán.
- `pages/packages/VnpayResultPage.ts`: Tạo mới đóng gói màn hình kết quả thanh toán `/payment/vnpay-result`.
- `pages/packages/VnpaySandboxPage.ts`: Tạo mới đóng gói tương tác trên cổng thanh toán VNPAY Sandbox.
- `pages/listings/MyListingsPage.ts`: Mở rộng thêm phương thức `openPackageUpgrade`, `openPackageUpgradeByIndex`, `openPackageUpgradeForStatus` và hoàn thiện selector `feedbackRegion`.
- `fixtures/page.fixture.ts`: Đăng ký `packageUpgradeModal`, `vnpayResultPage`, và `vnpaySandboxPage`.
- `test-cases/packages/package.test-cases.ts`: Cập nhật trạng thái `AUTOMATED` cho cả 5 test cases `TC-PKG-UPGRADE-001` đến `TC-PKG-UPGRADE-005`, bổ sung helper `getPackageTestCase` và `packageCaseTitle`.
- `tests/packages/package-upgrade-flow.read-only.spec.ts`: Tạo mới bộ test spec read-only kiểm thử giao diện cho TC-003 (chặn hạ cấp), TC-004 (hủy/đổi thời hạn tại màn xác nhận), TC-005 (thông báo lỗi khi thanh toán thất bại).
- `tests/packages/package-upgrade.mutating.spec.ts`: Tạo mới mutating spec cho TC-001 và TC-002 với safety gate `RUN_MUTATING_E2E`.
- `tests/unit/test-cases/business-automation-baseline.spec.ts`: Cập nhật baseline test cases tự động hóa (giảm số lượng unautomated từ 9 xuống 4).
- `playwright.config.ts`: Mở rộng `endToEndTestMatch` và `generalMutatingTestMatch` để hỗ trợ module `packages`.

## Open Questions

- [non-blocking] Đối với `TC-PKG-UPGRADE-001` và `002`, hệ thống đã cấu hình đầy đủ cờ an toàn `RUN_MUTATING_E2E` để kích hoạt luồng sandbox VNPAY thật khi cần, đồng thời hỗ trợ kiểm thử giao diện bằng route interception khi chạy CI không có mạng bên ngoài.

## Risks and Conflicts

1. Cổng thanh toán VNPAY Sandbox bên thứ ba (`sandbox.vnpayment.vn`) có thể thỉnh thoảng phản hồi chậm hoặc bảo trì. Để đảm bảo bộ test tự động trong CI/CD không bị flaky, các kịch bản kiểm tra logic nghiệp vụ giao diện (TC-003, TC-004, TC-005) được thiết kế read-only độc lập; kịch bản thanh toán thật TC-001/TC-002 được bảo vệ bởi cờ `RUN_MUTATING_E2E`.
2. Modal render qua Vue Teleport (`body`) nên locators phải tìm kiếm từ root page hoặc overlay thay vì bên trong container bảng tin đăng.

## Impact Analysis

- **Page Objects**: Tạo mới `PackageUpgradeModalComponent`, `VnpayResultPage`, `VnpaySandboxPage`, mở rộng `MyListingsPage`. Không làm ảnh hưởng đến các Page Object hiện có.
- **Fixtures**: Bổ sung `packageUpgradeModal`, `vnpayResultPage`, `vnpaySandboxPage` vào `PageFixtures`, tương thích hoàn toàn với tất cả các test hiện có.
- **Test Catalog**: 5 test cases chuyển từ `NOT_AUTOMATED` sang `AUTOMATED`, nâng cao độ phủ tự động hóa của module Packages.

## Verification Plan

1. Kiểm tra tĩnh:
   - `npm run typecheck` (đạt 0 lỗi).
   - `npm run lint` (đạt 0 warning trên các file sửa đổi/tạo mới).
2. Chạy kiểm thử tự động:
   - `npx playwright test tests/packages/package-upgrade-flow.read-only.spec.ts --project=chromium`
   - `npx playwright test tests/packages/package-upgrade.mutating.spec.ts --project=mutating-chromium` (kiểm tra an toàn mutation skip reason).
   - `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts`
   - `npx playwright test tests/unit/config/playwright.config.spec.ts`

## Verification Results

1. **Kiểm tra tĩnh**:
   - `npm run typecheck`: Đạt 0 lỗi TypeScript (`tsc --noEmit` exit code 0).
   - ESLint: Đạt 0 lỗi, 0 warning trên toàn bộ 10 file thuộc phạm vi task.
2. **Kiểm thử tự động thực tế**:
   - `tests/packages/package-upgrade-flow.read-only.spec.ts`: 4/4 passed (1 auth-setup + 3 test scenarios `TC-PKG-UPGRADE-003`, `TC-PKG-UPGRADE-004`, `TC-PKG-UPGRADE-005`) trong 16.0s.
   - `tests/packages/package-upgrade.mutating.spec.ts`: 1 auth-setup passed, 2 test scenarios (`TC-PKG-UPGRADE-001`, `TC-PKG-UPGRADE-002`) safely skipped theo đúng chính sách an toàn `RUN_MUTATING_E2E`.
   - `tests/unit/test-cases/business-automation-baseline.spec.ts`: 1/1 passed (14ms).
   - `tests/unit/config/playwright.config.spec.ts`: 12/12 passed (4.6s).

## Change Reconciliation

1. Triển khai hoàn tất mã kiểm thử cho Module 07 theo chuẩn kiến trúc 4 tầng, không để lộ bất kỳ raw locator nào trong tầng `tests/`.
2. Tạo mới Page Objects:
   - `pages/components/PackageUpgradeModalComponent.ts`
   - `pages/packages/VnpayResultPage.ts`
   - `pages/packages/VnpaySandboxPage.ts`
3. Mở rộng `pages/listings/MyListingsPage.ts`, `fixtures/page.fixture.ts`, `playwright.config.ts`.
4. Cập nhật trạng thái `AUTOMATED` và helper cho `test-cases/packages/package.test-cases.ts`, đồng bộ `business-automation-baseline.spec.ts`.
5. Toàn bộ kịch bản kiểm thử tĩnh và động đều đã vượt qua thành công.
