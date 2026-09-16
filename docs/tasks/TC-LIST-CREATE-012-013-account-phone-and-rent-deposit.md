---
ticket: TC-LIST-CREATE-012-013
topic: account-phone-and-rent-deposit
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-13
---

# TC-LIST-CREATE-012-013 - account-phone-and-rent-deposit

## Objective

Tự động hóa 2 kịch bản kiểm thử nghiệp vụ cho luồng Đăng tin (`/post-listing`):
1. `TC-LIST-CREATE-012`: [Business Rule] Chặn tạo tin khi tài khoản chưa cập nhật số điện thoại trong hồ sơ (yêu cầu bổ sung SĐT qua trang `/profile?require=phone` trước khi tiếp tục).
2. `TC-LIST-CREATE-013`: [Required Validation / Khác biệt tài liệu] Xác minh hành vi thực tế của trường "Đặt cọc" khi chọn loại hình "Cho thuê" (kiểm tra tính hiện diện, danh sách tùy chọn, trạng thái tùy chọn không bắt buộc theo thiết kế thực tế của hệ thống).

## Current Understanding

- Cả 2 test case `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện đang ở trạng thái `NOT_AUTOMATED`.
- Với `TC-LIST-CREATE-012`:
  - Khi người dùng đã đăng nhập nhưng tài khoản chưa có số điện thoại (ví dụ tài khoản Google OAuth mới hoặc profile thiếu SĐT):
  - Khi nhấn nút "Đăng tin" trên thanh điều hướng (Header Navigation):
    - Hàm điều hướng frontend (`y()` trong `index-Cg0ltatH.js`) kiểm tra `!a.user?.phone`.
    - Hệ thống chặn chuyển hướng sang `/post-listing`, tự động chuyển hướng người dùng sang trang `/profile?require=phone`.
    - Tại trang Profile, hệ thống tự động kích hoạt chế độ chỉnh sửa thông tin cá nhân, cuộn và đặt con trỏ focus vào ô nhập số điện thoại (`input#phone`), gắn viền cảnh báo màu hổ phách (`border-amber-400 ring-[3px] ring-amber-100`).
    - Nếu người dùng bấm "Lưu thay đổi" khi chưa nhập số điện thoại: Hệ thống hiển thị thông báo lỗi `"Vui lòng nhập số điện thoại để tiếp tục đăng tin."` và không cho phép sang bước đăng tin.
    - Trường hợp người dùng cố tình truy cập trực tiếp URL `/post-listing`: Trong form Tạo tin, ô "Số điện thoại" bị để trống (do hồ sơ không có SĐT), trường này mang nhãn bắt buộc (`field-label required`). Nếu người dùng nhấn "Đăng tin", hệ thống chặn gọi API submit và hiển thị thông báo yêu cầu bổ sung số điện thoại.
- Với `TC-LIST-CREATE-013`:
  - Tài liệu `Propify_Playwright_TestCase_Unified.md` (dòng 112) ghi nhận cờ cảnh báo: `⚠ Khác biệt tài liệu`.
  - Kiểm tra mã nguồn thực tế (`PostForm-CmvwJnk_.js`):
    - Khi chọn loại hình "Cho thuê" (`demandType = 'RENT'`), cụm trường thuê xuất hiện: "Thời gian cho thuê", "Kỳ thanh toán", và "Đặt cọc".
    - Trường "Đặt cọc" hiển thị dạng các nút chọn (pill buttons): `Không`, `1 tháng`, `3 tháng`, `6 tháng`, `1 năm`.
    - Trường "Đặt cọc" mang nhãn `field-label` thông thường, **không có** class `required` (không có dấu sao đỏ `*`).
    - Trong hàm kiểm tra submit `$(e)` và danh sách trường bắt buộc `Vc`, trường `rentDeposit` **không** bị bắt buộc điền và không có thông báo lỗi chặn submit khi để trống. Thay vào đó, "Đặt cọc" là trường thuộc tính chất lượng (đạt +0.05đ điểm tin đăng khi được chọn).

## Requirements

