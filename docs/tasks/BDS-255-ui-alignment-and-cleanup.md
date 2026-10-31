---
ticket: BDS-255
topic: ui-alignment-and-cleanup
template-version: 1.1
status: completed
phase: completed
memory-version: 11
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-29
---

# BDS-255 - ui-alignment-and-cleanup

## Objective

Thực hiện chuẩn hóa căn chỉnh và hoàn thiện giao diện dashboard Playwright APM theo phong cách thiết kế hiện hành (Nexora Glassmorphism) dựa trên phản hồi thực tế từ người dùng:
1. Sắp xếp dải metadata (`Mô-đun`, `File kịch bản`, `Cập nhật`) trên trang Chi Tiết Test Case thành đúng **1 hàng ngang duy nhất** (`white-space: nowrap; flex-wrap: nowrap;`).
2. **Đổi vị trí 2 nút bấm** trên header trang Chi Tiết Test Case: đưa cụm điều khiển runner (`[ 🌐 Chromium (Chrome) ⌵ | ▶ Chạy Test Case ]`) lên trước (bên trái), và đưa nút `[ < Quay Lại Danh Sách ]` ra sau (bên phải).
3. Khắc phục triệt để lỗi runtime `Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'`.
4. Căn giữa chuẩn xác nút `✕` xóa tìm kiếm bên trong ô search input (`top: 50%; transform: translateY(-50%)`).
5. Ẩn hoàn toàn dải pagination/scrollbar rỗng màu trắng ở chân bảng khi chỉ có 1 trang dữ liệu (`totalPages <= 1`).
6. **Đồng bộ hóa Modal Kịch Bản Kiểm Thử (Quick Script Modal)** theo phong cách Nexora:
   - Thay thế các nút thô sơ mặc định của trình duyệt (`[Sao chép đường dẫn]`, `[Đóng]`) bằng các nút pill cao cấp (`.btn-modal-primary` với icon copy SVG và `.btn-modal-secondary` outline pill).
   - Căn chỉnh `.modal-footer` sang phải (`justify-content: flex-end; gap: 12px; padding: 18px 28px; background: #f8fafc; border-top: 1px solid var(--border-glass)`).
7. **Đồng bộ hóa Modal Chi Tiết Kết Quả (Result Details Modal)** theo phong cách Nexora:
   - Thay thế các tag phân loại lỗi thô sơ viền vàng/xám (`🏷️ Lỗi sản phẩm đã ghi nhận`, `📋 Kịch bản nghiệp vụ chuẩn`) thành các badge pill mềm mại (`.failure-classification`) với gradient pastel, viền kính và đổ bóng nhẹ.
   - Nâng cấp khối đối sánh **KẾT QUẢ MONG MUỐN (EXPECTED)** vs **KẾT QUẢ THỰC TẾ (ACTUAL)**:
     - Tạo icon badge squircle tinh tế cho header mỗi cột.
     - Thay đổi ô giá trị dạng input thô sơ (`.code-val`, `.error-val`) thành các thẻ hiển thị giá trị code/assertion hiện đại, bo góc 10px, font monospace sắc nét, màu sắc định danh rõ ràng (`#1d4ed8` và `#b91c1c`).
     - Chuẩn hóa pill đánh giá trạng thái (`.badge-status-failed`, `.badge-status-passed`) và các tiêu đề mục (`.modal-section-title`).

## Current Understanding

- Người dùng đã cung cấp 2 ảnh chụp thực tế màn hình modal (`media_1793267002924_4779e6b8.png` và `media_1793267008886_13ce5323.png`) và yêu cầu:
  1. **Ảnh 1 ("Kịch Bản Kiểm Thử")**: Hai nút bấm `[Sao chép đường dẫn]` và `[Đóng]` ở chân modal bị unstyled, dính góc trái và viền xám 3D thô sơ của trình duyệt. Cần thiết kế lại footer và các nút bấm theo phong cách pill buttons của Nexora.
  2. **Ảnh 2 ("Chi Tiết Kết Quả")**:
     - Các tag phân loại lỗi (`🏷️ Lỗi sản phẩm đã ghi nhận...`, `📋 Kịch bản nghiệp vụ chuẩn...`) có viền vàng/xám hình hộp chữ nhật thiếu tính đồng bộ.
     - Cặp thẻ so sánh `KẾT QUẢ MONG MUỐN (EXPECTED)` và `KẾT QUẢ THỰC TẾ (ACTUAL)` chứa các ô giá trị `50` và `-1` trông giống input box thô, cần chuyển sang phong cách thẻ hiển thị giá trị hiện đại, kính mờ và màu sắc trực quan.

## Requirements

1. **Modal Kịch Bản Kiểm Thử (`TestCasesView.js` & `style.css`)**:
   - Thêm định nghĩa `.modal-footer` chuẩn chỉnh: padding, flexbox căn phải, nền sáng nhẹ, đường kẻ ngăn cách tinh tế.
   - Thêm nút `.btn-modal-primary` (màu xanh dương gradient, bo tròn pill, icon copy) và `.btn-modal-secondary` (outline pill, nền trắng).
   - Áp dụng tương tự cho `openWriteScriptModal`.
