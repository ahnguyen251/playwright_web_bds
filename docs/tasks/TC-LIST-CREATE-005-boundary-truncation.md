---
ticket: TC-LIST-CREATE-005
topic: boundary-truncation
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-11
---

# TC-LIST-CREATE-005 - boundary-truncation

## Objective

Tự động hóa kịch bản kiểm thử biên `TC-LIST-CREATE-005`: Xác thực logic giới hạn độ dài ký tự và xử lý chuỗi nhập liệu (Boundary Truncation & Trimming) trên form Tạo tin đăng (`/post-listing`) đối với trường Tiêu đề ("Tên bất động sản") và trường Họ tên người liên hệ khi paste chuỗi vượt giới hạn hoặc chứa khoảng trắng thừa.

## Current Understanding

- Test case `TC-LIST-CREATE-005` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện có trạng thái `NOT_AUTOMATED`.
- Đường dẫn form Tạo tin đăng là `/post-listing` (`ROUTES.postListing`), yêu cầu người dùng đã đăng nhập hợp lệ.
- Đặc tả kiểm thử yêu cầu:
  - **Tiêu đề**: Paste 140 ký tự (giới hạn 120 ký tự) -> Biểu mẫu tự động cắt chuỗi còn tối đa 120 ký tự.
  - **Họ tên người liên hệ**: Paste 65 ký tự (kèm khoảng trắng thừa đầu/cuối) -> Biểu mẫu tự động loại bỏ khoảng trắng thừa đầu/cuối (trim).
- Đây là kịch bản kiểm thử biên giao diện người dùng (read-only boundary validation), không gửi dữ liệu mutate lên hệ thống.

## Requirements

1. Điều hướng người dùng đã xác thực đến `/post-listing`.
2. Kiểm tra trường Tiêu đề:
   - Paste hoặc nhập chuỗi 140 ký tự vào ô Tiêu đề (`Tên bất động sản`).
   - Xác nhận giá trị thực tế trong input bị giới hạn/cắt còn tối đa 120 ký tự.
   - Xác nhận bộ đếm ký tự hiển thị `120/120 ký tự`.
3. Kiểm tra trường Họ tên người liên hệ:
   - Nhập/paste chuỗi có khoảng trắng thừa đầu và cuối (ví dụ: `'   Nguyen Van A   '`).
   - Rời tiêu điểm (blur) khỏi ô nhập liệu.
   - Xác nhận giá trị trong input tự động được trim sạch khoảng trắng thừa đầu/cuối (thành `'Nguyen Van A'`).
4. Kịch bản được tổ chức theo kiến trúc 4 lớp, không chứa raw locator trong file test.

## Acceptance Criteria

- [DoD-1] Khi người dùng paste hoặc nhập chuỗi 140 ký tự vào ô Tiêu đề ("Tên bất động sản"), hệ thống tự động cắt chuỗi và giới hạn độ dài đúng 120 ký tự (với bộ đếm hiển thị 120/120 ký tự).
- [DoD-2] Khi người dùng paste hoặc nhập chuỗi Họ tên người liên hệ có chứa khoảng trắng thừa ở đầu/cuối, hệ thống tự động loại bỏ khoảng trắng (trim) khi rời tiêu điểm (blur).
- [DoD-3] Kịch bản kiểm thử được triển khai trong `tests/listings/create-listing.validation.read-only.spec.ts` tuân thủ nghiêm ngặt mô hình kiến trúc 4 tầng, không chứa raw locator trong file test.
- [DoD-4] Cập nhật `listing.test-cases.ts` chuyển `TC-LIST-CREATE-005` sang trạng thái `AUTOMATED`, cập nhật unit test baselines (39 automated, 44 backlog), và toàn bộ unit test, typecheck, lint vượt qua 100%.

## Verified Findings

- **DOM Elements trên form `/post-listing`**:
  - Tiêu đề (`title`):
    - Input: `<input class="input mt-1" maxlength="120" placeholder="Nhập tên bất động sản">`.
    - Bộ đếm: `<p class="...">.../120 ký tự</p>`.
    - Thuộc tính `maxlength="120"` được quy định trực tiếp trên thẻ input và trong bundle Vue (`PostForm-CmvwJnk_.js` dòng 84727: `maxlength: '120'`). Khi nhập hoặc paste 140 ký tự, giá trị trong input tự động bị cắt còn đúng 120 ký tự.
  - Họ tên người liên hệ (`contactName`):
    - Input: `<input class="input mt-1" placeholder="Nhập họ tên">`.
    - Trong bundle Vue (`PostForm-CmvwJnk_.js` dòng 68164): Sự kiện `onBlur` kích hoạt hàm `yc('contactName')` -> gọi hàm `_c(val)` với logic `String(val).replace(/\s+/g, ' ').trim()`.
    - Đã xác thực thực tế: Khi nhập `'   Nguyen Van A   '` và blur, giá trị input tự động chuyển thành `'Nguyen Van A'` (đã trim sạch khoảng trắng đầu/cuối và chuẩn hóa khoảng cách giữa các từ).
    - Khác biệt so với tài liệu (Discrepancy): Input Họ tên trên UI thực tế không có thuộc tính `maxlength="50"`, do đó nếu nhập 65 ký tự không có khoảng trắng thì UI vẫn giữ nguyên 65 ký tự mà không tự cắt còn 50.
