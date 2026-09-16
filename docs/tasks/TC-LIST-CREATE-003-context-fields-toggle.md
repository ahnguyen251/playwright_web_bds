---
ticket: TC-LIST-CREATE-003
topic: context-fields-toggle
template-version: 1.1
status: completed
phase: completed
memory-version: 8
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-10
---

# TC-LIST-CREATE-003 - context-fields-toggle

## Objective

Tự động hóa kịch bản kiểm thử `TC-LIST-CREATE-003`: Xác thực logic giao diện ngữ cảnh (UI Context Logic) khi chuyển đổi qua lại giữa loại giao dịch "Mua bán" và "Cho thuê" trên form Tạo tin đăng (`/post-listing`). Kiểm tra các trường đặc thù được ẩn/hiện chính xác (nhãn giá thay đổi giữa "Giá bán" và "Giá thuê", trường đặt cọc "Đặt cọc" xuất hiện khi cho thuê và biến mất khi bán, trường "Giấy tờ pháp lý" hiện diện khi bán).

## Current Understanding

- Test case `TC-LIST-CREATE-003` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện mang trạng thái `NOT_AUTOMATED`.
- Đường dẫn form Tạo tin đăng là `/post-listing` (`ROUTES.postListing`), yêu cầu người dùng đã đăng nhập (sử dụng `defaultStorageState` từ `auth-setup`).
- Form Tạo tin đăng có mục "Nhu cầu của bạn *" gồm hai lựa chọn: "Mua bán" và "Cho thuê".
  - Mặc định khi tải trang, "Mua bán" được chọn sẵn.
  - Trường giá mang nhãn "Giá bán *".
  - Trường "Giấy tờ pháp lý" hiển thị để chọn loại giấy tờ.
  - Các trường dành riêng cho thuê như "Đặt cọc", "Thời gian thuê tối thiểu", "Kỳ thanh toán" không hiển thị trong DOM.
- Khi bấm chọn "Cho thuê":
  - Nhãn trường giá đổi thành "Giá thuê *".
  - Khu vực "Đặt cọc" (với các tùy chọn: Không, 1 tháng, 3 tháng, 6 tháng, 1 năm) xuất hiện.
  - Các trường thuê khác ("Thời gian thuê tối thiểu", "Kỳ thanh toán") xuất hiện.
- Khi bấm chuyển lại về "Mua bán":
  - Nhãn trường giá đổi lại thành "Giá bán *".
  - Khu vực "Đặt cọc" và các trường thuê biến mất khỏi DOM.
  - Trường "Giấy tờ pháp lý" tiếp tục hiển thị.

## Requirements

1. Điều hướng đến form Tạo tin đăng `/post-listing` với phiên đăng nhập hợp lệ.
2. Kiểm tra trạng thái mặc định "Mua bán":
   - Nhãn trường giá hiển thị "Giá bán".
   - Trường "Giấy tờ pháp lý" hiển thị.
   - Khu vực "Đặt cọc" / "Tiền cọc" không hiển thị.
3. Chuyển đổi loại giao dịch sang "Cho thuê":
   - Nhãn trường giá đổi thành "Giá thuê".
   - Khu vực "Đặt cọc" hiển thị.
4. Chuyển đổi loại giao dịch trở lại "Mua bán":
   - Nhãn trường giá đổi về "Giá bán".
   - Khu vực "Đặt cọc" bị ẩn/biến mất khỏi giao diện.
   - Trường "Giấy tờ pháp lý" hiển thị.
5. Kịch bản kiểm thử là read-only (chỉ tương tác chuyển tab/nút giao diện, không submit form).

## Verified Findings

- **DOM Elements thực tế trên `https://propifyy.duckdns.org/post-listing`**:
  - Lựa chọn giao dịch: Nằm trong cụm nhãn `Nhu cầu của bạn *`, là các thẻ `<button>` dạng pill:
    - Nút "Mua bán": `<button class="...">Mua bán</button>`
    - Nút "Cho thuê": `<button class="...">Cho thuê</button>`
    - Nút đang được chọn có class: `border-sky-300 text-sky-700 font-semibold bg-white`.
  - Trường giá:
    - Khi "Mua bán": `<label class="...price-field...">Giá bán <span class="text-red-500">*</span></label>`
    - Khi "Cho thuê": `<label class="...price-field...">Giá thuê <span class="text-red-500">*</span></label>`
  - Khu vực Đặt cọc:
    - Khi "Cho thuê": xuất hiện khối nhãn `<label class="...">Đặt cọc</label>` cùng các nút lựa chọn (`Không`, `1 tháng`, `3 tháng`, `6 tháng`, `1 năm`).
    - Khi "Mua bán": khối nhãn "Đặt cọc" hoàn toàn không có trong DOM (count = 0).
  - Trường Pháp lý:
    - Nhãn `<label class="...">Giấy tờ pháp lý</label>` và dropdown trigger `<button class="input mt-1 custom-select-trigger"><span>Chọn giấy tờ pháp lý</span>...</button>`.
    - Hiển thị đầy đủ trong trạng thái "Mua bán".
