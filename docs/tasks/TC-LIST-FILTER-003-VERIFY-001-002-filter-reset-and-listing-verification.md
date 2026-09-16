---
ticket: TC-LIST-FILTER-003-VERIFY-001-002
topic: filter-reset-and-listing-verification
template-version: 1.1
status: completed
phase: completed
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-15
---

# TC-LIST-FILTER-003-VERIFY-001-002 - filter-reset-and-listing-verification

## Objective

Triển khai tự động hóa 3 kịch bản kiểm thử nghiệp vụ cho module Tin đăng (Listings):
1. `TC-LIST-FILTER-003`: Đặt lại bộ lọc về mặc định trên danh sách tin đăng (`/sales` hoặc `/rent`). Sau khi người dùng áp dụng một hoặc nhiều tiêu chí lọc (người đăng, khoảng giá, diện tích), nhấn "Đặt lại bộ lọc" / reset thì toàn bộ điều kiện lọc trở về mặc định và danh sách hiển thị kết quả ban đầu.
2. `TC-LIST-VERIFY-001`: Gửi hồ sơ xác thực tin đăng thành công (áp dụng cho chủ tin, tin Mua bán, chưa có hồ sơ "Chờ duyệt"). Tải lên CCCD 2 mặt + giấy tờ pháp lý hợp lệ, gửi xác thực thành công, hệ thống chuyển trạng thái xác thực sang "Chờ duyệt".
3. `TC-LIST-VERIFY-002`: Chặn gửi hồ sơ khi thiếu ảnh bắt buộc (thiếu CCCD mặt trước, CCCD mặt sau hoặc giấy tờ pháp lý) hoặc file upload sai định dạng / vượt quá dung lượng cho phép. Hệ thống hiển thị thông báo lỗi tương ứng và chặn lưu hồ sơ.

## Current Understanding

- Cả 3 test case `TC-LIST-FILTER-003`, `TC-LIST-VERIFY-001`, và `TC-LIST-VERIFY-002` trong `document/Propify_Playwright_TestCase_Unified.md` và `test-cases/listings/listing.test-cases.ts` hiện ở trạng thái `NOT_AUTOMATED`.
- **TC-LIST-FILTER-003 (Đặt lại bộ lọc)**:
  - Trang danh sách tin rao `/sales` (hoặc `/rent`) chứa sidebar/thanh bộ lọc:
    - Loại người đăng: "Tất cả" (`ALL`), "Môi giới" (`BROKER`), "Chính chủ" (`OWNER`).
    - Khoảng giá: các radio presets hoặc custom range input "Từ ... Đến ...".
    - Diện tích: các radio presets hoặc custom range input "Từ ... Đến ...".
    - Sắp xếp: dropdown sort trigger ("Thông thường", "Giá tăng dần", "Giá giảm dần", v.v.).
  - `ListingListPage.ts` đã có sẵn phương thức `resetFilters()` và locator `resetButton`.
  - Khi áp dụng lọc, số lượng kết quả tin đăng thay đổi (`resultCount()` thay đổi hoặc request API kèm query parameters `poster_type`, `min_price`, v.v.).
  - Khi đặt lại bộ lọc, hệ thống khôi phục trạng thái bộ lọc ban đầu (poster = ALL, các presets = 'all', input giá/diện tích bị xóa), số lượng tin đăng phục hồi về ban đầu (`initialCount`).