2. **Modal Chi Tiết Kết Quả (`ResultDetailsModal.js` & `style.css`)**:
   - Thêm style chuẩn cho `.failure-classification`: `border-radius: var(--radius-pill); padding: 6px 14px; display: inline-flex; align-items: center; gap: 7px;` với gradient pastel mượt mà cho `badge-known-gap`, `badge-defect`, `badge-mapped-failure`.
   - Nâng cấp `.result-comparison-card`:
     - Cột Expected: nền gradient xanh dương nhạt (`#f0f7ff` -> `#e0f2fe`), viền xanh pastel, squircle icon badge.
     - Cột Actual: nền gradient đỏ hồng nhạt (`#fef2f2` -> `#fee2e2`), viền đỏ pastel, squircle icon badge.
     - Cột Actual Passed: nền gradient xanh lục nhạt (`#f0fdf4` -> `#dcfce7`).
     - Ô giá trị `.code-val` và `.error-val`: thẻ hiển thị giá trị code/token bóng bẩy, bo góc 10px, bóng nhẹ, loại bỏ hoàn toàn cảm giác input thô.
     - Nâng cấp pill đánh giá trạng thái `.badge-status-failed` và `.badge-status-passed`.
     - Chuẩn hóa các tiêu đề mục lỗi `.modal-section-title`.

## Acceptance Criteria

- [Derived-1] Modal "Kịch Bản Kiểm Thử" có footer được căn phải, nút Sao chép đường dẫn mang phong cách Nexora pill button có icon, nút Đóng có viền tinh tế.
- [Derived-2] Modal "Chi Tiết Kết Quả" sở hữu các tag phân loại lỗi dạng pill mềm mại, không còn viền thô hình hộp.
- [Derived-3] Thẻ so sánh Expected vs Actual được thiết kế kính mờ sang trọng, ô giá trị hiển thị như token code hiện đại.
- [Derived-4] TypeScript typecheck đạt 0 lỗi; cú pháp JS hợp lệ 100%.

## Verified Findings

- `TestCasesView.js`: `openScriptModal` và `openWriteScriptModal` tạo `.modal-footer` với `<button class="btn btn-copy-path">` nhưng `style.css` chưa định nghĩa `.modal-footer` hay kiểu dáng cho các nút này.
- `ResultDetailsModal.js`: `.failure-classification` thiếu style cơ sở và các thẻ giá trị `.code-val`, `.error-val` mang viền 1px thô ráp giống ô input đơn giản.
- `style.css`: Đã sẵn sàng mở rộng các quy tắc modal để đưa toàn bộ trải nghiệm modal lên chuẩn Nexora đồng bộ.

## Confirmed Decisions

- Giữ nguyên toàn bộ logic clipboard và sự kiện click đóng/mở modal.
- Giữ nguyên các class name cũ (`btn-copy-path`, `btn-close-modal`, `btn-copy-template`) và kết hợp với `.btn-modal-primary`, `.btn-modal-secondary` để đảm bảo 100% tương thích ngược.

## Constraints

- Không làm thay đổi cấu trúc dữ liệu hoặc API trả về.
- Đảm bảo độ tương phản màu sắc và khả năng truy cập theo tiêu chuẩn WCAG.

## Out of Scope

- Thay đổi backend logic hay cơ chế chạy test Playwright.

## Proposed Implementation

1. Cập nhật `public/css/style.css`:
   - Thêm `.modal-footer`, `.btn-modal-primary`, `.btn-modal-secondary`.
   - Nâng cấp `.failure-classification`, `.comparison-column`, `.comparison-icon-badge`, `.comparison-item-val.code-val`, `.comparison-item-val.error-val`, `.badge-status-failed`, `.modal-section-title`.
2. Cập nhật `public/js/views/TestCasesView.js`:
   - Bổ sung icon copy SVG và class `.btn-modal-primary`, `.btn-modal-secondary` cho `openScriptModal` và `openWriteScriptModal`.
3. Cập nhật `public/js/components/ResultDetailsModal.js`:
   - Tinh chỉnh icon badge trong header của `appendExpectedVsActualSection`.
   - Sử dụng `.modal-section-title` cho các tiêu đề mục Thông Báo Lỗi và Stack Trace.
4. Kiểm thử và xác nhận:
   - `npm run typecheck`
   - `node --check`
   - Validate discussion memory.

## Expected File Changes

- `public/css/style.css`
- `public/js/views/TestCasesView.js`
- `public/js/components/ResultDetailsModal.js`
- `docs/tasks/BDS-255-ui-alignment-and-cleanup.md`

## Open Questions

- [non-blocking] Đã xác định toàn diện mọi điểm cần khắc phục trên 2 modal theo đúng ảnh chụp thực tế.

## Risks and Conflicts