1. **TC-LIST-CREATE-012**:
   - Khởi tạo ngữ cảnh kiểm thử người dùng thiếu số điện thoại trong profile (thông qua route interceptor `**/api/v1/auth/me` trả về `phone: null`).
   - Từ trang chủ (`/`), nhấn nút "Đăng tin" trên Header.
   - Xác nhận hệ thống chặn điều hướng đến `/post-listing` và chuyển hướng đến `/profile?require=phone`.
   - Xác nhận ô nhập liệu số điện thoại (`#phone`) trên trang Profile hiển thị và được tự động focus.
   - Khi bấm nút "Lưu thay đổi" mà chưa điền SĐT: Xác nhận hệ thống hiển thị thông báo lỗi `"Vui lòng nhập số điện thoại để tiếp tục đăng tin."`.
2. **TC-LIST-CREATE-013**:
   - Truy cập form Tạo tin đăng `/post-listing` với tài khoản đã đăng nhập.
   - Chuyển loại hình giao dịch sang "Cho thuê".
   - Xác nhận khối trường "Đặt cọc" hiển thị với đầy đủ các nút lựa chọn: `Không`, `1 tháng`, `3 tháng`, `6 tháng`, `1 năm`.
   - Xác nhận nhãn "Đặt cọc" là trường tùy chọn (không chứa class `required` và không có dấu `*`).
   - Xác nhận khi để trống trường "Đặt cọc" và tương tác trên form, hệ thống không phát sinh thông báo lỗi bắt buộc cho trường Đặt cọc.

## Acceptance Criteria

- [DoD-1] `TC-LIST-CREATE-012`: Khi tài khoản chưa cập nhật số điện thoại, nhấn "Đăng tin" trên Header sẽ bị chặn điều hướng đến form đăng tin và được chuyển hướng chính xác đến `/profile?require=phone` với ô nhập SĐT được kích hoạt và focus.
- [DoD-2] `TC-LIST-CREATE-012`: Nhấn lưu hồ sơ khi chưa nhập số điện thoại trong chế độ `require=phone` sẽ hiển thị thông báo lỗi `"Vui lòng nhập số điện thoại để tiếp tục đăng tin."`.
- [DoD-3] `TC-LIST-CREATE-013`: Khi chọn loại hình "Cho thuê", khối "Đặt cọc" hiển thị đầy đủ các nút lựa chọn (`Không`, `1 tháng`, `3 tháng`, `6 tháng`, `1 năm`), mang nhãn không bắt buộc (không có class `required`).
- [DoD-4] `TC-LIST-CREATE-013`: Để trống trường "Đặt cọc" không sinh lỗi validation bắt buộc trên giao diện, phản ánh đúng thiết kế hiện tại của hệ thống (`⚠ Khác biệt tài liệu`).
- [DoD-5] Các kịch bản kiểm thử được triển khai tuân thủ nghiêm ngặt kiến trúc 4 lớp, đóng gói locators vào Page Objects (`AppHeaderComponent`, `ProfilePage`, `ListingFormComponent`), không chứa raw locators trong test spec.
- [DoD-6] Cập nhật catalog `test-cases/listings/listing.test-cases.ts` chuyển `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` sang `AUTOMATED`, nâng baseline lên 46 automated và 37 backlog; kiểm tra typecheck và lint đạt 100%.

## Verified Findings

- **Header Navigation & Route Guard (`index-Cg0ltatH.js` dòng 14495)**:
  ```javascript
  function y() {
    if (!a.isAuthenticated) {
      _.value = true;
      return;
    }
    if (!a.user?.phone) {
      s.push({ name: 'Profile', query: { require: 'phone' } });
      return;
    }
    s.push('/post-listing');
  }
  ```
- **Profile Component Behavior (`Profile-BMELtOec.js` dòng 66220-66435 & 67217-67482)**:
  - Khi `route.query.require === 'phone' && !user.phone`:
    - `tt.value = true` (requirePhoneMode)
    - `X.value = true` (isEditing)
    - `phoneInputRef.value.focus()` (Focus vào ô `#phone`)
    - Class của `#phone`: `border-amber-400 ring-[3px] ring-amber-100`
  - Khi bấm nút `Lưu thay đổi` (`yo()`):
    - Kiểm tra `if (tt.value && !Z.phone.trim())`:
      - Thông báo lỗi: `po.value = 'Vui lòng nhập số điện thoại để tiếp tục đăng tin.'`
      - Dừng thao tác, không submit API.
- **Deposit Field in PostForm (`PostForm-CmvwJnk_.js` dòng 89888)**:
  - Template:
    ```javascript
    _('div', null, [
      t[82] || = _('p', { class: 'field-label' }, 'Đặt cọc', -1),
      _('div', an, [...buttons...])
    ])
    ```
  - Danh sách giá trị tùy chọn: `Không`, `1 tháng`, `3 tháng`, `6 tháng`, `1 năm`.
  - Không có class `required`, không có thẻ `<p class="field-error">`, không nằm trong danh sách trường bắt buộc `Vc`.

