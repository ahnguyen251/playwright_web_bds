---
ticket: TC-LIST-CREATE-006-010
topic: form-validation-rules
template-version: 1.1
status: completed
phase: completed
memory-version: 2
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-12
---

# TC-LIST-CREATE-006-010 - form-validation-rules

## Objective

Tự động hóa nhóm 5 kịch bản kiểm thử quy tắc nghiệp vụ và ràng buộc nhập liệu (Business Rules, Logic & Media Validation) trên form Tạo tin đăng (`/post-listing`), bao gồm:
1. `TC-LIST-CREATE-006`: Chặn Mô tả < 20 ký tự, Diện tích ≤ 0, Giá ≤ 0.
2. `TC-LIST-CREATE-007`: Input Giá bị vô hiệu hóa (disabled) và xóa rỗng khi chọn checkbox "Thương lượng".
3. `TC-LIST-CREATE-008`: Giới hạn tối đa 10 ảnh BĐS, chặn ảnh vượt 3MB hoặc sai định dạng.
4. `TC-LIST-CREATE-009`: Giới hạn tối đa 5 ảnh Giấy tờ pháp lý, chặn file vượt 10MB.
5. `TC-LIST-CREATE-010`: Chặn ký tự đặc biệt, số âm, số thập phân tại các ô nhập số (Số phòng ngủ, Số phòng tắm).

## Current Understanding

- Cả 5 test case từ `TC-LIST-CREATE-006` đến `TC-LIST-CREATE-010` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện đang ở trạng thái `NOT_AUTOMATED`.
- Đường dẫn form Tạo tin đăng là `/post-listing` (`ROUTES.postListing`), yêu cầu người dùng đã đăng nhập hợp lệ (sử dụng session từ `.auth/defaultUser.json`).
- Tất cả 5 kịch bản đều là kiểm tra quy tắc nghiệp vụ và validation giao diện (read-only validation), không kích hoạt tạo tin đăng thật hoặc mutate dữ liệu database production.

## Requirements

1. **TC-LIST-CREATE-006**:
   - Khi nhập Mô tả < 20 ký tự (ví dụ `"Nhà đẹp"`) và blur: Hiển thị lỗi `"Mô tả phải có ít nhất 20 ký tự"`.
   - Khi nhập Diện tích là `"0"` hoặc số âm và blur: Hiển thị lỗi `"Diện tích không hợp lệ hoặc vượt giới hạn"`.
   - Khi nhập Giá là `"0"` và blur: Hiển thị lỗi `"Giá bán phải lớn hơn 999"` (hoặc `"Giá thuê phải lớn hơn 999"`).
2. **TC-LIST-CREATE-007**:
   - Khi đã nhập một số tiền vào trường Giá (ví dụ `"5000000"`), sau đó tích chọn checkbox `"Giá Thương lượng"`:
   - Trường Giá tự động bị xóa về chuỗi rỗng `""`.
   - Trường Giá chuyển sang trạng thái bị vô hiệu hóa (`disabled: true`).
   - Bỏ tích chọn `"Giá Thương lượng"`: Trường Giá được kích hoạt lại (`disabled: false`).
3. **TC-LIST-CREATE-008**:
   - Khi upload ảnh BĐS:
     - Chặn các file ảnh có dung lượng > 3MB với thông báo cảnh báo `"File không hợp lệ đã bị loại bỏ"`.
     - Chặn các file không đúng định dạng ảnh (không phải jpg, jpeg, png).
     - Giới hạn tối đa 10 ảnh: Khi đã có đủ 10 ảnh, hệ thống hiển thị thông báo `"Bạn chỉ có thể tải tối đa 10 hình ảnh"` và không cho phép tải thêm.
4. **TC-LIST-CREATE-009**:
   - Khi upload ảnh Giấy tờ pháp lý trong phần Xác thực BĐS:
     - Giới hạn tối đa 5 ảnh giấy tờ pháp lý (`"Tối đa 5 ảnh giấy tờ pháp lý"`).
     - Chặn các file vượt quá dung lượng 10MB (`"Dung lượng file vượt quá giới hạn"`).
5. **TC-LIST-CREATE-010**:
   - Tại ô nhập số phòng ngủ hoặc số phòng tắm (`input[placeholder="Nhập số"]`):
   - Khi nhập ký tự đặc biệt, số âm (`"-5"`), số thập phân (`"2.5"`), hoặc chữ (`"abc"`): Input tự động loại bỏ các ký tự không phải chữ số (`replace(/[^0-9]/g, '')`), chỉ giữ lại số tự nhiên tối đa 2 chữ số (0-99).

