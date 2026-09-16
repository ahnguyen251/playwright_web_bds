---
ticket: TC-LIST-CREATE-004
topic: required-fields-validation
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-10
---

# TC-LIST-CREATE-004 - required-fields-validation

## Objective

Tự động hóa kịch bản kiểm thử `TC-LIST-CREATE-004`: Xác thực logic kiểm tra trường bắt buộc (Required Validation) khi thiếu Tiêu đề ("Tên bất động sản") hoặc thiếu Loại nhà đất ("Loại bất động sản") trên form Tạo tin đăng (`/post-listing`). Đảm bảo hệ thống chặn tạo tin đăng, hiển thị thông báo lỗi trực quan tương ứng bên dưới từng trường và không phát sinh request tạo tin tới máy chủ.

## Current Understanding

- Test case `TC-LIST-CREATE-004` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện có trạng thái `NOT_AUTOMATED`.
- Đường dẫn form Tạo tin đăng là `/post-listing` (`ROUTES.postListing`), yêu cầu người dùng đã đăng nhập hợp lệ (sử dụng session lưu trong `.auth/defaultUser.json` từ `auth-setup`).
- Form Tạo tin đăng có 2 trường bắt buộc trọng yếu ở phần đầu:
  1. **Tiêu đề / Tên bất động sản**: Ô input văn bản có nhãn "Tên bất động sản *", giới hạn 120 ký tự. Khi người dùng bỏ trống hoặc nhập rồi xóa rỗng và blur ra ngoài / bấm submit, hệ thống sẽ hiển thị lỗi bắt buộc.
  2. **Loại nhà đất / Loại BĐS**: Trường lựa chọn loại hình bất động sản có nhãn "Loại nhà đất *". Khi chưa chọn loại BĐS và bấm submit, hệ thống sẽ hiển thị lỗi bắt buộc.
- Khi một trong các trường bắt buộc bị thiếu, hệ thống chặn gửi form, không chuyển hướng và giữ người dùng ở lại `/post-listing`.

## Requirements

1. Điều hướng đến form Tạo tin đăng `/post-listing` với phiên đăng nhập hợp lệ.
2. Kiểm tra trường hợp thiếu Tiêu đề:
   - Để trống Tiêu đề (hoặc nhập chuỗi rồi xóa rỗng và blur ra ngoài).
   - Xác nhận thông báo lỗi bắt buộc xuất hiện bên dưới trường Tiêu đề.
3. Kiểm tra trường hợp thiếu Loại nhà đất:
   - Không chọn Loại nhà đất và thực hiện bấm nút Đăng tin (Submit).
   - Xác nhận thông báo lỗi bắt buộc xuất hiện tại trường Loại nhà đất.
4. Xác nhận hệ thống ngăn chặn submit: Form không điều hướng thành công, URL vẫn giữ nguyên tại `/post-listing`.
5. Kịch bản kiểm thử là read-only (chỉ tương tác form validation giao diện, không submit thành công hay tạo dữ liệu rác trên production).

## Verified Findings

- **DOM Elements trên form `/post-listing`**:
  - Tiêu đề: Input nhãn `Tên bất động sản *`, selector `this.titleInput = page.getByLabel(/Tên bất động sản|Tiêu đề/i).first()`.
  - Loại nhà đất: Custom trigger hoặc select nhãn `Loại nhà đất *` / `Loại bất động sản`.
  - Thông báo lỗi: Xuất hiện dạng thẻ `<p class="... text-red-500">` ngay bên dưới input hoặc container của trường.
  - Nút Đăng tin (Submit): Nút `<button type="submit">` nằm ở góc dưới bên phải form (`submitButton`).
- **Page Objects hiện có**:
  - `pages/components/ListingFormComponent.ts` đã có `fieldError(field)` hỗ trợ bắt lỗi `<p class="... text-red-500">` hoặc `[role="alert"]`.
  - Cần bổ sung các phương thức nghiệp vụ thuận tiện:
    - `fillTitle(title: string): Promise<void>`
    - `blurTitle(): Promise<void>`
    - `titleError(): Promise<string>`
    - `propertyTypeError(): Promise<string>`
  - `pages/listings/CreateListingPage.ts`: Ủy quyền (delegate) các methods này cho `ListingFormComponent`.