## Confirmed Decisions

- Sử dụng cơ chế intercept mạng Playwright (`page.route('**/api/v1/auth/me', ...)`) để giả lập tài khoản đã đăng nhập nhưng chưa có SĐT (`phone: null`), đảm bảo kiểm thử hoàn toàn độc lập, an toàn và lặp lại được mà không làm biến đổi tài khoản thật trên cơ sở dữ liệu production.
- Đóng gói thao tác nhấn "Đăng tin" trên Header vào Page Object `AppHeaderComponent` hoặc `HeaderComponent`.
- Bổ sung Page Object hoặc phương thức kiểm tra trên `ProfilePage` (`pages/profile/ProfilePage.ts` hoặc component tương ứng) để kiểm tra trạng thái focus của ô số điện thoại và thông báo lỗi.
- Đóng gói các phương thức kiểm tra trường "Đặt cọc" vào `ListingFormComponent` và `CreateListingPage`.
- Tổ chức test spec vào `tests/listings/create-listing.validation.read-only.spec.ts`.

## Constraints

- Không làm biến đổi dữ liệu production (`@mutating` không áp dụng, các test thuần read-only / route-intercept UI validation).
- Không sử dụng `page.waitForTimeout()`; sử dụng web-first assertions của Playwright (`expect.poll()`, `toBeVisible()`, `toBeFocused()`).
- Tuyệt đối không viết raw locators trong file test `tests/`.

## Out of Scope

- Kiểm thử luồng nhập số điện thoại hợp lệ và bấm lưu thật vào DB (thuộc suite profile mutation).
- Kiểm thử luồng đăng tin thành công loại hình cho thuê (thuộc `TC-LIST-CREATE-002` mutating).

## Proposed Implementation

1. **Page Object Layer**:
   - `pages/components/AppHeaderComponent.ts`: Cung cấp/hoàn thiện phương thức `clickPostListing()`.
   - `pages/profile/ProfilePage.ts`: Cung cấp các phương thức:
     - `isPhoneInputFocused(): Promise<boolean>`
     - `phoneValidationMessage(): Promise<string>`
     - `clickSaveProfile(): Promise<void>`
   - `pages/components/ListingFormComponent.ts`: Bổ sung các phương thức:
     - `depositOptions(): Promise<string[]>`
     - `isDepositRequired(): Promise<boolean>`
     - `selectDeposit(option: string): Promise<void>`
   - `pages/listings/CreateListingPage.ts`: Ủy quyền (delegate) các phương thức tương ứng.
2. **Test Spec Layer**:
   - Bổ sung 2 test scenarios cho `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` vào `tests/listings/create-listing.validation.read-only.spec.ts`.
3. **Catalog & Baselines**:
   - Đăng ký `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` sang `AUTOMATED` trong `test-cases/listings/listing.test-cases.ts`.
   - Cập nhật baseline test runs: 46 automated, 37 backlog.

## Expected File Changes

- `pages/components/AppHeaderComponent.ts` (hoặc `pages/components/HeaderComponent.ts`)
- `pages/profile/ProfilePage.ts`
- `pages/components/ListingFormComponent.ts`
- `pages/listings/CreateListingPage.ts`
- `tests/listings/create-listing.validation.read-only.spec.ts`
- `test-cases/listings/listing.test-cases.ts`
- `tests/unit/test-cases/business-automation-baseline.spec.ts`
- `tests/unit/reporters/business-run-aggregation.spec.ts`

## Open Questions

- [non-blocking] Đối với TC-LIST-CREATE-013, tài liệu gốc đánh dấu "⚠ Khác biệt tài liệu". Trong code frontend thực tế, trường "Đặt cọc" được thiết kế là tùy chọn (optional, +0.05đ chất lượng tin) với các nút chọn (Không, 1 tháng, 3 tháng, 6 tháng, 1 năm), không có class required và không chặn submit. Test spec sẽ kiểm tra tính hiện diện, danh sách các nút tùy chọn Đặt cọc và xác nhận không có class bắt buộc/chặn submit.

## Risks and Conflicts