## Acceptance Criteria

- [DoD-1] `TC-LIST-CREATE-006`: Khi nhập Mô tả < 20 ký tự, Diện tích ≤ 0, hoặc Giá ≤ 0, hệ thống hiển thị đúng thông báo lỗi validation tương ứng bên dưới từng trường.
- [DoD-2] `TC-LIST-CREATE-007`: Khi người dùng chọn "Thương lượng", ô nhập Giá bị xóa giá trị về rỗng và bị vô hiệu hóa (`disabled`); khi bỏ chọn, ô nhập Giá được kích hoạt lại.
- [DoD-3] `TC-LIST-CREATE-008`: Biểu mẫu chặn upload ảnh BĐS vượt quá 10 ảnh, chặn ảnh dung lượng > 3MB hoặc sai định dạng và đưa ra cảnh báo phù hợp.
- [DoD-4] `TC-LIST-CREATE-009`: Biểu mẫu giới hạn upload Giấy tờ pháp lý tối đa 5 ảnh và từ chối các file có dung lượng > 10MB.
- [DoD-5] `TC-LIST-CREATE-010`: Các ô nhập số (Phòng ngủ, Phòng tắm) tự động loại bỏ ký tự âm, dấu thập phân và chữ cái, chỉ chấp nhận số nguyên từ 0 đến 99.
- [DoD-6] Kịch bản kiểm thử được triển khai hoàn chỉnh trong `tests/listings/create-listing.validation.read-only.spec.ts` tuân thủ kiến trúc 4 lớp, không chứa raw locator trong file test.
- [DoD-7] Cập nhật catalog `test-cases/listings/listing.test-cases.ts` chuyển cả 5 test case sang `AUTOMATED`, nâng baseline lên 44 automated và 39 backlog; toàn bộ unit test, typecheck, lint đạt 100%.

## Verified Findings

- **Mã nguồn thực tế trên frontend (`PostForm-CmvwJnk_.js`)**:
  - `description`:
    ```js
    if (e === 'description')
      return !t || !String(t).trim()
        ? 'Mô tả không được để trống'
        : String(t).trim().length < 20
          ? 'Mô tả phải có ít nhất 20 ký tự'
          : '';
    ```
  - `area`:
    ```js
    if (e === 'area') {
      if (!t) return 'Diện tích không hợp lệ hoặc vượt giới hạn';
      let e = Number(t);
      return !Number.isFinite(e) || e <= 0 || e > 1e6
        ? 'Diện tích không hợp lệ hoặc vượt giới hạn'
        : '';
    }
    ```
  - `price`:
    ```js
    if (e === 'price') {
      if (w.isNegotiable) return '';
      if (!t) return `${ds.value} phải lớn hơn 999`;
      let e = Number(fs(t));
      return Number.isFinite(e) ? (e < 1e3 ? `${ds.value} phải lớn hơn 999` : '') : 'Giá không hợp lệ';
    }
    ```
  - `isNegotiable`:
    ```js
    function Tc() { w.isNegotiable && Ec(); }
    function Ec() { w.price = '', delete ke.price; }
    ```
    Checkbox có nhãn "Giá Thương lượng" (`getByLabel(/Giá Thương lượng|Thương lượng/i)`). Khi checked, `price` bị clear và disabled.
  - `bedrooms` / `bathrooms`:
    ```js
    function Sc(e, t) {
      Z(t);
      let n = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
      w[t] = n;
      e.target.value = n;
    }
    ```
    Sự kiện input tự động thanh lọc ký tự với regex `replace(/[^0-9]/g, '').slice(0, 2)`.
  - `images` (Ảnh BĐS):
    - Kiểm tra định dạng: Cho phép `jpg, jpeg, png`.
    - Dung lượng tối đa: 3MB/ảnh.
    - Số lượng tối đa: 10 ảnh (`ha.value = 'Bạn chỉ có thể tải tối đa 10 hình ảnh'`).
  - `legalDocuments` (Giấy tờ pháp lý):
    - Dung lượng tối đa: 10MB/file (`'Dung lượng file vượt quá giới hạn'`).
    - Số lượng tối đa: 5 ảnh (`K.value = 'Tối đa 5 ảnh giấy tờ pháp lý'`).

## Confirmed Decisions