- Không có rủi ro; chỉ nâng cấp giao diện và bổ sung class CSS.

## Impact Analysis

- Trải nghiệm tương tác với modal kịch bản và modal chi tiết kết quả trở nên sắc sảo, hiện đại, hòa nhập hoàn hảo với toàn bộ ngôn ngữ thiết kế Nexora của dashboard.

## Verification Plan

1. Kiểm tra modal Kịch Bản Kiểm Thử: các nút footer hiển thị đẹp mắt, căn phải, hoạt động sao chép chính xác.
2. Kiểm tra modal Chi Tiết Kết Quả: các tag hiển thị dạng pill, thẻ đối sánh Expected/Actual hiển thị đẹp mắt như thiết kế.
3. Chạy `npm run typecheck` và `node --check`.

## Verification Results

1. **Modal Kịch Bản Kiểm Thử (Quick Script Modal)**:
   - Footer `.modal-footer` được bố trí chuyên nghiệp với `justify-content: flex-end`, đệm 18px 28px, nền `#f8fafc` và đường viền trên tinh tế.
   - Nút `[📋 Sao chép đường dẫn]` (và `[📋 Sao chép mã mẫu]`) hiển thị dạng pill button xanh dương gradient với icon copy SVG sắc nét, hiệu ứng hover nâng nổi (`translateY(-1px)`) và bóng đổ mềm.
   - Nút `[Đóng]` hiển thị dạng outline pill button thanh lịch, nền trắng, viền `#cbd5e1`, hover nền `#f1f5f9`.
   - Toàn bộ cơ chế clipboard copy hoạt động trơn tru 100%.

2. **Modal Chi Tiết Kết Quả (Result Details Modal)**:
   - Các nhãn phân loại lỗi (`.failure-classification`) được chuyển đổi toàn diện sang dạng pill mềm mại bo tròn hoàn hảo (`border-radius: var(--radius-pill)`):
     - `🏷️ Lỗi sản phẩm đã ghi nhận`: nền gradient vàng hổ phách dịu (`rgba(254, 243, 199, 0.95)` -> `rgba(253, 230, 138, 0.8)`), viền kính bán trong suốt và bóng nhẹ.
     - `📋 Kịch bản nghiệp vụ chuẩn`: nền gradient slate sáng thanh lịch (`rgba(241, 245, 249, 0.95)` -> `rgba(226, 232, 240, 0.85)`).
   - Thẻ đối sánh **KẾT QUẢ MONG MUỐN (EXPECTED)** vs **KẾT QUẢ THỰC TẾ (ACTUAL)**:
     - Header mỗi cột được trang bị squircle icon badge (`.comparison-icon-badge`, 30x30px, bo góc 9px).
     - Cột Expected: nền gradient xanh băng tuyết (`#eff6ff` -> `#f0f9ff`), viền kính xanh pastel.
     - Cột Actual: nền gradient hồng ngọc dịu (`#fef2f2` -> `#fff1f2`), viền kính đỏ pastel.
     - Ô giá trị `.code-val` (Expected) và `.error-val` (Actual) đã được loại bỏ hoàn toàn giao diện form input thô, thay bằng thẻ hiển thị code-token sang trọng bo góc 10px, viền kính, font mono đậm nét, màu sắc định danh rõ rệt (`#1d4ed8` và `#b91c1c`).
     - Badge đánh giá trạng thái (`.badge-status-failed`, `.badge-status-passed`) thiết kế dạng pill gradient bo tròn mềm mại.
     - Tiêu đề mục lỗi và bằng chứng (`.modal-section-title`) đồng bộ với icon SVG sắc nét.

3. **Kiểm thử tự động & Tính toàn vẹn**:
   - `npm run typecheck`: Vượt qua với 0 lỗi (TypeScript 100% sạch).
   - `npx eslint public/js/views/TestCasesView.js public/js/components/ResultDetailsModal.js`: Đạt 0 lỗi, 0 cảnh báo.
   - `npx playwright test tests/unit/localization/human-readable-messages.spec.ts`: Vượt qua 2/2 tests (100% pass).

## Change Reconciliation

- `public/css/style.css`: Bổ sung `.modal-footer`, `.btn-modal-primary`, `.btn-modal-secondary`, `.comparison-icon-badge`, `.modal-section-title`, nâng cấp toàn diện `.failure-classification`, `.comparison-column`, `.code-val`, `.error-val`, `.badge-status-failed`.
- `public/js/views/TestCasesView.js`: Bổ sung class và icon copy SVG cho modal chân trang `openScriptModal` và `openWriteScriptModal`, cấu hình globals ESLint.
- `public/js/components/ResultDetailsModal.js`: Bổ sung `.comparison-icon-badge`, chuẩn hóa `.modal-section-title` cho Thông Báo Lỗi, Stack Trace và Bằng Chứng.
- `docs/tasks/BDS-255-ui-alignment-and-cleanup.md`: Cập nhật toàn bộ tài liệu kiểm chứng và nghiệm thu hoàn tất.
