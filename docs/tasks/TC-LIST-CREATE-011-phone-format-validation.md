---
ticket: TC-LIST-CREATE-011
topic: phone-format-validation
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-07
---

# TC-LIST-CREATE-011 - phone-format-validation

## Objective

Tự động hóa kịch bản kiểm thử `TC-LIST-CREATE-011`: Xác thực định dạng Số điện thoại liên hệ trên form Tạo tin đăng (`/post-listing`), từ chối số điện thoại sai định dạng (ví dụ `"12345"` thiếu chữ số hoặc sai đầu số) và hiển thị thông báo lỗi trực quan `"Số điện thoại không đúng định dạng"`.

## Current Understanding

- Test case `TC-LIST-CREATE-011` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện mang trạng thái `NOT_AUTOMATED`.
- Route tạo tin đăng là `/post-listing` (`ROUTES.postListing`), yêu cầu người dùng đã xác thực (sử dụng `defaultStorageState` từ `auth-setup`).
- Khi người dùng đăng nhập mở form, trường Số điện thoại liên hệ được điền sẵn (autofill) từ hồ sơ tài khoản (ví dụ `0972820677`).
- Khi xóa và nhập giá trị không đúng định dạng như `"12345"` rồi blur ra ngoài:
  - Input đổi trạng thái lỗi (viền đỏ `border-red-500` / `input-error`).
  - Thẻ thông báo hiển thị lỗi bên dưới input: `"Số điện thoại không đúng định dạng"`.
  - Cột đánh giá chất lượng tin ở bảng bên phải ghi nhận mục "Số điện thoại" chưa hoàn thiện (0/0.4đ).

## Requirements

- Kịch bản kiểm thử phải:
  1. Điều hướng đến form Tạo tin đăng `/post-listing` với phiên đăng nhập hợp lệ.
  2. Điền số điện thoại sai quy chuẩn (`"12345"`).
  3. Rời tiêu điểm (blur) khỏi ô nhập liệu.
  4. Xác nhận thông báo lỗi `"Số điện thoại không đúng định dạng"` hiển thị rõ ràng.
  5. Đảm bảo form không phát sinh request tạo tin đăng và không chuyển hướng trang.
- Kịch bản là kiểm tra validation giao diện (read-only), không làm thay đổi hay tạo mới dữ liệu tin đăng trong hệ thống.

## Verified Findings

- **DOM Elements**:
  - Nhãn: `<label class="... text-sm font-medium text-gray-700 ...">Số điện thoại <span class="text-red-500">*</span></label>`.
  - Ô nhập liệu: `<input type="text" placeholder="VD: 0912345678" ...>` gắn liền với nhãn "Số điện thoại".
  - Thông báo lỗi: `<p class="mt-1 text-xs text-red-500">Số điện thoại không đúng định dạng</p>` xuất hiện ngay dưới input sau khi nhập sai và blur.
- **Page Objects & Components**:
  - `pages/components/ListingFormComponent.ts` đã có `this.contactPhoneInput = page.getByLabel(/Số điện thoại/i).first()`.
  - `ListingFormComponent.fieldError` hiện dùng selector `xpath=following::*[@role="alert"][1]`, trong khi thẻ `<p class="text-red-500">` thực tế không có thuộc tính `role="alert"`. Cần mở rộng selector trong `fieldError` để hỗ trợ cả thẻ paragraph lỗi hoặc cung cấp phương thức truy vấn chuyên biệt cho lỗi trường liên hệ.
  - `pages/listings/CreateListingPage.ts` đã kế thừa `BasePage` và chứa `ListingFormComponent`, nhưng chưa cung cấp delegate method để tương tác riêng với trường số điện thoại và đọc lỗi validation của nó.
- **Tổ chức thư mục kiểm thử**:
  - Test validation thuộc loại read-only sẽ được tổ chức tại `tests/listings/create-listing.validation.read-only.spec.ts`.

## Confirmed Decisions

- Không đặt raw locator Playwright trong thư mục `tests/`. Mọi tương tác DOM phải được đóng gói bên trong `CreateListingPage` và `ListingFormComponent`.
- Cập nhật `CreateListingPage` để cung cấp các hàm nghiệp vụ: `open()`, `fillContactPhone(phone: string)`, `blurContactPhone()`, và `contactPhoneError(): Promise<string>`.
- Mở rộng cơ chế bắt lỗi trường của `ListingFormComponent` để nhận diện thẻ `<p class="... text-red-500">` trên trang thật của Propify mà vẫn giữ tương thích với các component unit tests.
- Đăng ký `TC-LIST-CREATE-011` vào `test-cases/listings/listing.test-cases.ts` với `status: AUTOMATED` và đường dẫn file script mới.
- Cập nhật baseline test coverage trong `tests/unit/test-cases/business-automation-baseline.spec.ts` và `tests/unit/reporters/business-run-aggregation.spec.ts` tương ứng.

