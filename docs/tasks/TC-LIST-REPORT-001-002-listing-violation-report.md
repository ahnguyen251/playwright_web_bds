---
ticket: TC-LIST-REPORT-001-002
topic: listing-violation-report
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-13
---

# TC-LIST-REPORT-001-002 - listing-violation-report

## Objective

Tự động hóa 2 kịch bản kiểm thử nghiệp vụ cho tính năng Báo cáo vi phạm tin đăng trên trang Chi tiết tin đăng (`/listings/:id`):
1. `TC-LIST-REPORT-001`: [Happy Path] Gửi báo cáo vi phạm tin đăng thành công (chọn lý do, nhập mô tả chi tiết, gửi phản ánh thành công, popup tự đóng, hiển thị toast thành công).
2. `TC-LIST-REPORT-002`: Chặn gửi báo cáo khi bỏ trống lý do xác nhận (để trống ô lý do chi tiết trong popup xác nhận, hệ thống chặn gửi, hiển thị thông báo lỗi, không đóng popup).

## Current Understanding

- Cả 2 test case `TC-LIST-REPORT-001` và `TC-LIST-REPORT-002` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện đang ở trạng thái `NOT_AUTOMATED`.
- Cấu trúc giao diện và luồng nghiệp vụ trên trang Chi tiết tin đăng (`Detail-DLgua-e4.js`):
  1. Khối "Báo cáo tin đăng" nằm trong `<section>` với tiêu đề `h2.detail-title` chứa icon và text "Báo cáo tin đăng".
  2. Danh sách 6 lý do định sẵn dạng checkboxes (`input[type="checkbox"][name="listing-report"]`):
     - `WRONG_PRICE`: "Định giá chưa đúng với thực tế"
     - `WRONG_ADDRESS`: "Địa chỉ của BĐS chưa chính xác"
     - `SOLD_OR_RENTED`: "BĐS đã bán/đã thuê/đã sang nhượng"
     - `WRONG_INFORMATION`: "Thông tin chưa chính xác"
     - `UNREACHABLE_OWNER`: "Không liên lạc được với người đăng tin"
     - `DUPLICATE_LISTING`: "Trùng với tin rao khác"
  3. Nút kích hoạt mở popup: `<button type="submit" ...>Gửi phản ánh</button>`. Nút này có trạng thái `disabled` khi người dùng chưa tick chọn bất kỳ checkbox lý do nào (`We.value.length === 0`).
  4. Khi tick ≥ 1 checkbox và nhấn "Gửi phản ánh" (`Ii()`):
     - Nếu chưa đăng nhập: hiển thị toast lỗi `"Vui lòng đăng nhập để gửi phản ánh."` và mở modal đăng nhập.
     - Nếu đã đăng nhập: mở popup xác nhận báo cáo (`div.report-modal-backdrop` chứa `form.report-modal`).
  5. Trong popup xác nhận báo cáo (`form.report-modal`):
     - Tiêu đề: `h2.report-modal-title` ("Báo cáo tin đăng").
     - Tiêu đề phụ: `p.report-modal-subtitle` ("Bạn có chắc chắn muốn báo cáo tin đăng?").
     - Hộp hiển thị danh sách lý do đã chọn: `div.report-reason-box` chứa các dòng `div.report-reason-line`.
     - Trường nhập mô tả bắt buộc: `label.report-detail-field` chứa nhãn `Lý do chi tiết *:` và ô `<textarea maxlength="1000">` (được tự động focus khi mở popup).
     - Khối tải ảnh minh chứng (tùy chọn, tối đa 5 ảnh).
     - Các nút hành động: nút đóng `button.report-modal-close`, nút quay lại `button.report-back-button`, và nút gửi `button[type="submit"].report-submit-button` ("Gửi phản ánh").
  6. Xử lý submit trong popup (`Ui()`):
     - Với `TC-LIST-REPORT-002`: Nếu ô lý do chi tiết rỗng (`!Ke.value.trim()`), hàm dừng lại, hiển thị thông báo lỗi `<p class="report-upload-error">Vui lòng nhập lý do chi tiết.</p>`, popup vẫn mở và không gọi API.
     - Với `TC-LIST-REPORT-001`: Khi nhập mô tả hợp lệ (vd: `"Giá không đúng thực tế, tin ảo"`), hàm gọi API `POST /api/v1/listings/:id/reports` với payload `{ reasons: [...], description: '...', image_urls: [] }`. Khi thành công: hiển thị toast `.toast-item.toast-success` với nội dung `"Cảm ơn bạn đã phản hồi."`, tự động đóng popup, reset form.