- Gộp 5 test case liên quan trực tiếp đến quy tắc nghiệp vụ nhập liệu và validation trên cùng một trang `/post-listing` vào một kế hoạch thảo luận tập trung để tối ưu hóa thời gian triển khai và kiểm thử.
- Đóng gói toàn bộ các thao tác định vị và tương tác DOM vào `ListingFormComponent` và `CreateListingPage`.
- Đăng ký cả 5 test case vào `test-cases/listings/listing.test-cases.ts` sang trạng thái `AUTOMATED`.
- Cập nhật baseline test runs: 44 automated, 39 backlog.

## Constraints

- Tuyệt đối không dùng `page.waitForTimeout()`; dùng web-first assertions của Playwright (`expect.poll()`, `toBeDisabled()`, `toBeEmpty()`).
- Giữ các bài test ở chế độ read-only, không submit tạo tin trên môi trường production.
- Không sửa mã nguồn trước khi được phê duyệt (`implementation-approved: true`).

## Out of Scope

- Kiểm thử quy trình submit tin thành công và tạo lịch hẹn (thuộc các test case mutating).
- Kiểm thử luồng chỉnh sửa tin đăng đã duyệt (thuộc `TC-LIST-EDIT-*`).

## Proposed Implementation

1. **Page Object Layer**:
   - `pages/components/ListingFormComponent.ts`:
     - Bổ sung/hoàn thiện các phương thức:
       - `fillDescription(desc: string)`, `blurDescription()`, `descriptionError(): Promise<string>`
       - `fillArea(area: string)`, `blurArea()`, `areaError(): Promise<string>`
       - `fillPrice(price: string)`, `blurPrice()`, `priceError(): Promise<string>`
       - `toggleNegotiable(checked?: boolean): Promise<void>`
       - `isPriceDisabled(): Promise<boolean>`
       - `priceInputValue(): Promise<string>`
       - `fillBedroomNumber(val: string): Promise<void>`, `bedroomInputValue(): Promise<string>`
       - `fillBathroomNumber(val: string): Promise<void>`, `bathroomInputValue(): Promise<string>`
       - `uploadImagesWithCheck(filePaths: string[]): Promise<void>`
       - `imageUploadErrorMessage(): Promise<string>`
       - `legalUploadErrorMessage(): Promise<string>`
   - `pages/listings/CreateListingPage.ts`:
     - Bổ sung delegate methods tương ứng.
2. **Test Spec Layer**:
   - Bổ sung 5 kịch bản kiểm thử tương ứng cho `TC-LIST-CREATE-006`, `007`, `008`, `009`, `010` vào `tests/listings/create-listing.validation.read-only.spec.ts`.
3. **Catalog & Baselines**:
   - Cập nhật 5 test case trong `test-cases/listings/listing.test-cases.ts` sang `AUTOMATED`.
   - Cập nhật `tests/unit/test-cases/business-automation-baseline.spec.ts` (thêm 5 ID, backlog = 39).
   - Cập nhật `tests/unit/reporters/business-run-aggregation.spec.ts` (`AutomatedTotal: 44`, `NotAutomatedTotal: 39`, `NotRunVariants: 44`).

## Expected File Changes

- `pages/components/ListingFormComponent.ts`
- `pages/listings/CreateListingPage.ts`
- `tests/listings/create-listing.validation.read-only.spec.ts`
- `test-cases/listings/listing.test-cases.ts`
- `tests/unit/test-cases/business-automation-baseline.spec.ts`
- `tests/unit/reporters/business-run-aggregation.spec.ts`

## Open Questions

- None

## Risks and Conflicts

- Đối với test upload file dung lượng lớn (>30MB, >10MB) và test 10/11 ảnh: Cần tạo sẵn các file buffer/file giả định kích thước phù hợp trong thư mục test data hoặc bộ nhớ đệm mà không làm phình dung lượng git repository.

## Impact Analysis

### Direct Consumers
- `tests/listings/create-listing.validation.read-only.spec.ts`: Sử dụng các phương thức mới trên `CreateListingPage` và `ListingFormComponent` để kiểm thử ràng buộc nhập liệu.

### Shared Fixtures & State Impact
- `fixtures/page.fixture.ts`: Cung cấp instance `createListingPage`. Không thay đổi signature khởi tạo.
- `fixtures/test.fixture.ts`: Sử dụng session người dùng mặc định (`.auth/defaultUser.json`). Không gây đột biến phiên hoặc cookies.

