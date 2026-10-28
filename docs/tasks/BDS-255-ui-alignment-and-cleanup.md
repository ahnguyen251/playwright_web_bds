---
ticket: BDS-255
topic: ui-alignment-and-cleanup
template-version: 1.1
status: completed
phase: completed
memory-version: 5
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-29
---

# BDS-255 - ui-alignment-and-cleanup

## Objective

Thực hiện chuẩn hóa căn chỉnh giao diện dashboard Playwright APM theo phong cách Nexora, loại bỏ 4 thành phần dư thừa do người dùng đánh dấu đỏ trong ảnh chụp thực tế, tinh giản triệt để cấu trúc Header để loại bỏ tình trạng rối mắt / lộn xộn (double breadcrumb, stacked header rows), khắc phục lỗi tiêu đề bị đè lên thanh topbar (`h1#page-title`), sửa lỗi đảo ngược vị trí header trên trang chi tiết test case (`TestCaseDetailsView.js`), ẩn thanh bulk action khi chưa chọn test case, và căn chỉnh lại các khối KPI, bộ lọc, bảng dữ liệu để giao diện đạt độ hoàn thiện cao, chỉn chu và thanh lịch.

## Current Understanding

- Người dùng đã cung cấp ảnh chụp thực tế màn hình dashboard hiện tại và khoanh 4 khung đỏ yêu cầu gỡ bỏ:
  1. **Khung đỏ 1 (Topbar breadcrumb)**: Viên thuốc `• Thời gian thực` (`.live-status-pill`) gây rối mắt trên thanh điều hướng.
  2. **Khung đỏ 2 (Topbar phải)**: Toàn bộ cụm điều khiển bên phải thanh topbar gồm bộ chọn trình duyệt `🌐 Chromium (Chrome)`, nút `Chạy Toàn Bộ Test Suite →` và nút `+ Thêm Test Case`.
  3. **Khung đỏ 3 (Đầu trang nội dung)**: Huy hiệu micro-eyebrow `[↗] E2E TEST SCENARIOS CATALOG` nằm phía trên tiêu đề trang.
  4. **Khung đỏ 4 (Thanh công cụ lọc)**: Khối `DỰ ÁN / TRÌNH DUYỆT: 🌐 Chromium (Chrome)` nằm trùng lặp trong thanh công cụ tìm kiếm và lọc test case.
- Đồng thời người dùng phản ánh:
  - *"kiểm khta lại hết căn chỉnh đi tôi thấy căn chỉnh vẫn lệch và UI nhìn chưa đc hoàn thiện"*.
  - *"tôi đang thấy phần header như này quá lộn xộn"*.
  - *"chi tiết testcase header đang bị sai vị trí"*: Cung cấp ảnh chụp màn hình cho thấy trên trang chi tiết test case, cụm nút bấm hành động (`Quay Lại Danh Sách`, `Xuất JSON`, dropdown trình duyệt và nút chạy test) bị đẩy sang bên trái, trong khi tiêu đề kịch bản, ID và metadata bị đẩy lệch sang bên phải.
- **Phân tích nguyên nhân gốc rễ**:
  1. Trong `TestCaseDetailsView.js`, phần tử `.page-title-actions-top` (cụm nút hành động) được đặt trước phần tử `.page-title-group` (tiêu đề và thông tin test case) bên trong `.page-title-row` (`display: flex; justify-content: space-between;`), dẫn đến việc toàn bộ nút hành động nằm bên trái và tiêu đề nằm bên phải bị đảo ngược 180 độ so với quy chuẩn thiết kế.
  2. Double Breadcrumb trước đó và lỗi tiêu đề `h1#page-title` tràn layout đã được giải quyết.

## Requirements

1. **Khắc phục lỗi sai vị trí Header trên trang Chi tiết Test Case**:
   - Đặt `.page-title-group` lên vị trí đầu tiên bên trong `.page-title-row` để tiêu đề ID (`TC-PROFILE-VIEW-001`), huy hiệu trạng thái (`AUTOMATED`), tên kịch bản và metadata chips nằm ngay ngắn ở bên trái.
   - Đặt cụm nút hành động (`page-title-actions`) ở bên phải gồm: Nút `← Quay Lại Danh Sách`, Nút `Xuất JSON`, và bộ chọn trình duyệt + nút `Chạy Test Case`.
   - Cập nhật `.page-title-row` sang `align-items: flex-start;` để khối tiêu đề nhiều dòng bên trái và khối nút bên phải căn thẳng hàng đỉnh một cách tự nhiên.