- **TC-LIST-VERIFY-001 & TC-LIST-VERIFY-002 (Xác thực tin đăng)**:
  - Phân tích mã nguồn client (`PostForm-CmvwJnk_.js` / `postform_real.js`):
    - Chế độ xác thực chuyên biệt: truy cập qua query parameter `mode=verification` (`/listings/:id/edit?mode=verification`). Khi `mode === 'verification'`, form chỉ hiển thị phần xác thực (`A.value = true`), tự động mở khối xác thực `fa.value = true`, tiêu đề form là "Xác thực bất động sản", nút submit hiển thị nhãn "Lưu xác thực" (`Ga.value = 'Lưu xác thực'`).
    - Các trường upload xác thực:
      1. CCCD/CMND chủ sở hữu:
         - CCCD mặt trước: file input `accept="image/*"`, xem trước `img[alt="CCCD mặt trước"]`, nút xóa `button[aria-label="Xóa ảnh CCCD mặt trước"]`.
         - CCCD mặt sau: file input `accept="image/*"`, xem trước `img[alt="CCCD mặt sau"]`, nút xóa `button[aria-label="Xóa ảnh CCCD mặt sau"]`.
      2. Giấy tờ pháp lý:
         - Upload file: file input `multiple`, `accept="image/*"`.
         - Danh sách xem trước: các card `figure.preview-card` chứa tên tệp và nút xóa `✕`.
         - Quy định file giấy tờ pháp lý: chỉ chấp nhận định dạng `image/jpeg`, `image/png`, `image/jpg`; dung lượng tối đa 10MB (`10485760` bytes); tối đa 5 ảnh.
         - Nếu định dạng sai: gán thông báo lỗi `K.value = 'Định dạng file không hợp lệ'`, hiển thị toast warning `'File không hợp lệ đã bị loại bỏ'`.
         - Nếu quá dung lượng: gán thông báo lỗi `K.value = 'Dung lượng file vượt quá giới hạn'`, hiển thị toast warning `'File không hợp lệ đã bị loại bỏ'`.
      3. Checkbox đồng ý công khai thông tin: `Công khai thông tin` (`publicInfoAgreed`).
    - Logic kiểm tra tính đầy đủ của hồ sơ xác thực (`ol(e)`):
      - Kiểm tra: CCCD mặt trước (`w.identityCardFront`), CCCD mặt sau (`w.identityCardBack`), và ít nhất một ảnh giấy tờ pháp lý (`w.legalDocuments.length > 0`).
      - Nếu thiếu 1 hoặc nhiều ảnh bắt buộc: tổng hợp danh sách các ảnh còn thiếu và gán thông báo lỗi: `Vui lòng tải lên ${t.join(', ')} để gửi yêu cầu xác thực.`, kích hoạt toast error và chặn submit (`sl()` dừng lại, không gọi API).
    - Logic submit khi hợp lệ (`sl()`):
      - Gọi helper `uploadVerificationPayload` và gửi request `PATCH /api/v1/listings/:id/verification` với payload:
        ```json
        {
          "identity_card_front": "...",
          "identity_card_back": "...",
          "legal_documents": [...],
          "public_info_agreed": false
        }
        ```
      - Nhận phản hồi thành công (toast `'Cập nhật thông tin xác thực thành công'`) và điều hướng về `/profile?tab=listings`.

## Requirements

1. **TC-LIST-FILTER-003**:
   - Tiền điều kiện: Người dùng truy cập trang danh sách tin đăng Mua bán (`/sales`) hoặc Cho thuê (`/rent`), ghi nhận số lượng tin ban đầu.
   - Thao tác:
     1. Chọn lọc theo người đăng (ví dụ: "Chính chủ" hoặc "Môi giới") hoặc chọn khoảng giá/diện tích.
     2. Xác nhận danh sách đã được lọc (kết quả thay đổi hoặc khớp tiêu chí).
     3. Nhấn "Đặt lại bộ lọc" (hoặc gọi `resetFilters()`).
   - Kết quả kỳ vọng:
     - Toàn bộ điều kiện lọc trở về mặc định (người đăng: "Tất cả", các ô nhập giá/diện tích rỗng hoặc radio về mặc định).
     - Danh sách tin đăng khôi phục về trạng thái và số lượng ban đầu (`initialCount`).