### Risk & Flakiness Assessment
- Rủi ro: Thấp. Toàn bộ upload media sử dụng buffer trong bộ nhớ (in-memory buffer), không sinh file rác vào ổ đĩa và git repository.
- Khả năng flaky: Không. Tất cả các kiểm tra lỗi đều dùng web-first auto-retrying assertions (`expect.poll()`, `toBeDisabled()`, `toBe()`). Không sử dụng hardcoded `page.waitForTimeout()`.

### Conformance Verdict
- Architectural Layering: PASSED (Không có raw locator trong tests/; không có assertions trong Page Objects).
- Locator Reliability: PASSED (Sử dụng nhãn ngữ nghĩa `getByText`, `label`, `p.field-error` chính xác, không dùng CSS utility selector mỏng manh).
- Flakiness Prevention: PASSED (Zero `waitForTimeout()`, toàn bộ trạng thái bất đồng bộ được kiểm tra qua `expect.poll`).
- Mutation Safety: PASSED (Kịch bản thuần read-only UI validation, không kích hoạt đăng tin hoặc làm biến đổi cơ sở dữ liệu production).

## Verification Plan

### Automated Execution Matrix
- **Typecheck**: `npm run typecheck` (tsc --noEmit)
- **Lint**: `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- **Catalog Consistency**: `npx ts-node scripts/validate-test-cases.ts`
- **Unit Baseline Tests**: `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- **Component Tests**: `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`
- **E2E Playwright Read-Only Tests**: `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts` (Across Chromium, Firefox, WebKit)

### Manual Verification
- None (Tất cả kịch bản được tự động hóa hoàn toàn, không yêu cầu xác nhận thủ công OTP hoặc bên thứ ba).

## Verification Results

1. **TypeScript Typecheck**:
   - `npm run typecheck`: Passed với 0 errors (`tsc --noEmit`).
2. **ESLint Static Code Analysis**:
   - `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: Passed với 0 errors, 0 warnings.
3. **Catalog & Test Case Validation**:
   - `npx ts-node scripts/validate-test-cases.ts`: Passed, ghi nhận 44 AUTOMATED, 32 NOT_AUTOMATED, 7 IN_PROGRESS (tổng 83 test cases).
4. **Unit Coverage & Baseline Tests**:
   - `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (100%).
5. **Component Tests**:
   - `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`: 9 passed (100%).
6. **E2E Playwright Read-Only Validation Matrix**:
   - `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`: 28 passed across chromium, firefox, webkit (100%).
   - Cả 5 kịch bản `TC-LIST-CREATE-006`, `TC-LIST-CREATE-007`, `TC-LIST-CREATE-008`, `TC-LIST-CREATE-009`, `TC-LIST-CREATE-010` đều vượt qua toàn bộ assertions, không có flakiness.

## Change Reconciliation

- `pages/components/ListingFormComponent.ts`:
  - Bổ sung locators & methods: `priceError`, `priceValue`, `isPriceDisabled`, `toggleNegotiable`, `isNegotiableChecked`, `isNegotiableDisabled`, `fillBedrooms`, `bedroomsValue`, `fillBathrooms`, `bathroomsValue`, `toastMessage`, `imageSectionError`, `legalSectionError`, `uploadImageBuffers`, `uploadLegalDocumentBuffers`.
  - Chuẩn hóa định vị input Giấy tờ pháp lý dựa trên nhãn đặc thù `Tải lên ảnh chụp rõ nét các mặt của giấy tờ pháp lý`.
- `pages/listings/CreateListingPage.ts`:
  - Bổ sung các phương thức ủy quyền (delegate methods) tương ứng từ `ListingFormComponent`.
- `tests/listings/create-listing.validation.read-only.spec.ts`:
  - Bổ sung 5 test scenarios cho `TC-LIST-CREATE-006` -> `010` tuân thủ kiến trúc 4 lớp, không chứa raw locators, dùng web assertions (`expect.poll()`, `toBeDisabled()`, `toBe()`).
- `test-cases/listings/listing.test-cases.ts`:
  - Cập nhật 5 test cases `TC-LIST-CREATE-006`, `007`, `008`, `009`, `010` sang trạng thái `AUTOMATED` kèm đường dẫn script `tests/listings/create-listing.validation.read-only.spec.ts`.
- `tests/unit/test-cases/business-automation-baseline.spec.ts`:
  - Bổ sung 5 test case IDs vào `expectedAutomatedIds`, cập nhật backlog count kỳ vọng về 39.
- `tests/unit/reporters/business-run-aggregation.spec.ts`:
  - Cập nhật baseline test runner: 44 automated, 39 backlog.