2. **Loại bỏ 4 thành phần được khoanh đỏ ban đầu**:
   - Gỡ bỏ `.live-status-pill` khỏi breadcrumb trong `public/index.html`.
   - Gỡ bỏ khối `.topbar-right` cũ (Chromium dropdown, Chạy Suite, Thêm Test Case).
   - Gỡ bỏ huy hiệu `.eyebrow-badge` khỏi `public/js/views/TestCasesView.js` và tất cả các view.
   - Gỡ bỏ khối chọn trình duyệt `toolbar-browser-select-wrap` khỏi toolbar.

3. **Hợp nhất và tinh gọn Header toàn diện**:
   - Chuẩn hóa Topbar ngoài thành thanh điều hướng cao cấp (cao 52px), phía trái hiển thị Breadcrumb động theo cấp bậc URL, phía phải hiển thị pill trạng thái hệ thống thanh lịch (`Playwright APM • Sẵn Sàng`).
   - Xóa bỏ triệt để hàng breadcrumb thứ hai (`.apm-breadcrumb-row`) ở toàn bộ các view con.
   - Ẩn hoàn toàn thanh Bulk Action Bar (`#bulk-action-bar`) khi `selectedCount === 0`.
   - Thu gọn thanh tóm tắt mô-đun (`.module-summary-strip`).

4. **Khắc phục lỗi vỡ tiêu đề Topbar và căn chỉnh KPI/Bảng**:
   - Bổ sung định nghĩa chuẩn cho class `.visually-hidden` trong `public/css/style.css`.
   - Cố định `white-space: nowrap;` cho số liệu và đơn vị để loại bỏ lỗi ngắt dòng `100.0%`.
   - Đồng bộ chiều cao thẻ KPI và căn giữa checkbox bảng dữ liệu 100%.

## Acceptance Criteria

- [Derived-1] Trang Chi tiết Test Case hiển thị ID kịch bản, tiêu đề và metadata nằm chuẩn xác ở bên trái màn hình; các nút thao tác nằm ở góc phải màn hình.
- [Derived-2] Thanh topbar không còn chứa huy hiệu `• Thời gian thực` và không còn cụm nút/dropdown bên phải bị khoanh đỏ.
- [Derived-3] Thẻ `<h1 id="page-title">` được ẩn triệt để khỏi luồng hiển thị giao diện qua `.visually-hidden`.
- [Derived-4] Thẻ micro-eyebrow `[↗] E2E TEST SCENARIOS CATALOG` không còn xuất hiện trên đầu trang.
- [Derived-5] Thanh công cụ tìm kiếm không còn khối chọn trình duyệt `DỰ ÁN / TRÌNH DUYỆT: 🌐 Chromium (Chrome)`.
- [Derived-6] Thẻ KPI thứ 2 ("BAO PHỦ TỰ ĐỘNG") hiển thị `100.0%` nguyên vẹn trên một dòng, không bị ngắt dòng `%`.
- [Derived-7] Bốn thẻ KPI có chiều cao bằng nhau, bố cục nhãn, icon squircle, số liệu và footer được căn gióng hàng thẳng tắp.
- [Derived-8] Hợp nhất toàn bộ Header: Không còn hiện tượng Breadcrumb lặp lại 2 lần; thanh topbar 52px gọn gàng, hàng tiêu đề trang gộp chung với nút chức năng gọn nhẹ.
- [Derived-9] Thanh Bulk Action Bar ẩn khi 0 test case được chọn, chỉ hiển thị khi có ít nhất 1 test case được đánh dấu.
- [Derived-10] Zero JavaScript console errors trên mọi view.

## Verified Findings

- `public/js/views/TestCaseDetailsView.js`: Đã chuyển `.page-title-group` lên trước `.page-title-actions`, gán `flex: 1; min-width: 0;` cho tiêu đề và cấu hình các nút bên phải với `flex-shrink: 0;`.
- `public/css/style.css`: `.page-title-row` cập nhật `align-items: flex-start;` tạo độ gióng hàng cân xứng tuyệt đối.
- `public/index.html`: Cấu trúc topbar 52px tinh giản.
- `public/js/router.js`: Quản trị breadcrumb động theo route hierarchy.
- `public/js/views/TestCasesView.js`: Thu gọn header, ẩn bulk action bar khi rỗng, tinh gọn dải tóm tắt.