- Khi intercept route `/api/v1/auth/me`, cần đảm bảo chỉ chỉnh sửa trường `phone: null` trong JSON phản hồi mà không làm ảnh hưởng đến token, cookies hoặc các thuộc tính xác thực khác của phiên làm việc.

## Impact Analysis

### Direct Consumers
- `tests/listings/create-listing.validation.read-only.spec.ts`: Bổ sung 2 test scenario tự động hóa cho `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013`.

### Shared Fixtures & State Impact
- Sử dụng phiên đăng nhập chuẩn từ `.auth/defaultUser.json`. Không làm thay đổi cookies hoặc dữ liệu tài khoản thật.

### Risk & Flakiness Assessment
- Rủi ro flakiness: Rất thấp. Việc điều hướng và hiển thị lỗi trên UI đều được theo dõi qua các auto-retrying web assertions của Playwright.

### Conformance Verdict
- Architectural Layering: Đảm bảo 4 lớp nghiêm ngặt, không có raw locator trong tests/.
- Mutation Safety: Thuần read-only UI verification, an toàn tuyệt đối trên production.

## Verification Plan

### Automated Execution Matrix
- `npm run typecheck`
- `npx eslint pages/ tests/listings/create-listing.validation.read-only.spec.ts`
- `npx ts-node scripts/validate-test-cases.ts`
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts` (cross-browser: Chromium, Firefox, WebKit)

### Manual Verification
- None (Tự động hóa hoàn toàn 100%).

## Verification Results

1. **TypeScript Typecheck**:
   - `npm run typecheck`: Passed với 0 lỗi (`tsc --noEmit`).
2. **ESLint Static Code Analysis**:
   - `npx eslint pages/components/HeaderComponent.ts pages/components/ProfileFormComponent.ts pages/profile/ProfilePage.ts pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: Passed với 0 errors, 0 warnings.
3. **Catalog & Test Case Consistency**:
   - `npx ts-node scripts/validate-test-cases.ts`: Passed, ghi nhận 46 AUTOMATED, 30 NOT_AUTOMATED, 7 IN_PROGRESS (tổng 83 test cases).
4. **Unit Baseline & Reporter Tests**:
   - `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (100%).
5. **E2E Playwright Cross-Browser Matrix**:
   - `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts --project=chromium --project=firefox --project=webkit`: 34/34 passed (100%) across Chromium, Firefox, WebKit.
   - Cả 2 kịch bản `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` đều chạy ổn định và đạt kết quả mong đợi trên cả 3 trình duyệt.

## Change Reconciliation

- `pages/components/HeaderComponent.ts`:
  - Nâng cấp locator `createListingButton` sử dụng `getByRole('button', { name: /Đăng tin/i }).or(getByRole('link', ...))` để đảm bảo định vị chuẩn xác và bền vững.
- `pages/components/ProfileFormComponent.ts`:
  - Bổ sung các phương thức: `isPhoneInputFocused()`, `isPhoneInputVisible()`, `fillPhone()`, `isSaveDisabled()`, `requirePhoneNotice()`, và `phoneValidationAlert()`.
- `pages/profile/ProfilePage.ts`:
  - Bổ sung các phương thức ủy quyền (delegate methods) tương ứng từ `ProfileFormComponent`.
- `pages/components/ListingFormComponent.ts`:
  - Bổ sung các phương thức tương tác và kiểm tra khối "Đặt cọc": `depositContainer`, `depositOptions()`, `isDepositRequired()`, `selectDepositOption()`, `selectedDepositOption()`, `depositError()`.
- `pages/listings/CreateListingPage.ts`:
  - Bổ sung các delegate methods tương ứng cho trường "Đặt cọc".
- `tests/listings/create-listing.validation.read-only.spec.ts`:
  - Bổ sung 2 test scenarios cho `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` tuân thủ kiến trúc 4 lớp, không chứa raw locators, dùng web assertions (`expect.poll()`, `toBeVisible()`, `toBe()`).
- `test-cases/listings/listing.test-cases.ts`:
  - Chuyển `TC-LIST-CREATE-012` và `TC-LIST-CREATE-013` sang `AUTOMATED` kèm đường dẫn kịch bản kiểm thử.
- `tests/unit/test-cases/business-automation-baseline.spec.ts`:
  - Bổ sung 2 test case IDs vào `expectedAutomatedIds`, cập nhật backlog count kỳ vọng về 37.
- `tests/unit/reporters/business-run-aggregation.spec.ts`:
  - Cập nhật baseline test runner: 46 automated, 37 backlog.