- **Page Objects hiện có**:
  - `pages/components/ListingFormComponent.ts` đã có logic bấm nút `'Mua bán'` / `'Cho thuê'` trong hàm `fill()`.
  - Cần bổ sung các phương thức nghiệp vụ trực tiếp trên `ListingFormComponent` và `CreateListingPage`:
    - `selectTransactionType(type: 'sale' | 'rent'): Promise<void>`
    - `priceLabel(): Promise<string>`
    - `isDepositVisible(): Promise<boolean>`
    - `isLegalVisible(): Promise<boolean>`

## Confirmed Decisions

- Tuân thủ quy tắc 4 lớp: File test không chứa bất kỳ raw locator nào (`getByRole`, `locator`, ...). Mọi truy vấn DOM đều được đóng gói trong `ListingFormComponent` và ủy quyền qua `CreateListingPage`.
- Test case là read-only, đặt trong file `tests/listings/create-listing.validation.read-only.spec.ts` để gộp chung nhóm kiểm thử validation/giao diện trước khi submit của form tạo tin.
- Sử dụng assertion tự động retry của Playwright (`expect.poll()` hoặc kiểm tra trạng thái hiển thị) để xử lý quá trình re-render của React khi chuyển đổi loại giao dịch.
- Đăng ký `TC-LIST-CREATE-003` vào `test-cases/listings/listing.test-cases.ts` với `status: AUTOMATED` và cập nhật baseline test run tương ứng.

## Constraints

- Không dùng `page.waitForTimeout()` hoặc sleep tĩnh.
- Không submit form, không gây đột biến dữ liệu trên production.
- Không sửa mã nguồn trước khi được người dùng phê duyệt (`implementation-approved: true`).

## Out of Scope

- Kiểm thử nhập liệu chi tiết và submit tin đăng thành công (thuộc `TC-LIST-CREATE-001`, `TC-LIST-CREATE-002`).
- Kiểm thử validation bỏ trống hoặc định dạng sai các trường khác (thuộc các test case khác).

## Proposed Implementation

1. **Page Object & Component Layer**:
   - `pages/components/ListingFormComponent.ts`:
     - Bổ sung locator cho nút giao dịch (`saleTransactionButton`, `rentTransactionButton`), nhãn giá (`priceLabelElement`), vùng đặt cọc (`depositSection`), vùng pháp lý (`legalSection`).
     - Bổ sung methods: `selectTransactionType(type: 'sale' | 'rent')`, `priceLabel()`, `isDepositVisible()`, `isLegalVisible()`.
   - `pages/listings/CreateListingPage.ts`:
     - Bổ sung delegate methods tương ứng để test gọi trực tiếp qua fixture `createListingPage`.
2. **Test Spec Layer**:
   - Trong `tests/listings/create-listing.validation.read-only.spec.ts`:
     - Bổ sung test scenario cho `TC-LIST-CREATE-003`:
       - Mở `/post-listing`.
       - Xác nhận mặc định: Giá bán, Pháp lý hiển thị, Đặt cọc ẩn.
       - Chọn "Cho thuê", xác nhận: Giá thuê, Đặt cọc hiển thị.
       - Chọn lại "Mua bán", xác nhận: Giá bán, Đặt cọc ẩn, Pháp lý hiển thị.
3. **Registry & Unit Test Baselines**:
   - Cập nhật `TC-LIST-CREATE-003` trong `test-cases/listings/listing.test-cases.ts` sang `AUTOMATED`.
   - Cập nhật baseline count trong `tests/unit/test-cases/business-automation-baseline.spec.ts` (thêm ID, giảm backlog còn 46) và `tests/unit/reporters/business-run-aggregation.spec.ts` (37 automated, 46 backlog).

## Expected File Changes

- `pages/components/ListingFormComponent.ts` (thêm locator và methods hỗ trợ toggle loại giao dịch và đọc trạng thái trường)
- `pages/listings/CreateListingPage.ts` (thêm delegate methods)
- `tests/listings/create-listing.validation.read-only.spec.ts` (bổ sung test case `TC-LIST-CREATE-003`)
- `test-cases/listings/listing.test-cases.ts` (cập nhật metadata `automation`)
- `tests/unit/test-cases/business-automation-baseline.spec.ts` (cập nhật danh sách automated IDs và số lượng backlog)
- `tests/unit/reporters/business-run-aggregation.spec.ts` (cập nhật automated total = 37, backlog total = 46)