2. **TC-LIST-VERIFY-001**:
   - Tiền điều kiện: Người dùng đã đăng nhập, mở màn hình xác thực tin đăng bán (`/listings/:id/edit?mode=verification`).
   - Thao tác:
     1. Tải lên CCCD mặt trước hợp lệ.
     2. Tải lên CCCD mặt sau hợp lệ.
     3. Tải lên ít nhất 1 ảnh giấy tờ pháp lý hợp lệ.
     4. Nhấn nút "Lưu xác thực" (hoặc "Đăng lại tin").
   - Kết quả kỳ vọng:
     - Gửi request `PATCH /api/v1/listings/:id/verification` kèm đầy đủ thông tin ảnh CCCD 2 mặt và giấy tờ pháp lý.
     - Hiển thị toast thông báo thành công `"Cập nhật thông tin xác thực thành công"`.
     - Điều hướng về `/profile?tab=listings`.

3. **TC-LIST-VERIFY-002**:
   - Tiền điều kiện: Đang ở màn hình xác thực tin đăng (`/listings/:id/edit?mode=verification`).
   - Thao tác & Kết quả kỳ vọng:
     - Trường hợp 1 (Thiếu ảnh bắt buộc): Bỏ qua một hoặc nhiều ảnh (ví dụ: chỉ tải CCCD mặt trước, không tải mặt sau và giấy tờ pháp lý), nhấn "Lưu xác thực" -> Client chặn submit, hiển thị thông báo lỗi bắt đầu bằng `"Vui lòng tải lên ... để gửi yêu cầu xác thực."` và toast cảnh báo, không gửi request tới server.
     - Trường hợp 2 (Sai định dạng file): Tải lên file không phải ảnh JPEG/PNG (ví dụ: file văn bản `.txt` hoặc `.pdf`) -> Hệ thống từ chối nhận file, hiển thị thông báo lỗi `"Định dạng file không hợp lệ"` hoặc toast `"File không hợp lệ đã bị loại bỏ"`.
     - Trường hợp 3 (Quá dung lượng file): Tải lên file ảnh vượt quá giới hạn 10MB -> Hệ thống từ chối nhận file, hiển thị thông báo lỗi `"Dung lượng file vượt quá giới hạn"` hoặc toast `"File không hợp lệ đã bị loại bỏ"`.

## Verified Findings

- **Giao diện & Logic đặt lại bộ lọc (`SortDropdown-A0sVPsSX.js`)**:
  - Các nút chọn vai trò người đăng:
    - `Tất cả`: `u.value = 'ALL'`
    - `Môi giới`: `u.value = 'BROKER'`
    - `Chính chủ`: `u.value = 'OWNER'`
  - Radio presets cho giá và diện tích đều có giá trị mặc định là `'all'`.
  - Khi chuyển về `ALL` và xóa các tham số lọc, API `GET /api/v1/listings` được gọi lại mà không kèm `poster_type`, `min_price`, `max_price`, danh sách tin khôi phục về tổng số ban đầu.
  - `ListingListPage.ts` đã có hàm `resetFilters()`:
    ```typescript
    public async resetFilters(): Promise<void> {
      if ((await this.resetButton.count()) > 0) {
        await this.resetButton.click();
        return;
      }
      await this.searchInput.fill('');
      await this.selectPoster('all');
      await this.priceScope.locator('input[type="radio"][value="all"]').filter({ visible: true }).first().check({ force: true });
      await this.areaScope.locator('input[type="radio"][value="all"]').filter({ visible: true }).first().check({ force: true });
    }
    ```