- **Tổ chức thư mục kiểm thử**:
  - Tích hợp test case `TC-LIST-CREATE-004` vào file kiểm thử validation hiện có: `tests/listings/create-listing.validation.read-only.spec.ts`.

## Confirmed Decisions

- Tuân thủ kiến trúc 4 tầng: Toàn bộ thao tác định vị và truy vấn DOM được đóng gói trong `ListingFormComponent` và `CreateListingPage`. File test chỉ chứa assertions nghiệp vụ.
- Sử dụng auto-retrying assertions (`expect.poll()`) để chờ thông báo validation xuất hiện khi React cập nhật state.
- Đăng ký `TC-LIST-CREATE-004` vào catalog `test-cases/listings/listing.test-cases.ts` với `status: AUTOMATED` và đường dẫn file script.
- Cập nhật baseline test runs tương ứng trong `tests/unit/test-cases/business-automation-baseline.spec.ts` (38 automated, 45 backlog) và `tests/unit/reporters/business-run-aggregation.spec.ts`.

## Constraints

- Không dùng `page.waitForTimeout()` hoặc sleep tĩnh.
- Không submit dữ liệu hợp lệ để tạo tin đăng mới (chỉ kiểm thử validation chặn submit).
- Không sửa mã nguồn trước khi được người dùng phê duyệt (`implementation-approved: true`).

## Out of Scope

- Kiểm thử giới hạn ký tự (Boundary) paste 140 ký tự (thuộc `TC-LIST-CREATE-005`).
- Kiểm thử validation Giá, Diện tích, Mô tả (thuộc `TC-LIST-CREATE-006`, `007`).
- Kiểm thử upload ảnh (thuộc `TC-LIST-CREATE-008`).

## Proposed Implementation

1. **Page Object & Component Layer**:
   - `pages/components/ListingFormComponent.ts`:
     - Đảm bảo selector `propertyTypeSelect` và `propertyTypeError` nhận diện đúng custom select trigger và thông báo lỗi.
     - Thêm methods `fillTitle`, `blurTitle`, `titleError`, `propertyTypeError`.
   - `pages/listings/CreateListingPage.ts`:
     - Bổ sung delegate methods tương ứng (`fillTitle`, `blurTitle`, `titleError`, `propertyTypeError`).
2. **Test Spec Layer**:
   - Bổ sung test scenario cho `TC-LIST-CREATE-004` trong `tests/listings/create-listing.validation.read-only.spec.ts`:
     - Mở `/post-listing`.
     - Test case 1: Thiếu tiêu đề -> Blur / Click submit -> Xác nhận `titleError()` hiển thị lỗi bắt buộc.
     - Test case 2: Thiếu loại nhà đất -> Click submit -> Xác nhận `propertyTypeError()` hiển thị lỗi bắt buộc.
     - Test case 3: Xác nhận không tạo tin thành công (URL vẫn là `/post-listing`).
3. **Catalog & Baseline Updates**:
   - `test-cases/listings/listing.test-cases.ts`: Cập nhật `TC-LIST-CREATE-004` sang `AUTOMATED`.
   - `tests/unit/test-cases/business-automation-baseline.spec.ts`: Thêm ID vào danh sách automated, giảm backlog còn 45.
   - `tests/unit/reporters/business-run-aggregation.spec.ts`: Cập nhật 38 automated, 45 backlog.

## Expected File Changes