## Requirements

1. **TC-LIST-REPORT-001**:
   - Tiền điều kiện: Người dùng đã đăng nhập, đang xem chi tiết một tin đăng hợp lệ.
   - Thao tác:
     1. Chọn ít nhất một lý do vi phạm (ví dụ: "Định giá chưa đúng với thực tế").
     2. Nhấn nút "Gửi phản ánh" bên dưới danh sách lý do để mở popup xác nhận.
     3. Xác nhận popup hiển thị đúng tiêu đề, lý do đã chọn và ô nhập mô tả chi tiết.
     4. Nhập nội dung mô tả chi tiết hợp lệ: `"Giá không đúng thực tế, tin ảo"`.
     5. Nhấn nút "Gửi phản ánh" trong popup.
   - Kết quả kỳ vọng:
     - Gọi đúng endpoint `POST /api/v1/listings/:id/reports` kèm danh sách reasons và description.
     - Popup xác nhận tự động đóng.
     - Hiển thị thông báo toast thành công `"Cảm ơn bạn đã phản hồi."`.
2. **TC-LIST-REPORT-002**:
   - Tiền điều kiện: Người dùng đã mở popup xác nhận báo cáo tin đăng (đã chọn lý do).
   - Thao tác:
     1. Để trống ô nhập lý do chi tiết (chuỗi rỗng `""` hoặc chỉ có khoảng trắng).
     2. Nhấn nút "Gửi phản ánh" trong popup.
   - Kết quả kỳ vọng:
     - Hệ thống chặn gửi request đến máy chủ.
     - Hiển thị thông báo lỗi `"Vui lòng nhập lý do chi tiết."` ngay dưới khối nhập liệu.
     - Popup xác nhận tiếp tục hiển thị, không bị đóng.

## Acceptance Criteria

- [DoD-1] `TC-LIST-REPORT-001`: Người dùng đã đăng nhập có thể chọn lý do báo cáo vi phạm, nhấn "Gửi phản ánh" để mở popup xác nhận báo cáo hiển thị đúng danh sách lý do đã chọn và ô nhập mô tả chi tiết.
- [DoD-2] `TC-LIST-REPORT-001`: Nhập mô tả hợp lệ (vd: "Giá không đúng thực tế, tin ảo") và gửi phản ánh thành công; popup tự động đóng, hiển thị thông báo toast thành công "Cảm ơn bạn đã phản hồi." và gọi đúng API `POST /api/v1/listings/:id/reports` với payload tương ứng.
- [DoD-3] `TC-LIST-REPORT-002`: Khi mở popup xác nhận nhưng để trống ô lý do chi tiết (chuỗi rỗng hoặc chỉ chứa khoảng trắng), nhấn xác nhận sẽ bị hệ thống chặn gửi, hiển thị thông báo lỗi "Vui lòng nhập lý do chi tiết.", popup không đóng và không gửi request đến server.
- [DoD-4] Nút "Gửi phản ánh" trên trang chi tiết bị vô hiệu hóa (disabled) khi người dùng chưa chọn bất kỳ lý do nào trong 6 lý do vi phạm.
- [DoD-5] Đóng gói toàn bộ locators và tương tác của khối Báo cáo tin đăng và Popup xác nhận vào Page Object (`ListingDetailPage` và component `ReportModalComponent`), tuân thủ nghiêm ngặt kiến trúc 4 lớp, không chứa raw locators trong test spec.
- [DoD-6] Cập nhật trạng thái `TC-LIST-REPORT-001` và `TC-LIST-REPORT-002` trong `test-cases/listings/listing.test-cases.ts` sang `AUTOMATED`, cập nhật baseline tests (48 automated, 35 backlog), đạt 100% typecheck và lint.

## Verified Findings

- **Report Section Template & Checkboxes (`Detail-DLgua-e4.js` dòng 200124 & 224190)**:
  - 6 lý do vi phạm định sẵn trong mảng `Si`:
    ```javascript
    Si = [
      { value: 'WRONG_PRICE', label: 'Định giá chưa đúng với thực tế' },
      { value: 'WRONG_ADDRESS', label: 'Địa chỉ của BĐS chưa chính xác' },
      { value: 'SOLD_OR_RENTED', label: 'BĐS đã bán/đã thuê/đã sang nhượng' },
      { value: 'WRONG_INFORMATION', label: 'Thông tin chưa chính xác' },
      { value: 'UNREACHABLE_OWNER', label: 'Không liên lạc được với người đăng tin' },
      { value: 'DUPLICATE_LISTING', label: 'Trùng với tin rao khác' }
    ]
    ```
  - Checkbox element: `<input type="checkbox" name="listing-report" value="..." class="h-3.5 w-3.5 rounded border-slate-300 accent-sky-500">`
  - Nút mở popup: `<button type="submit" ... :disabled="B.value || We.value.length === 0">Gửi phản ánh</button>`