## Confirmed Decisions

- Tiêu đề, ID và metadata luôn ở bên trái; các nút tương tác (Quay lại, Xuất file, Chạy test) luôn ở bên phải trên tất cả các trang chi tiết.
- Loại bỏ hoàn toàn 4 vùng người dùng đã chỉ định trong ảnh.
- Áp dụng kỹ thuật CSS utility chuẩn cho `.visually-hidden`.
- Căn chỉnh lại toàn bộ grid và flexbox theo chuẩn hệ thống thiết kế Nexora.

## Constraints

- Giữ nguyên các chức năng cốt lõi: tìm kiếm kịch bản test, lọc theo mô-đun, lọc theo trạng thái, chọn checkbox hàng loạt, chạy test kịch bản, và phân trang.
- Không chỉnh sửa các file ngoài phạm vi UI dashboard (`server/`, `database/`, `tests/`).
- Tuân thủ quy trình Spec-First.

## Out of Scope

- Thiết kế lại các trang ngoài danh mục dashboard.
- Thay đổi cấu trúc cơ sở dữ liệu SQLite hay API routes phía server.

## Proposed Implementation

1. **`public/js/views/TestCaseDetailsView.js`**:
   - Đảo lại thứ tự DOM: Đặt `.page-title-group` trước `.page-title-actions`.
2. **`public/css/style.css`**:
   - Định cấu hình `.page-title-row { align-items: flex-start; }`.
3. **`public/index.html`** & **`public/js/views/`**:
   - Đảm bảo tính đồng bộ trên toàn bộ hệ sinh thái views.

## Expected File Changes

- `public/js/views/TestCaseDetailsView.js`: Định vị lại khối header chi tiết test case.
- `public/css/style.css`: Căn gióng hàng header với `align-items: flex-start`.

## Open Questions

- [non-blocking] Toàn bộ các yêu cầu tinh giản, gỡ bỏ và căn chỉnh của người dùng đã được hiện thực hóa trọn vẹn.

## Risks and Conflicts

- Đã kiểm tra null-safety cho toàn bộ các element ID trong `TestCaseDetailsView.js` (`#btn-copy-tc-id`, `#btn-export-tc-json`, `#select-run-browser`, `#btn-run-tc`). Zero lỗi ném ra.

## Impact Analysis

- **Giao diện người dùng**: Trang chi tiết test case trở về bố cục chuẩn mực: Tiêu đề ID + Tên kịch bản + Chips metadata nằm rõ ràng bên trái; cụm thao tác nằm gọn ghẽ góc phải, hài hòa với ngôn ngữ thiết kế chung.

## Verification Plan

1. Kiểm tra trực quan trang Chi tiết Test Case: đảm bảo ID, Tên kịch bản và metadata ở bên trái; các nút thao tác ở bên phải.
2. Kiểm tra TypeScript: `npm run typecheck`.
3. Kiểm tra JavaScript Syntax: `node --check`.

## Verification Results

1. **Trang Chi Tiết Test Case**:
   - Đã đảo lại thứ tự: ID kịch bản (font Consolas/mono), chip trạng thái `AUTOMATED`, tên kịch bản và danh sách chips (Mô-đun, File kịch bản kèm icon copy, Cập nhật) hiển thị chuẩn mực 100% ở phía bên trái.
   - Cụm nút bấm (`← Quay Lại Danh Sách`, `Xuất JSON`, bộ chọn trình duyệt `🌐 Chromium / Firefox / WebKit` và nút `Chạy Test Case`) nằm ngay ngắn ở phía bên phải.
2. **Kiểm thử tự động**:
   - `npm run typecheck`: Vượt qua với 0 lỗi (TypeScript 5.9).
   - `node --check`: Không có lỗi cú pháp.

## Change Reconciliation

- `public/js/views/TestCaseDetailsView.js`: Đảo lại vị trí khối tiêu đề sang trái và khối hành động sang phải.
- `public/css/style.css`: Cập nhật `align-items: flex-start;` cho `.page-title-row`.
- `docs/tasks/BDS-255-ui-alignment-and-cleanup.md`: Cập nhật ghi chép khắc phục lỗi vị trí header chi tiết test case.