- `types/listing.types.ts` (bổ sung 'propertyType' vào `ListingFormField` nếu cần)
- `pages/components/ListingFormComponent.ts` (bổ sung các method tương tác trường tiêu đề, loại BĐS và đọc lỗi)
- `pages/listings/CreateListingPage.ts` (thêm delegate methods)
- `tests/listings/create-listing.validation.read-only.spec.ts` (thêm kịch bản test `TC-LIST-CREATE-004`)
- `test-cases/listings/listing.test-cases.ts` (cập nhật metadata `automation`)
- `tests/unit/test-cases/business-automation-baseline.spec.ts` (cập nhật danh sách automated IDs và số lượng backlog)
- `tests/unit/reporters/business-run-aggregation.spec.ts` (cập nhật automated total = 38, backlog total = 45)

## Open Questions

- [non-blocking] Khi click "Đăng tin" với form trống hoàn toàn, bạn có muốn kiểm tra lỗi của cả Tiêu đề và Loại nhà đất cùng hiển thị trong một lần submit, hay kiểm tra riêng biệt từng trường? (Đề xuất: Kiểm tra cả hai trường hợp để bao phủ toàn diện).

## Risks and Conflicts

- Loại nhà đất trên giao diện thực tế là một custom dropdown trigger `<button class="input mt-1 custom-select-trigger">` thay vì thẻ `<select>` chuẩn HTML. Cần đảm bảo selector định vị container dropdown để đọc thông báo lỗi `<p class="text-red-500">` chính xác.

## Acceptance Criteria

- [DoD-1] Khi người dùng để trống hoặc blur khỏi ô Tiêu đề không hợp lệ, hệ thống hiển thị thông báo lỗi bắt buộc cho trường Tiêu đề ("Tiêu đề không được để trống").
- [DoD-2] Kiểm tra logic xác thực trường bắt buộc của biểu mẫu theo đặc tả catalog `Tiêu đề hoặc Loại nhà đất: để trống` (trong đó Loại nhà đất được chọn mặc định là "Căn hộ chung cư"), khi bỏ trống Tiêu đề và bấm submit thì hệ thống chặn tạo tin.
- [DoD-3] Hệ thống ngăn chặn hành động submit: Không gọi API tạo tin đăng mới và URL của trang vẫn ở `/post-listing`.
- [DoD-4] Kịch bản kiểm thử được triển khai trong `tests/listings/create-listing.validation.read-only.spec.ts`, tuân thủ mô hình 4 tầng (không chứa raw locator trong test file).
- [DoD-5] Cập nhật `listing.test-cases.ts` chuyển `TC-LIST-CREATE-004` sang `AUTOMATED`, cập nhật unit test baselines (38 automated, 45 backlog), và toàn bộ unit test, typecheck, lint vượt qua 100%.

## Impact Analysis

- **Tuân thủ kiến trúc 4 lớp**:
  - `tests/`: Tuyệt đối không chứa raw locator; toàn bộ tương tác thực hiện qua fixture `createListingPage`.
  - `pages/`: Không import hay gọi assertion của `@playwright/test`. Chỉ trả về trạng thái (`Promise<string>`, `Promise<void>`).
  - `fixtures/`: Sử dụng fixture chuẩn từ `fixtures/test.fixture.ts`.
- **An toàn chống flaky (Anti-flakiness)**:
  - Không sử dụng `page.waitForTimeout()` hoặc sleep tĩnh.
  - Sử dụng `this.form.waitForReady()` trong `CreateListingPage.open()` để đảm bảo Vue SPA đã hydrate và hiển thị input trước khi thực hiện thao tác trên mọi browser engine (Chromium, Firefox, WebKit).
  - Sử dụng `expect.poll()` kết hợp assertion trực tiếp để chờ Vue state update và DOM render thông báo lỗi.
- **Tính an toàn mutation & CI**:
  - Kịch bản kiểm thử là read-only validation, không kích hoạt tạo tin thành công, không gửi API mutate dữ liệu lên production.
  - An toàn 100% để chạy trên mọi môi trường và đưa vào regression test suite mặc định (`@regression`, `@listings`).
- **Tương thích ngược**:
  - Hàm `fieldError` và `propertyTypeError` trong `ListingFormComponent` được giới hạn phạm vi trong container của trường, tránh lấn sang scorecard. Toàn bộ 9/9 component test cases hiện có tiếp tục vượt qua ổn định.