- **Giao diện & Cấu trúc form xác thực (`PostForm-CmvwJnk_.js` / `postform_real.js`)**:
  - Truy cập mode verification: `A.value = S(() => O.value && T.query.mode === 'verification')`.
  - Tiêu đề màn hình: `h2` chứa `"Xác thực bất động sản"`.
  - Vùng CCCD mặt trước:
    - Input: `input[type="file"][accept="image/*"]` kích hoạt bởi `onChange: uc`.
    - Preview: `img[alt="CCCD mặt trước"]`.
    - Nút xóa: `button[title="Xóa ảnh CCCD mặt trước"]` / `button[aria-label="Xóa ảnh CCCD mặt trước"]`.
  - Vùng CCCD mặt sau:
    - Input: `input[type="file"][accept="image/*"]` kích hoạt bởi `onChange: dc`.
    - Preview: `img[alt="CCCD mặt sau"]`.
    - Nút xóa: `button[title="Xóa ảnh CCCD mặt sau"]` / `button[aria-label="Xóa ảnh CCCD mặt sau"]`.
  - Vùng Giấy tờ pháp lý:
    - Label chứa text: `"Tải lên ảnh chụp rõ nét các mặt của giấy tờ pháp lý"`.
    - Input: `input[type="file"][multiple][accept="image/*"]` kích hoạt bởi `onChange: mc`.
    - Danh sách thẻ ảnh: `figure.preview-card` chứa ảnh `img.preview-image` và nút xóa `✕`.
  - Checkbox Công khai thông tin: `input[type="checkbox"]` đi kèm văn bản `"Công khai thông tin"`.
  - Nút submit: `button[type="submit"]` với nhãn `Lưu xác thực` (khi ở chế độ verification) hoặc `Đăng lại tin` (khi `Ha.value` là tin bị từ chối).
  - Vùng hiển thị lỗi: `p` chứa nội dung `K.value` ngay dưới khối giấy tờ pháp lý, đồng thời toast thông báo `J(n, 'error')`.
- **Validation logic kiểm tra ảnh bắt buộc (`ol(e)`)**:
  ```javascript
  function ol(e) {
    if (w.demandType === 'RENT' || (!e && !cs.value)) return true;
    if (ss.value) return K.value = '', true;
    let t = [];
    if (!w.identityCardFront) t.push('CCCD/CMND mặt trước');
    if (!w.identityCardBack) t.push('CCCD/CMND mặt sau');
    if (!Array.isArray(w.legalDocuments) || w.legalDocuments.length === 0) t.push('ít nhất một ảnh giấy tờ pháp lý');
    let n = `Vui lòng tải lên ${t.join(', ')} để gửi yêu cầu xác thực.`;
    K.value = n;
    X(n);
    J(n, 'error', 5000);
    fa.value = true;
    return false;
  }
  ```
- **Validation logic định dạng và dung lượng giấy tờ (`mc(e)`)**:
  - Định dạng cho phép: `image/jpeg`, `image/png`, `image/jpg`. Nếu sai: `K.value = 'Định dạng file không hợp lệ'`, toast cảnh báo `'File không hợp lệ đã bị loại bỏ'`.
  - Dung lượng tối đa: 10MB (`10485760` bytes). Nếu vượt quá: `K.value = 'Dung lượng file vượt quá giới hạn'`, toast cảnh báo `'File không hợp lệ đã bị loại bỏ'`.
- **API Endpoint xác thực**:
  - `PATCH /api/v1/listings/:id/verification`
  - Body payload: `{ identity_card_front, identity_card_back, legal_documents, public_info_agreed }`
  - Response thành công: `status: 200`, `{ success: true, message: 'Cập nhật thông tin xác thực thành công' }`.

## Confirmed Decisions

- **Kiến trúc an toàn dữ liệu (Production Safety Gate)**:
  - `TC-LIST-FILTER-003`: Thực hiện thao tác lọc và reset trực tiếp trên trang `/sales` (chế độ read-only, không làm biến đổi dữ liệu server, không yêu cầu cờ mutating).
  - `TC-LIST-VERIFY-002`: Kiểm tra toàn diện hành vi client validation (chặn gửi khi thiếu ảnh, sai định dạng, quá dung lượng). Hệ thống chặn ngay tại client, không có network request gửi đi.
  - `TC-LIST-VERIFY-001`: Áp dụng route interception `page.route('**/api/v1/listings/*/verification', ...)` giả lập phản hồi thành công từ backend (`status: 200`, `Cập nhật thông tin xác thực thành công`). Điều này đảm bảo:
    1. Kiểm thử trọn vẹn luồng tương tác thực tế của người dùng: upload ảnh CCCD 2 mặt, upload giấy tờ pháp lý, nhấn submit, bắt đúng payload, xác nhận toast thành công và redirect sang trang profile.
    2. Tuyệt đối không can thiệp hay ghi rác vào cơ sở dữ liệu thật trên production (`ALLOW_MUTATING_E2E=false`), an toàn 100%.