- **Report Modal Dialog Structure (`Detail-DLgua-e4.js` dòng 228288)**:
  - Backdrop: `div.report-modal-backdrop[role="dialog"][aria-modal="true"]`
  - Form modal: `form.report-modal`
  - Tiêu đề: `h2.report-modal-title` ("Báo cáo tin đăng")
  - Phụ đề: `p.report-modal-subtitle` ("Bạn có chắc chắn muốn báo cáo tin đăng?")
  - Hộp lý do: `div.report-reason-box` chứa `div.report-reason-line`
  - Ô nhập chi tiết: `label.report-detail-field textarea[maxlength="1000"]`
  - Khối thông báo lỗi: `p.report-upload-error` (`Xe.value`)
  - Nút đóng: `button.report-modal-close` (`aria-label="Đóng báo cáo"`)
  - Nút quay lại: `button.report-back-button`
  - Nút xác nhận gửi: `button.report-submit-button[type="submit"]`
- **Validation & Submission Logic (`Detail-DLgua-e4.js` dòng 203622)**:
  ```javascript
  async function Ui() {
    if (!Ke.value.trim()) {
      Xe.value = 'Vui lòng nhập lý do chi tiết.';
      return;
    }
    try {
      B.value = true;
      let e = await Hi();
      Ai((await g.report(R.value.id, {
        reasons: We.value,
        description: Ke.value,
        image_urls: e
      })).data?.message || 'Cảm ơn bạn đã phản hồi.', 'success');
      We.value = [];
      Ge.value = false;
      Vi();
    } catch(e) {
      Ai(e.response?.data?.message || 'Hệ thống bận, vui lòng gửi báo cáo sau.', 'error');
    } finally {
      B.value = false;
    }
  }
  ```
- **API Endpoint (`auth-D6razZcL.js`)**:
  - `report(e, t) { return Q.post('/v1/listings/' + e + '/reports', t); }`
  - URL đầy đủ: `POST /api/v1/listings/:id/reports`
  - Toast message container: `div.toast-item.toast-success` với nội dung `"Cảm ơn bạn đã phản hồi."`

## Confirmed Decisions

- **Kiến trúc an toàn dữ liệu (Production Safety Gate)**:
  - Kịch bản `TC-LIST-REPORT-002` là thuần kiểm tra giao diện (validation chặn submit trên client), hoàn toàn không gửi request tới server.
  - Kịch bản `TC-LIST-REPORT-001` (Happy path) sử dụng route interception `page.route('**/api/v1/listings/*/reports', ...)` để giả lập phản hồi thành công từ API (`status: 200`, `{ success: true, message: 'Cảm ơn bạn đã phản hồi.' }`). Cơ chế này đảm bảo:
    - Kiểm tra trọn vẹn luồng tương tác người dùng thực tế (chọn checkbox -> mở modal -> điền mô tả -> submit -> bắt toast thành công -> modal tự đóng -> form reset).
    - Xác thực chính xác payload gửi đi `{ reasons, description, image_urls }`.
    - Tuyệt đối an toàn trên môi trường production, không làm rác danh sách vi phạm hoặc ảnh hưởng đến trạng thái tin đăng thật của người dùng.
- **Tổ chức Page Objects**:
  - Tạo mới component `ReportModalComponent` kế thừa hoặc liên kết với `ListingDetailPage` để đóng gói toàn bộ locators và hành vi của popup báo cáo:
    - `isOpen(): Promise<boolean>`
    - `selectedReasons(): Promise<string[]>`
    - `fillDescription(desc: string): Promise<void>`
    - `submit(): Promise<void>`
    - `close(): Promise<void>`
    - `back(): Promise<void>`
    - `errorMessage(): Promise<string>`
  - Mở rộng `ListingDetailPage`:
    - `selectReportReason(reason: string): Promise<void>`
    - `isReportSubmitEnabled(): Promise<boolean>`
    - `openReportModal(): Promise<void>`
    - `reportModal: ReportModalComponent`
    - `toastMessage(): Promise<string>`