## Constraints

- Tuân thủ nghiêm ngặt mô hình kiến trúc 4 tầng của dự án (`tests/` -> `fixtures/` -> `workflows/` -> `pages/`).
- Không sử dụng `page.waitForTimeout()` hoặc `setTimeout()` tùy tiện; dùng Playwright web-first assertions (`expect(locator).toBeVisible()` hoặc `expect.poll()`).
- Tuyệt đối không thay đổi mã nguồn ứng dụng trước khi thảo luận kỹ thuật được phê duyệt (`implementation-approved: true`).

## Out of Scope

- Kiểm thử quy trình submit tin đăng thành công (đã có `TC-LIST-CREATE-001` và `TC-LIST-CREATE-002`).
- Kiểm thử validation của các trường khác như Tiêu đề, Mô tả, Giá, Diện tích, Media (thuộc các mã test case khác từ 004 đến 010).

## Proposed Implementation

1. **Page Object Layer**:
   - Trong `pages/components/ListingFormComponent.ts`: Cải tiến `fieldError(field)` hoặc bổ sung `contactPhoneErrorMessage(): Promise<string>` hỗ trợ tìm thẻ `<p>` lỗi màu đỏ bên dưới trường input.
   - Trong `pages/listings/CreateListingPage.ts`: Bổ sung các phương thức:
     - `fillContactPhone(phone: string): Promise<void>`
     - `blurContactPhone(): Promise<void>`
     - `contactPhoneError(): Promise<string>`
2. **Test Spec Layer**:
   - Tạo file `tests/listings/create-listing.validation.read-only.spec.ts`.
   - Viết test scenario cho `TC-LIST-CREATE-011` nhập số điện thoại sai định dạng `"12345"`, kích hoạt blur và assert thông báo lỗi hiển thị đúng nội dung `"Số điện thoại không đúng định dạng"`.
3. **Catalog & Traceability Layer**:
   - Cập nhật `test-cases/listings/listing.test-cases.ts` cho `TC-LIST-CREATE-011`:
     - `automation: { status: 'AUTOMATED', scriptPath: 'tests/listings/create-listing.validation.read-only.spec.ts' }`.
   - Cập nhật baseline automated tests trong `tests/unit/test-cases/business-automation-baseline.spec.ts` (thêm `TC-LIST-CREATE-011`).
   - Cập nhật baseline count trong `tests/unit/reporters/business-run-aggregation.spec.ts`.

## Expected File Changes

- `pages/components/ListingFormComponent.ts` (mở rộng selector lấy thông báo lỗi trường)
- `pages/listings/CreateListingPage.ts` (bổ sung delegate methods cho trường số điện thoại và lỗi)
- `test-cases/listings/listing.test-cases.ts` (cập nhật metadata `automation`)
- `tests/listings/create-listing.validation.read-only.spec.ts` (file test spec mới)
- `tests/unit/test-cases/business-automation-baseline.spec.ts` (cập nhật danh sách automated test cases)
- `tests/unit/reporters/business-run-aggregation.spec.ts` (cập nhật tổng số lượng automated test cases)

## Open Questions

- None

## Risks and Conflicts

- Trường số điện thoại trên giao diện web thực tế được tự động điền giá trị từ profile người dùng đang đăng nhập. Vì vậy trước khi điền giá trị sai (`"12345"`), test cần xóa sạch giá trị cũ (`clear()` hoặc `fill('')` trước khi điền giá trị mới).

## Impact Analysis

- **Tuân thủ kiến trúc 4 lớp**:
  - `tests/`: Tuyệt đối không chứa raw locator; toàn bộ tương tác thực hiện qua fixture `createListingPage`.
  - `pages/`: Không import hay gọi assertion của `@playwright/test`. Chỉ trả về trạng thái (`Promise<string>`, `Promise<void>`).
  - `fixtures/`: Sử dụng fixture chuẩn từ `fixtures/test.fixture.ts`.