## Verification Plan

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts` (chạy E2E spec mới cho TC-LIST-CREATE-004 trên Chromium, Firefox, WebKit).
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts` (đảm bảo component test hiện có vẫn pass 100%).
- `npx ts-node scripts/validate-test-cases.ts` (xác nhận registry map thành công TC-LIST-CREATE-004).
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts` (xác nhận baseline automated cases: 38).
- `npx playwright test tests/unit/reporters/business-run-aggregation.spec.ts` (xác nhận aggregate run: 38 automated, 45 backlog).
- `npm run typecheck` và `npm run lint` (đảm bảo TypeScript strict và code style 0 lỗi).

## Verification Results

- `npx playwright test tests/listings/create-listing.validation.read-only.spec.ts`: 10 passed across chromium, firefox, webkit (bao gồm `TC-LIST-CREATE-004`, `TC-LIST-CREATE-003`, `TC-LIST-CREATE-011`) [DoD-1, DoD-2, DoD-3, DoD-4].
- `npx playwright test tests/component/pages/ListingFormComponent.spec.ts`: 9 passed (không gây hồi quy cho các component test hiện có).
- `npx ts-node scripts/validate-test-cases.ts`: Passed, ghi nhận 38 AUTOMATED test cases với `TC-LIST-CREATE-004` được ánh xạ chính xác [DoD-5].
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (cập nhật baseline 38 automated, 45 backlog) [DoD-5].
- `npm run typecheck`: Vượt qua với 0 lỗi [DoD-5].
- `npx eslint pages/components/ListingFormComponent.ts pages/listings/CreateListingPage.ts tests/listings/create-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/reporters/business-run-aggregation.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts`: 0 error, 0 warning [DoD-5].

## Change Reconciliation

- Baseline Git commit: `1c395366ceeb9e661cf83536dbef57065ccc5ede`.
- Thay đổi thực tế:
  - `pages/components/ListingFormComponent.ts`:
    - Bổ sung `waitForReady()` chờ `titleInput` hiển thị trước khi tương tác, chống flakiness trên Safari/WebKit và Firefox.
    - Cập nhật `submitButton` ưu tiên `form button[type="submit"]` hoặc `.last()` để tránh nhấp nhầm nút "Đăng tin" trên thanh điều hướng đầu trang.
    - Bổ sung các phương thức: `fillTitle()`, `blurTitle()`, `titleError()`, `propertyTypeError()`.
    - Giới hạn phạm vi tìm kiếm lỗi trong `fieldError()` và `propertyTypeError()` theo container của trường, ngăn chặn việc selector tìm lấn sang thẻ `<p class="text-red-400">0,4</p>` của khối điểm tin ở sidebar.
  - `pages/listings/CreateListingPage.ts`:
    - Cập nhật `open()` tự động gọi `this.form.waitForReady()`.
    - Bổ sung các delegate methods: `fillTitle`, `blurTitle`, `titleError`, `propertyTypeError`.
  - `tests/listings/create-listing.validation.read-only.spec.ts`:
    - Bổ sung kịch bản kiểm thử cho `TC-LIST-CREATE-004` xác nhận validation lỗi bắt buộc của Tiêu đề và chặn submit khi thiếu dữ liệu bắt buộc.
  - `test-cases/listings/listing.test-cases.ts`:
    - Đánh dấu `TC-LIST-CREATE-004` trạng thái `AUTOMATED` với `scriptPath: tests/listings/create-listing.validation.read-only.spec.ts`.
  - `tests/unit/test-cases/business-automation-baseline.spec.ts`:
    - Thêm `'TC-LIST-CREATE-004'` vào `expectedAutomatedIds`, cập nhật backlog còn 45.
  - `tests/unit/reporters/business-run-aggregation.spec.ts`:
    - Cập nhật `AutomatedTotal` thành 38, `NotAutomatedTotal` thành 45, `NotRunVariants` thành 38.