- **Phân bổ file kiểm thử (4-Layer Architecture)**:
  - `TC-LIST-FILTER-003` được bổ sung vào file kiểm thử hiện hữu: `tests/listings/filter-listing.read-only.spec.ts`.
  - `TC-LIST-VERIFY-001` và `TC-LIST-VERIFY-002` được đưa vào file kiểm thử mới: `tests/listings/listing-verification.validation.read-only.spec.ts`.
- **Mở rộng Page Objects**:
  - Mở rộng `ListingFormComponent` (hoặc `EditListingPage`) với các phương thức nghiệp vụ đóng gói:
    - `uploadIdentityCardFront(filePath: string): Promise<void>`
    - `uploadIdentityCardBack(filePath: string): Promise<void>`
    - `uploadLegalDocuments(filePaths: string[]): Promise<void>`
    - `verificationErrorMessage(): Promise<string>`
    - `submitVerification(): Promise<void>`
    - `isVerificationSectionVisible(): Promise<boolean>`
  - Không đặt raw locators trong test spec, không đặt assertion Playwright trong Page Object.

## Constraints

- Tuân thủ quy ước kiến trúc 4 lớp: Spec -> Fixture -> Workflow -> Page Object.
- Không sử dụng `page.waitForTimeout()` hoặc `setTimeout()` tùy tiện; sử dụng web-first assertions và `expect.poll()` khi chờ phản hồi động.
- Không gây đột biến dữ liệu production khi chạy suite không mang cờ `@mutating`.
- Toàn bộ test suite phải vượt qua `npm run typecheck` và `npm run lint` với 0 lỗi.

## Out of Scope

- Quy trình phê duyệt hồ sơ xác thực phía Quản trị viên (Admin Approval Panel nằm ngoài phạm vi nghiệp vụ người dùng).
- Chức năng gỡ tin đăng hoặc từ chối duyệt tin.
- Tạo mới tài khoản định danh thật qua cổng dịch vụ công.

## Proposed Implementation

1. **Page Objects**:
   - Bổ sung locators và tương tác cho hồ sơ xác thực trong `ListingFormComponent.ts`:
     - `identityCardFrontInput`: `label:has(img[alt="CCCD mặt trước"]) input[type="file"]` hoặc `input[type="file"][accept*="image"]` tương ứng.
     - `identityCardBackInput`: `label:has(img[alt="CCCD mặt sau"]) input[type="file"]` tương ứng.
     - `legalDocumentInput`: đã có sẵn, bổ sung hỗ trợ upload nhiều tệp hoặc tệp không hợp lệ.
     - `verificationError`: `p` hiển thị thông báo lỗi `K.value`.
     - `submitVerificationButton`: button submit "Lưu xác thực".
2. **Test Specifications**:
   - `tests/listings/filter-listing.read-only.spec.ts`:
     - Thêm kịch bản kiểm thử cho `TC-LIST-FILTER-003`: Mở `/sales`, lưu `initialCount`, chọn poster `"Chủ nhà"` / `"Chính chủ"`, xác nhận kết quả thay đổi, gọi `listingListPage.resetFilters()`, chờ danh sách cập nhật và xác nhận số lượng trở về `initialCount`.
   - `tests/listings/listing-verification.validation.read-only.spec.ts`:
     - Kịch bản 1: `TC-LIST-VERIFY-001` - Gửi hồ sơ xác thực tin đăng thành công (mock route verification, upload CCCD 2 mặt + giấy tờ pháp lý, submit, verify toast thành công và payload request).
     - Kịch bản 2: `TC-LIST-VERIFY-002` - Chặn gửi hồ sơ khi thiếu ảnh bắt buộc (bỏ trống mặt sau/giấy tờ, submit -> assert thông báo lỗi `"Vui lòng tải lên..."`).
     - Kịch bản 3: `TC-LIST-VERIFY-002` - Chặn gửi và loại bỏ file khi upload sai định dạng hoặc vượt quá dung lượng.