- **Tổ chức Test File**:
  - Tạo file spec mới: `tests/listings/report-listing.validation.read-only.spec.ts`.
  - Sử dụng ngữ cảnh đăng nhập từ `.auth/defaultUser.json` và mở tin đăng khả dụng (`/listings/48` hoặc qua `controlledListing('approved')`).

## Constraints

- Tuân thủ nghiêm ngặt kiến trúc 4 lớp: không đặt raw locators trong file test.
- Không sử dụng `page.waitForTimeout()` hoặc sleep thủ công; sử dụng auto-retrying assertions của Playwright (`toBeVisible()`, `toBeDisabled()`, `toBeHidden()`, `poll()`).
- Giữ nguyên tắc an toàn dữ liệu trên production (`ALLOW_MUTATING_E2E=false`), không tạo rác dữ liệu trên DB thật.

## Out of Scope

- Kiểm thử tính năng upload hình ảnh minh chứng trong báo cáo vi phạm (tùy chọn).
- Kiểm thử luồng xử lý báo cáo từ phía Admin (Admin nằm ngoài phạm vi đồ án).
- Kiểm thử mutate ghi nhận báo cáo thật vào DB production.

## Proposed Implementation

1. **Page Object & Component Layer**:
   - `pages/components/ReportModalComponent.ts`: Đóng gói popup xác nhận báo cáo (`.report-modal`).
   - `pages/listings/ListingDetailPage.ts`: Thêm các phương thức tương tác với khối Báo cáo tin đăng và tích hợp `ReportModalComponent`.
2. **Test Spec Layer**:
   - `tests/listings/report-listing.validation.read-only.spec.ts`:
     - Test 1 (`TC-LIST-REPORT-001`): Chọn lý do, mở popup, nhập mô tả hợp lệ, mock response API và xác minh toast thành công cùng trạng thái đóng popup.
     - Test 2 (`TC-LIST-REPORT-002`): Mở popup, để trống mô tả, nhấn gửi và xác minh thông báo lỗi `"Vui lòng nhập lý do chi tiết."`, kiểm tra popup không đóng.
     - Test 3 (Bổ trợ DoD-4): Xác minh nút "Gửi phản ánh" bị disabled khi chưa chọn lý do nào.
3. **Catalog & Baselines**:
   - Cập nhật `test-cases/listings/listing.test-cases.ts`: chuyển `TC-LIST-REPORT-001` và `TC-LIST-REPORT-002` sang `AUTOMATED`.
   - Cập nhật `tests/unit/test-cases/business-automation-baseline.spec.ts` và `tests/unit/reporters/business-run-aggregation.spec.ts` lên 48 automated và 35 backlog.

## Expected File Changes

- `pages/components/ReportModalComponent.ts` [NEW]
- `pages/listings/ListingDetailPage.ts` [MODIFY]
- `tests/listings/report-listing.validation.read-only.spec.ts` [NEW]
- `test-cases/listings/listing.test-cases.ts` [MODIFY]
- `tests/unit/test-cases/business-automation-baseline.spec.ts` [MODIFY]
- `tests/unit/reporters/business-run-aggregation.spec.ts` [MODIFY]

## Open Questions

- None

## Risks and Conflicts

- Khi mở trang chi tiết `/listings/:id`, cần đảm bảo ID tin đăng tồn tại và thuộc quyền sở hữu của người dùng khác (không phải tin của tài khoản `defaultUser`). Tin đăng ID `48` đã được kiểm chứng hoạt động ổn định và hiển thị đầy đủ khối Báo cáo tin đăng.

## Impact Analysis

### Direct Consumers
- `tests/listings/report-listing.validation.read-only.spec.ts`: Test suite mới cho tính năng báo cáo vi phạm.

### Shared Fixtures & State Impact
- Sử dụng phiên đăng nhập từ `.auth/defaultUser.json`. Không làm thay đổi cookies hay thông tin tài khoản.

### Risk & Flakiness Assessment
- Flakiness rất thấp nhờ web-first assertions của Playwright và route interception mock API deterministic.

### Conformance Verdict
- Architectural Layering: Tuân thủ nghiêm ngặt 4 lớp, locators được đóng gói vào `ListingDetailPage` và `ReportModalComponent`.
- Mutation Safety: Thuần kiểm tra read-only / route-intercept UI validation, an toàn tuyệt đối trên production.

## Verification Plan