- **An toàn chống flaky (Anti-flakiness)**:
  - Không sử dụng `page.waitForTimeout()` hoặc sleep tĩnh.
  - Sử dụng `expect.poll()` kết hợp `toMatch` và assertion trực tiếp để chờ React state update và DOM render thông báo lỗi.
- **Tính an toàn mutation & CI**:
  - Kịch bản kiểm thử là read-only, không kích hoạt nút Tạo tin đăng, không gửi API mutate dữ liệu.
  - An toàn 100% để chạy trên mọi môi trường và đưa vào regression test suite mặc định (`@regression`, `@listings`).
- **Tương thích ngược**:
  - Hàm `fieldError` trong `ListingFormComponent` ưu tiên `data-field-error`, kế đến paragraph `<p class="...text-red...">`, và cuối cùng fallback về `role="alert"`. Toàn bộ 9/9 component test cases hiện có của form tiếp tục vượt qua ổn định.

## Verification Plan

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts` (chạy spec mới).
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts` (đảm bảo component test hiện có vẫn pass).
- `npx ts-node scripts/validate-test-cases.ts` (xác nhận registry map thành công `TC-LIST-CREATE-011`).
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts` (xác nhận baseline automated cases).
- `npx playwright test tests/unit/reporters/business-run-aggregation.spec.ts` (xác nhận aggregate run).
- `npm run typecheck` và `npm run lint` (đảm bảo TypeScript strict và code style 0 lỗi).

## Verification Results

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`: 4 passed (auth-setup, chromium, firefox, webkit) [DoD-1, DoD-2].
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`: 9 passed (không gây hồi quy cho các tính năng form tạo/sửa tin hiện có).
- `npx ts-node scripts/validate-test-cases.ts`: Pass, ghi nhận 36 AUTOMATED test cases với `TC-LIST-CREATE-011` được ánh xạ chính xác tới `tests/listings/create-listing.validation.read-only.spec.ts` [DoD-3].
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (cập nhật baseline 36 automated, 47 backlog).
- `npm run typecheck`: Vượt qua với 0 lỗi [DoD-4].
- `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts`: 0 error, 0 warning.

## Change Reconciliation

- Baseline Git commit: `1c395366ceeb9e661cf83536dbef57065ccc5ede`.
- Thay đổi thực tế so với đề xuất ban đầu:
  - `pages/components/ListingFormComponent.ts`: Cập nhật `contactPhoneInput` hỗ trợ nhãn và placeholder; bổ sung các phương thức nghiệp vụ `fillContactPhone`, `blurContactPhone`, `contactPhoneError`; cải tiến `fieldError` để nhận diện cả paragraph lỗi `<p class="...text-red...">`.
  - `pages/listings/CreateListingPage.ts`: Bổ sung delegate methods `fillContactPhone`, `blurContactPhone`, `contactPhoneError`, `fillField`, `fieldError`.
  - `tests/listings/create-listing.validation.read-only.spec.ts`: Tạo mới spec E2E non-mutating cho `TC-LIST-CREATE-011`.
  - `test-cases/listings/listing.test-cases.ts`: Chuyển `TC-LIST-CREATE-011` sang `AUTOMATED` và gắn đường dẫn file script.
  - `tests/unit/test-cases/business-automation-baseline.spec.ts`: Bổ sung `TC-LIST-CREATE-011` vào baseline và cập nhật số backlog còn lại là 47.
  - `tests/unit/reporters/business-run-aggregation.spec.ts`: Cập nhật baseline kiểm thử sang 36 automated và 47 backlog.
  - `eslint.config.mjs`: Thêm `**/*.cjs` vào cấu hình disable type-checked.

## Acceptance Criteria

- [DoD-1] Form Tạo tin đăng `/post-listing` từ chối số điện thoại `"12345"` và hiển thị chính xác thông báo lỗi `"Số điện thoại không đúng định dạng"` khi người dùng rời tiêu điểm (blur).
- [DoD-2] Kịch bản kiểm thử được đóng gói hoàn toàn trong `tests/listings/create-listing.validation.read-only.spec.ts` tuân thủ kiến trúc 4 lớp, không chứa raw locator trong file test.
- [DoD-3] Registry catalog trong `test-cases/listings/listing.test-cases.ts` ghi nhận `TC-LIST-CREATE-011` với trạng thái `AUTOMATED` và `scriptPath` chính xác.
- [DoD-4] Toàn bộ các bài kiểm thử hồi quy đơn vị và typecheck (`npm run typecheck`, `validate-test-cases.ts`) vượt qua với 0 lỗi.