3. **Test Catalog & Baselines**:
   - Cập nhật `test-cases/listings/listing.test-cases.ts`:
     - `TC-LIST-FILTER-003`: `automation.status: 'AUTOMATED'`, `scriptPath: 'tests/listings/filter-listing.read-only.spec.ts'`.
     - `TC-LIST-VERIFY-001`: `automation.status: 'AUTOMATED'`, `scriptPath: 'tests/listings/listing-verification.validation.read-only.spec.ts'`.
     - `TC-LIST-VERIFY-002`: `automation.status: 'AUTOMATED'`, `scriptPath: 'tests/listings/listing-verification.validation.read-only.spec.ts'`.
   - Cập nhật baselines trong `tests/unit/test-cases/business-automation-baseline.spec.ts` và `tests/unit/reporters/business-run-aggregation.spec.ts` từ 48 lên 51 automated, từ 35 xuống 32 backlog.
   - Chạy `npm run db:sync` để đồng bộ cơ sở dữ liệu SQLite test cases.

## Expected File Changes

1. `docs/tasks/TC-LIST-FILTER-003-VERIFY-001-002-filter-reset-and-listing-verification.md` - Tài liệu persistent task memory của task.
2. `pages/components/ListingFormComponent.ts` - Bổ sung locators & methods xử lý upload CCCD và xác thực hồ sơ tin đăng.
3. `tests/listings/filter-listing.read-only.spec.ts` - Thêm test spec cho `TC-LIST-FILTER-003`.
4. `tests/listings/listing-verification.validation.read-only.spec.ts` - Tạo mới test suite cho `TC-LIST-VERIFY-001` và `TC-LIST-VERIFY-002`.
5. `test-cases/listings/listing.test-cases.ts` - Đánh dấu `AUTOMATED` cho 3 test case.
6. `tests/unit/test-cases/business-automation-baseline.spec.ts` - Cập nhật baseline (51 automated / 32 backlog).
7. `tests/unit/reporters/business-run-aggregation.spec.ts` - Cập nhật baseline (51 automated / 32 backlog).

## Open Questions

- [non-blocking] Dung lượng file tối đa trong test case document ghi là ">30MB", tuy nhiên logic thực tế của client trong code `mc(e)` giới hạn ở mức 10MB (`10485760` bytes). Kịch bản kiểm thử sẽ sử dụng file mẫu vượt ngưỡng 10MB để kích hoạt đúng thông báo lỗi thực tế của hệ thống.

## Risks and Conflicts

- **Network Flakiness khi upload file**: Sử dụng buffer trong bộ nhớ (`FileUploadHelper` hoặc buffer giả lập) để tạo tệp ảnh JPEG/PNG hợp lệ và tệp lỗi nhằm tăng tốc độ thực thi và loại bỏ phụ thuộc vào tệp tĩnh ngoài ổ đĩa.
- **Strict Mode Selector Concurrency**: Các vùng upload có thể chứa icon info hoặc tooltip, cần định vị chính xác thẻ `input[type="file"]` tương ứng của từng mục (mặt trước, mặt sau, giấy tờ) để tránh lỗi strict mode.

## Acceptance Criteria