- **Page Objects hiện có**:
  - `pages/components/ListingFormComponent.ts` đã có `titleInput` và `contactNameInput`.
  - Cần bổ sung các phương thức tiện ích:
    - `titleValue(): Promise<string>`
    - `fillContactName(name: string): Promise<void>`
    - `blurContactName(): Promise<void>`
    - `contactNameValue(): Promise<string>`
  - `pages/listings/CreateListingPage.ts`: Bổ sung delegate methods tương ứng.
- **Tổ chức thư mục kiểm thử**:
  - Tích hợp kịch bản `TC-LIST-CREATE-005` vào `tests/listings/create-listing.validation.read-only.spec.ts`.

## Confirmed Decisions

- Tuân thủ kiến trúc 4 tầng: Toàn bộ tương tác DOM được đóng gói trong `CreateListingPage` và `ListingFormComponent`.
- Kiểm thử hành vi biên Tiêu đề (maxlength 120) và logic trim khoảng trắng thừa của Họ tên người liên hệ khi blur.
- Đăng ký `TC-LIST-CREATE-005` vào catalog `test-cases/listings/listing.test-cases.ts` với `status: AUTOMATED`.
- Cập nhật baseline test runs: 39 automated, 44 backlog (tổng 83 test cases).

## Constraints

- Không dùng `page.waitForTimeout()` hoặc sleep tĩnh; sử dụng `expect.poll()` và assertions tự động retry.
- Kịch bản kiểm thử là read-only, không kích hoạt đăng tin hoặc mutate dữ liệu database.
- Không chỉnh sửa mã nguồn cho đến khi thảo luận được phê duyệt (`implementation-approved: true`).

## Out of Scope

- Kiểm thử các trường số âm, số thập phân phòng ngủ/phòng tắm (thuộc `TC-LIST-CREATE-010`).
- Kiểm thử validation trường Giá/Mô tả (thuộc `TC-LIST-CREATE-006`, `007`).

## Proposed Implementation

1. **Page Object Layer**:
   - `pages/components/ListingFormComponent.ts`: Bổ sung `titleValue()`, `fillContactName(name)`, `blurContactName()`, `contactNameValue()`.
   - `pages/listings/CreateListingPage.ts`: Bổ sung delegate methods tương ứng.
2. **Test Spec Layer**:
   - `tests/listings/create-listing.validation.read-only.spec.ts`: Bổ sung test scenario cho `TC-LIST-CREATE-005`:
     - Paste chuỗi 140 ký tự vào Tiêu đề -> Assert `titleValue()` có độ dài 120 ký tự.
     - Điền chuỗi kèm khoảng trắng thừa vào Họ tên (`'   Nguyen Van A   '`) -> Blur -> Assert `contactNameValue()` bằng `'Nguyen Van A'`.
3. **Catalog & Baselines**:
   - `test-cases/listings/listing.test-cases.ts`: Cập nhật `TC-LIST-CREATE-005` thành `AUTOMATED`.
   - `tests/unit/test-cases/business-automation-baseline.spec.ts`: Thêm `TC-LIST-CREATE-005`, cập nhật backlog 44.
   - `tests/unit/reporters/business-run-aggregation.spec.ts`: Cập nhật `AutomatedTotal: 39`, `NotAutomatedTotal: 44`, `NotRunVariants: 39`.

## Expected File Changes

- `pages/components/ListingFormComponent.ts` (thêm phương thức đọc giá trị tiêu đề, điền/blur/đọc giá trị họ tên)
- `pages/listings/CreateListingPage.ts` (thêm delegate methods)
- `tests/listings/create-listing.validation.read-only.spec.ts` (thêm kịch bản test `TC-LIST-CREATE-005`)
- `test-cases/listings/listing.test-cases.ts` (cập nhật metadata `automation`)
- `tests/unit/test-cases/business-automation-baseline.spec.ts` (cập nhật danh sách automated IDs và backlog)
- `tests/unit/reporters/business-run-aggregation.spec.ts` (cập nhật số lượng automated = 39, backlog = 44)

## Open Questions

- [non-blocking] Đối với trường Họ tên người liên hệ: Tài liệu ghi nhận kỳ vọng "tự động cắt còn 50 ký tự, loại bỏ khoảng trắng đầu/cuối". Tuy nhiên mã nguồn UI thực tế chỉ thực hiện loại bỏ khoảng trắng đầu/cuối (`trim`) và chưa cấu hình giới hạn 50 ký tự trên frontend. Bạn có đồng ý kịch bản kiểm thử sẽ tập trung xác thực hành vi cắt 120 ký tự của Tiêu đề và hành vi trim khoảng trắng của Họ tên liên hệ?