### Automated Execution Matrix
- `npm run typecheck`
- `npx eslint pages/ components/ tests/listings/report-listing.validation.read-only.spec.ts`
- `npx ts-node scripts/validate-test-cases.ts`
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- `npx playwright test tests/listings/report-listing.validation.read-only.spec.ts --project=chromium --project=firefox --project=webkit`

### Manual Verification
- Không có (Hoàn toàn tự động hóa 100%).

## Verification Results

1. **TypeScript Typecheck**:
   - `npm run typecheck`: Passed với 0 lỗi (`tsc --noEmit` hoàn toàn sạch).
2. **ESLint Static Analysis**:
   - `npx eslint pages/components/ReportModalComponent.ts pages/listings/ListingDetailPage.ts tests/listings/report-listing.validation.read-only.spec.ts test-cases/listings/listing.test-cases.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: Passed với 0 errors, 0 warnings.
3. **Catalog & Test Case Consistency**:
   - `npx ts-node scripts/validate-test-cases.ts`: Passed, ghi nhận 48 AUTOMATED, 28 NOT_AUTOMATED, 7 IN_PROGRESS (tổng 83 test cases).
   - `npm run db:sync`: Đồng bộ 83 test cases chuẩn vào cơ sở dữ liệu SQLite thành công.
4. **Unit Baseline & Reporter Tests**:
   - `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15 passed (100%).
5. **E2E Playwright Cross-Browser Matrix**:
   - `npx playwright test tests/listings/report-listing.validation.read-only.spec.ts --project=chromium --project=firefox --project=webkit`: 7/7 passed (100%) across Chromium, Firefox, WebKit (RunId: RUN-20260913145037-2b96).
   - Cả 2 kịch bản `TC-LIST-REPORT-001` và `TC-LIST-REPORT-002` đều chạy ổn định, đạt kết quả mong đợi trên cả 3 trình duyệt.

## Change Reconciliation

- `pages/components/ReportModalComponent.ts`:
  - Tạo mới component đóng gói popup xác nhận báo cáo (`form.report-modal`, `div.report-modal-backdrop`): `isVisible()`, `title()`, `subtitle()`, `selectedReasons()`, `fillDescription()`, `clearDescription()`, `descriptionValue()`, `submit()`, `back()`, `close()`, `errorMessage()`, `isErrorVisible()`.
  - Hỗ trợ chuẩn hóa xử lý encoding/mojibake trong thông báo lỗi nếu có.
- `pages/listings/ListingDetailPage.ts`:
  - Tích hợp `ReportModalComponent` thành trường công khai `reportModal`.
  - Định vị khối "Báo cáo tin đăng" (`reportSection`), danh sách checkboxes (`reportCheckboxes`), nút mở popup (`openReportButton`), và thông báo toast (`toastItem`).
  - Cung cấp các phương thức nghiệp vụ: `isReportSectionVisible()`, `reportReasonLabels()`, `selectReportReason(reason)`, `unselectReportReason(reason)`, `isReportSubmitEnabled()`, `openReportModal()`, `toastMessage()`, `isToastVisible()`.
- `tests/listings/report-listing.validation.read-only.spec.ts`:
  - Kịch bản `TC-LIST-REPORT-001`: Người dùng chọn lý do vi phạm, mở popup, nhập mô tả hợp lệ, mock response API `POST /api/v1/listings/*/reports`, gửi phản ánh thành công, bắt toast thành công "Cảm ơn bạn đã phản hồi.", xác nhận popup tự động đóng và kiểm tra đúng payload gửi đi.
  - Kịch bản `TC-LIST-REPORT-002`: Người dùng mở popup, để trống mô tả chi tiết, bấm gửi phản ánh; xác minh hệ thống hiển thị thông báo lỗi "Vui lòng nhập lý do chi tiết.", popup tiếp tục hiển thị và không gửi request tới server.
- `test-cases/listings/listing.test-cases.ts`:
  - Chuyển `TC-LIST-REPORT-001` và `TC-LIST-REPORT-002` sang `AUTOMATED` kèm scriptPath `tests/listings/report-listing.validation.read-only.spec.ts`.
- `tests/unit/test-cases/business-automation-baseline.spec.ts`:
  - Bổ sung 2 test case IDs vào `expectedAutomatedIds`, cập nhật backlog count kỳ vọng về 35.
- `tests/unit/reporters/business-run-aggregation.spec.ts`:
  - Cập nhật baseline test runner: 48 automated, 35 backlog.