- [DoD-1] `TC-LIST-FILTER-003`: Thực hiện lọc tin đăng trên `/sales` với điều kiện người đăng hoặc khoảng giá/diện tích; nhấn đặt lại bộ lọc sẽ đưa toàn bộ tiêu chí về mặc định và khôi phục số lượng tin đăng ban đầu.
- [DoD-2] `TC-LIST-VERIFY-001`: Người dùng ở màn hình xác thực tin đăng có thể tải lên CCCD mặt trước, CCCD mặt sau và giấy tờ pháp lý hợp lệ; khi nhấn lưu xác thực, hệ thống gửi request `PATCH /api/v1/listings/:id/verification` với payload hợp lệ và hiển thị thông báo thành công.
- [DoD-3] `TC-LIST-VERIFY-002`: Khi thiếu một trong các ảnh bắt buộc (CCCD mặt trước, mặt sau hoặc giấy tờ pháp lý), hệ thống chặn lưu hồ sơ và hiển thị thông báo lỗi yêu cầu tải lên các ảnh còn thiếu.
- [DoD-4] `TC-LIST-VERIFY-002`: Khi người dùng tải lên file sai định dạng (không phải jpg/png/jpeg) hoặc vượt quá dung lượng quy định (10MB), hệ thống hiển thị thông báo lỗi tương ứng và loại bỏ file không hợp lệ.
- [DoD-5] Toàn bộ locators và tương tác upload xác thực được đóng gói chuẩn trong Page Object (`ListingFormComponent`), tuân thủ nghiêm ngặt kiến trúc 4 lớp, không dùng raw locators trong test spec và không dùng `page.waitForTimeout()`.
- [DoD-6] Cập nhật trạng thái `TC-LIST-FILTER-003`, `TC-LIST-VERIFY-001`, `TC-LIST-VERIFY-002` sang `AUTOMATED` trong `test-cases/listings/listing.test-cases.ts`, cập nhật baseline kiểm thử (51 automated, 32 backlog), đồng bộ SQLite database (`npm run db:sync`), đạt 100% typecheck và lint.

## Impact Analysis

### Direct Consumers
- `tests/listings/filter-listing.read-only.spec.ts`: Bổ sung kịch bản `TC-LIST-FILTER-003` (Đặt lại bộ lọc về mặc định).
- `tests/listings/listing-verification.validation.read-only.spec.ts`: Test suite mới cho xác thực tin đăng (`TC-LIST-VERIFY-001` và `TC-LIST-VERIFY-002`).

### Shared Fixtures & State Impact
- `ListingFormComponent.ts`: Bổ sung locators và interaction methods cho tải lên CCCD mặt trước/sau, giấy tờ pháp lý và trạng thái lỗi.
- `EditListingPage.ts`: Bổ sung phương thức `openVerification()`, các proxy methods cho `ListingFormComponent`, và `submitVerification()`.
- `ListingListPage.ts`: Bổ sung response interception cho `GET /api/v1/listings` trong `open()` để lưu `lastResultTotal` và `lastResultPageSize` ban đầu.
- Sử dụng phiên đăng nhập từ `.auth/defaultUser.json`. Không làm thay đổi cookies hay thông tin tài khoản người dùng thật.

### Risk & Flakiness Assessment
- Flakiness được loại trừ hoàn toàn nhờ:
  1. Web-first auto-retrying assertions của Playwright và `expect.poll()` cho các trạng thái xem trước ảnh upload.
  2. Sequential CCCD & document uploads tránh Vue DOM re-render race condition.
  3. Route interception giả lập phản hồi chữ ký Cloudinary, upload ảnh và PATCH verification endpoint deterministic.
  4. Mocking API phường/xã (`provinces.open-api.vn`) để tránh treo mạng từ dịch vụ bên thứ ba.

### Conformance Verdict
- Architectural Layering: Tuân thủ 100% kiến trúc 4 lớp (Spec -> Fixture -> Page Object/Component -> Playwright API). Không chứa raw locators trong test spec, không chứa assertion trong Page Object.
- Mutation Safety: Toàn bộ suite chạy ở chế độ read-only kết hợp network interception mock API, an toàn tuyệt đối trên production (`ALLOW_MUTATING_E2E=false`).

## Verification Plan