## Risks and Conflicts

- Trường Họ tên liên hệ trên thực tế được tự động điền thông tin từ tài khoản đăng nhập khi người dùng bấm "Dùng thông tin tài khoản" hoặc khi mở form lần đầu. Test cần chủ động gọi `fillContactName()` để ghi đè giá trị test.

## Impact Analysis

- **Tuân thủ kiến trúc 4 lớp**:
  - `tests/`: Kịch bản `TC-LIST-CREATE-005` trong `tests/listings/create-listing.validation.read-only.spec.ts` tương tác thuần túy qua fixture `createListingPage`, không chứa bất kỳ raw locator nào (`page.locator`, `page.getByRole`, etc.).
  - `pages/` & `pages/components/`: `CreateListingPage` và `ListingFormComponent` đóng gói toàn bộ locators và state inquiry (`titleValue`, `titleCounterText`, `contactNameValue`). Không import hay gọi assertion `@playwright/test`.
  - `fixtures/`: Sử dụng fixture chuẩn từ `fixtures/test.fixture.ts`.
- **An toàn chống flaky (Anti-flakiness)**:
  - Tuyệt đối không dùng `page.waitForTimeout()` hoặc sleep tĩnh.
  - Sử dụng `createListingPage.open()` đảm bảo trang và biểu mẫu đã hydrate đầy đủ trước khi thao tác (`waitForReady()`).
  - Sử dụng `expect.poll()` kết hợp `expect(...).toBe(...)` cho việc kiểm tra giá trị cắt ký tự và trim khoảng trắng sau khi blur.
- **Tính an toàn mutation & CI**:
  - Kịch bản kiểm thử là read-only, chỉ kiểm tra hành vi boundary và input trimming ngay trên giao diện người dùng, không kích hoạt đăng tin thành công hay mutate dữ liệu database trên môi trường production.
  - Hoàn toàn an toàn để chạy song song hoặc đưa vào bộ test hồi quy `@regression`, `@listings`.
- **Tương thích ngược**:
  - Toàn bộ 9/9 component test cases hiện có trong `ListingFormComponent.spec.ts` tiếp tục vượt qua ổn định 100%.

## Verification Plan

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`
- `npx ts-node scripts/validate-test-cases.ts`
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- `npm run typecheck`
- `npm run lint`

## Verification Results

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`: 13 passed across Chromium, Firefox, WebKit (bao gồm `TC-LIST-CREATE-005`, `TC-LIST-CREATE-004`, `TC-LIST-CREATE-003`, `TC-LIST-CREATE-011`) [DoD-1, DoD-2, DoD-3].
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`: 9 passed (không gây hồi quy cho các component test hiện có).
- `npx ts-node scripts/validate-test-cases.ts`: Passed, ghi nhận 39 AUTOMATED test cases với `TC-LIST-CREATE-005` được ánh xạ chính xác [DoD-4].
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (cập nhật baseline 39 automated, 44 backlog) [DoD-4].
- `npm run typecheck`: Vượt qua với 0 lỗi [DoD-4].
- `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts`: 0 error, 0 warning [DoD-4].

## Change Reconciliation

- Baseline Git commit: `1c395366ceeb9e661cf83536dbef57065ccc5ede`.
- Thay đổi thực tế:
  - `pages/components/ListingFormComponent.ts`:
    - Bổ sung `titleValue()`, `titleCounterText()`, `fillContactName(name)`, `blurContactName()`, `contactNameValue()`.
  - `pages/listings/CreateListingPage.ts`:
    - Bổ sung delegate methods: `titleValue`, `titleCounterText`, `fillContactName`, `blurContactName`, `contactNameValue`.
  - `tests/listings/create-listing.validation.read-only.spec.ts`:
    - Bổ sung kịch bản kiểm thử cho `TC-LIST-CREATE-005`:
      1. Paste chuỗi 140 ký tự vào Tiêu đề -> Xác nhận cắt còn đúng 120 ký tự và bộ đếm hiển thị `120/120`.
      2. Nhập chuỗi có khoảng trắng thừa đầu/cuối vào Họ tên liên hệ -> Blur -> Xác nhận giá trị tự động được trim sạch.
  - `test-cases/listings/listing.test-cases.ts`:
    - Chuyển `TC-LIST-CREATE-005` sang trạng thái `AUTOMATED` với `scriptPath: tests/listings/create-listing.validation.read-only.spec.ts`.
  - `tests/unit/test-cases/business-automation-baseline.spec.ts`:
    - Thêm `'TC-LIST-CREATE-005'` vào `expectedAutomatedIds`, cập nhật backlog còn 44.
  - `tests/unit/reporters/business-run-aggregation.spec.ts`:
    - Cập nhật `AutomatedTotal` thành 39, `NotAutomatedTotal` thành 44, `NotRunVariants` thành 39.