## Open Questions

- None

## Risks and Conflicts

- Khi chuyển đổi tab giao dịch trên React, các thành phần UI có thể render mất vài mili-giây. Cần sử dụng auto-retrying assertions (`expect.poll` hoặc web-first assertions) để tránh hiện tượng flaky.

## Impact Analysis

- **Tuân thủ kiến trúc**: Đảm bảo 4 lớp nghiêm ngặt, không rò rỉ locator vào tầng test.
- **Tương thích ngược**: Các phương thức thêm mới vào `ListingFormComponent` và `CreateListingPage` chỉ mở rộng khả năng truy vấn trạng thái trường, không làm ảnh hưởng đến các kịch bản tạo tin đăng hiện có (`TC-LIST-CREATE-001`, `002`, `011`).
- **An toàn môi trường**: Hoàn toàn an toàn cho môi trường production, không tạo tin đăng thật.

## Verification Plan

- Chạy spec kiểm thử:
  `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`
- Chạy kiểm thử hồi quy component:
  `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`
- Kiểm tra tính hợp lệ của registry:
  `npx ts-node scripts/validate-test-cases.ts`
- Chạy unit tests baseline:
  `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- Kiểm tra typecheck và lint:
  `npm run typecheck` và `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts`

## Verification Results

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`: 7 passed (bao gồm `auth-setup`, Chromium, Firefox, WebKit cho cả `TC-LIST-CREATE-003` và `TC-LIST-CREATE-011`) [DoD-1, DoD-2, DoD-3].
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`: 9 passed (không gây hồi quy cho các tính năng form tạo/sửa tin hiện có).
- `npx ts-node scripts/validate-test-cases.ts`: Pass, ghi nhận 37 AUTOMATED test cases với `TC-LIST-CREATE-003` được ánh xạ chính xác tới `tests/listings/create-listing.validation.read-only.spec.ts` [DoD-4].
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (cập nhật baseline 37 automated, 46 backlog).
- `npm run typecheck`: Vượt qua với 0 lỗi [DoD-4].
- `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts`: 0 error, 0 warning.

## Change Reconciliation

- Baseline Git commit: `1c395366ceeb9e661cf83536dbef57065ccc5ede`.
- Thay đổi thực tế:
  - `pages/components/ListingFormComponent.ts`: Bổ sung các locator `priceLabelElement`, `depositSection`, `legalSection`; bổ sung các phương thức nghiệp vụ `selectTransactionType`, `priceLabel`, `isDepositVisible`, `isLegalVisible`.
  - `pages/listings/CreateListingPage.ts`: Thêm delegate methods tương ứng (`selectTransactionType`, `priceLabel`, `isDepositVisible`, `isLegalVisible`).
  - `tests/listings/create-listing.validation.read-only.spec.ts`: Bổ sung test scenario cho `TC-LIST-CREATE-003` kiểm tra logic ẩn/hiện trường đặc thù và nhãn giá khi chuyển đổi qua lại giữa Mua bán và Cho thuê.
  - `test-cases/listings/listing.test-cases.ts`: Chuyển `TC-LIST-CREATE-003` sang `AUTOMATED` và gắn đường dẫn file script.
  - `tests/unit/test-cases/business-automation-baseline.spec.ts`: Bổ sung `TC-LIST-CREATE-003` vào baseline và cập nhật số backlog còn lại là 46.
  - `tests/unit/reporters/business-run-aggregation.spec.ts`: Cập nhật baseline kiểm thử sang 37 automated và 46 backlog.

## Acceptance Criteria

- [DoD-1] Khi người dùng chuyển sang loại giao dịch "Cho thuê", nhãn trường giá hiển thị "Giá thuê", và trường/khu vực đặt cọc ("Đặt cọc") xuất hiện trên form.
- [DoD-2] Khi người dùng chuyển lại sang "Mua bán", nhãn trường giá đổi về "Giá bán", khu vực đặt cọc biến mất khỏi form, và trường "Giấy tờ pháp lý" hiển thị trên form.
- [DoD-3] Kịch bản kiểm thử được triển khai trong `tests/listings/create-listing.validation.read-only.spec.ts` tuân thủ nghiêm ngặt mô hình 4 tầng (không chứa raw locator trong spec, toàn bộ tương tác DOM được đóng gói qua `CreateListingPage`).
- [DoD-4] Cập nhật `test-cases/listings/listing.test-cases.ts` chuyển `TC-LIST-CREATE-003` sang `status: 'AUTOMATED'`, cập nhật baseline unit tests, và đảm bảo toàn bộ bộ kiểm thử đơn vị, lint và typecheck vượt qua với 0 lỗi.