### Automated Execution Matrix
- `npm run typecheck`
- `npx eslint pages/components/ListingFormComponent.ts pages/listings/EditListingPage.ts pages/listings/ListingListPage.ts test-cases/listings/listing.test-cases.ts tests/listings/filter-listing.read-only.spec.ts tests/listings/listing-verification.validation.read-only.spec.ts tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- `npx ts-node scripts/validate-test-cases.ts`
- `npm run db:sync`
- `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`
- `npx playwright test tests/listings/filter-listing.read-only.spec.ts --project=chromium`
- `npx playwright test tests/listings/listing-verification.validation.read-only.spec.ts --project=chromium`

### Manual Verification
- Không có (Hoàn toàn tự động hóa 100%).

## Verification Results

1. **TypeScript Typecheck**:
   - `npm run typecheck`: Passed với 0 lỗi (`tsc --noEmit` hoàn toàn sạch).
2. **ESLint Static Analysis**:
   - `npx eslint ...`: Passed với 0 errors, 0 warnings trên toàn bộ các tệp được chỉnh sửa và tạo mới.
3. **Catalog & Test Case Consistency**:
   - `npx ts-node scripts/validate-test-cases.ts`: Passed, ghi nhận 51 AUTOMATED, 25 NOT_AUTOMATED, 7 IN_PROGRESS (tổng 83 test cases).
   - `npm run db:sync`: Đồng bộ 83 test cases chuẩn vào cơ sở dữ liệu SQLite thành công.
4. **Unit Baseline & Reporter Tests**:
   - `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts tests/unit/reporters/business-run-aggregation.spec.ts`: 15/15 passed (100%).
5. **E2E Playwright Test Execution**:
   - `tests/listings/filter-listing.read-only.spec.ts`: 6/6 passed (bao gồm `TC-LIST-FILTER-001`, `TC-LIST-FILTER-002`, `TC-LIST-FILTER-003`).
   - `tests/listings/listing-verification.validation.read-only.spec.ts`: 4/4 passed (bao gồm `TC-LIST-VERIFY-001` và `TC-LIST-VERIFY-002` cả 2 nhánh kiểm tra).

## Change Reconciliation

- `pages/components/ListingFormComponent.ts`:
  - Bổ sung các locator: `identityCardFrontInput`, `identityCardBackInput`, `identityCardFrontPreview`, `identityCardBackPreview`, `publicInfoAgreedCheckbox`, `verificationError`, `submitVerificationButton`.
  - Bổ sung phương thức nghiệp vụ: `waitForVerificationReady()`, `uploadIdentityCardFront()`, `uploadIdentityCardBack()`, `uploadLegalDocuments()`, `isIdentityCardFrontUploaded()`, `isIdentityCardBackUploaded()`, `legalDocumentsCount()`, `setPublicInfoAgreed()`, `verificationErrorMessage()`, `isVerificationErrorVisible()`, `submitVerification()`.
- `pages/listings/EditListingPage.ts`:
  - Thêm phương thức `openVerification(listingId)` hỗ trợ query `?mode=verification` và chờ API listing hoàn tất.
  - Thêm các helper tương tác xác thực tin đăng: `uploadVerificationIdentityCardFront()`, `uploadVerificationIdentityCardBack()`, `uploadVerificationLegalDocuments()`, `setPublicInfoAgreed()`, `submitVerification()`.
- `pages/listings/ListingListPage.ts`:
  - Tích hợp intercept API `GET /api/v1/listings` khi gọi `open()` để cập nhật `lastResultTotal` và `lastResultPageSize` chính xác cho `resultCount()`.
- `tests/listings/filter-listing.read-only.spec.ts`:
  - Thêm kịch bản `TC-LIST-FILTER-003`: mở `/sales`, áp dụng bộ lọc `poster = 'owner'`, kiểm tra kết quả thay đổi, gọi `resetFilters()`, xác nhận kết quả khôi phục về tổng số ban đầu.
- `tests/listings/listing-verification.validation.read-only.spec.ts`:
  - Tạo suite mới với `mode: 'serial'` kiểm thử toàn diện `TC-LIST-VERIFY-001` (happy path với mock signature, Cloudinary upload, PATCH verification) và `TC-LIST-VERIFY-002` (chặn khi thiếu ảnh bắt buộc, chặn khi file sai định dạng hoặc vượt quá 10MB).
- `test-cases/listings/listing.test-cases.ts`:
  - Chuyển `TC-LIST-FILTER-003`, `TC-LIST-VERIFY-001`, `TC-LIST-VERIFY-002` sang `AUTOMATED` kèm scriptPath tương ứng.
- `tests/unit/test-cases/business-automation-baseline.spec.ts` & `tests/unit/reporters/business-run-aggregation.spec.ts`:
  - Cập nhật baseline: 51 automated, 32 backlog.

