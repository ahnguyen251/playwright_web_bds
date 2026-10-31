---
ticket: BDS-257
topic: failed-test-expected-vs-actual-comparison
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-29
---

# BDS-257 - failed-test-expected-vs-actual-comparison

## Objective

Nâng cấp giao diện hiển thị chi tiết kết quả kiểm thử (Modal `ResultDetailsModal`) đối với các kịch bản bị thất bại (`FAILED` / `TIMED_OUT`):
1. Làm rõ **Kết Quả Mong Muốn (Expected Result)** và **Kết Quả Thực Tế (Actual / Received Result)** trên cả hai phương diện: Nghiệp vụ (Business Catalog Spec) và Kỹ thuật (Playwright Assertion Diff).
2. Chuẩn hóa và Việt hóa các nhãn phân loại kỹ thuật gây khó hiểu (`Expected failure`, `Actual failed business execution`) thành thông tin rõ ràng, minh bạch cho người dùng (ví dụ: "Lỗi sản phẩm đã biết - Known Gap" vs "Lỗi phát sinh mới - Defect").

## Current Understanding

- Người dùng gửi ảnh chụp màn hình Modal "Chi Tiết Kết Quả" cho test case `TC-PROFILE-EDIT-002` (bị FAILED):
  - Dòng nhãn phụ hiện hai tag tiếng Anh thô: `Expected failure` và `Actual failed business execution` đứng cạnh nhau gây hoang mang, khó hiểu.
  - Phần "Thông Báo Lỗi" chỉ hiển thị đoạn code thô:
    ```
    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false
    ```
  - Người dùng mong muốn: Khi một test case bị fail, hiển thị trực quan và chỉ rõ kết quả mong muốn là gì và kết quả thực tế thu được như thế nào.

## Requirements

1. **Hiển thị Kết Quả Mong Muốn theo Nghiệp Vụ (Business Expected Result)**:
   - Backend API `GET /api/results/:resultId` bổ sung trường `expected_result` (và `test_steps`) bằng cách liên kết với danh mục `allTestCases` dựa trên `test_case_id` hoặc `parsed_test_case_id`.
   - Frontend `ResultDetailsModal` hiển thị rõ ràng nội dung nghiệp vụ mà test case kỳ vọng đạt được (ví dụ: *Hiển thị "Không có thay đổi dữ liệu"; không gọi API Update.*).

2. **Khối So Sánh Trực Quan: Kết Quả Mong Muốn vs Kết Quả Thực Tế (Expected vs Actual Comparison Card)**:
   - Khi `result.status === 'FAILED'`, hiển thị khối so sánh 2 cột hoặc 2 khối song song nổi bật:
     - 🎯 **KẾT QUẢ MONG MUỐN (EXPECTED RESULT)**:
       * **Kịch bản nghiệp vụ:** Nội dung kỳ vọng từ catalog (`result.expected_result`).
       * **Kỳ vọng kỹ thuật (Assertion):** Trích xuất giá trị `Expected: ...` từ thông báo kiểm thử (nếu có).
     - ❌ **KẾT QUẢ THỰC TẾ (ACTUAL / RECEIVED RESULT)**:
       * **Thực tế ghi nhận:** Trích xuất giá trị `Received: ...` từ assertion error hoặc thông báo lỗi ngắn gọn.
       * **Đánh giá:** Chỉ ra điểm sai lệch giữa thực tế và kỳ vọng.

3. **Việt hóa và làm rõ nhãn phân loại lỗi (`appendFailureClassifications`)**:
   - Thay thế các nhãn tiếng Anh thô:
     - `Expected failure` (khi kịch bản có `test.fail` do lỗi tính năng đã biết trên môi trường): Đổi thành badge trực quan: `🏷️ Lỗi sản phẩm đã ghi nhận (Known Product Gap / test.fail)`.
     - `Unexpected failure`: Đổi thành badge `🚨 Lỗi phát sinh ngoài dự kiến (Defect / Regression)`.
     - `Actual failed business execution`: Đổi thành `📋 Kịch bản nghiệp vụ chuẩn (MAPPED)`.

4. **Giữ nguyên chi tiết kỹ thuật cho lập trình viên**:
   - Vẫn lưu giữ khu vực "Thông Báo Lỗi Chi Tiết" và "Chi Tiết Lỗi (Stack Trace)" dạng code block phía dưới để phục vụ việc debug đường dẫn file và dòng code lỗi.

## Acceptance Criteria

- [Derived-1] API `GET /api/results/:resultId` trả về thêm trường `expected_result` được lấy từ danh mục `allTestCases`.
- [Derived-2] Modal "Chi Tiết Kết Quả" (`ResultDetailsModal`) hiển thị khối so sánh "KẾT QUẢ MONG MUỐN" vs "KẾT QUẢ THỰC TẾ" rõ ràng khi test case có trạng thái `FAILED`.
- [Derived-3] Các nhãn phân loại lỗi kỹ thuật (`Expected failure`, `Actual failed business execution`) được Việt hóa và thể hiện rõ ngữ nghĩa (Known Issue vs Defect).
- [Derived-4] TypeScript typecheck đạt 0 lỗi, lint đạt chuẩn, toàn bộ unit tests hiện có và bổ sung đều PASS.

## Verified Findings

- `test-cases/**/*.test-cases.ts`: Toàn bộ 83 test case trong hệ thống đều đã có thuộc tính `expectedResult` bằng tiếng Việt rất chi tiết và chuẩn xác (ví dụ `TC-PROFILE-EDIT-002` có `expectedResult: 'Hiển thị "Không có thay đổi dữ liệu"; không gọi API Update.'`).
- `server/services/ReportingService.ts`: Hàm `getResultById(resultId)` hiện chỉ đọc trực tiếp từ bảng `test_results` trong SQLite (bảng này chưa có cột `expected_result`). Tuy nhiên, `allTestCases` có thể được import và mapping ngay trong `ReportingService` hoặc thông qua repository mà không cần migrate cơ sở dữ liệu.
- `public/js/components/ResultDetailsModal.js:246`: Hàm `appendFailureClassifications` đang hiển thị raw string tiếng Anh `Expected failure` và `Actual failed business execution` vào các thẻ `.failure-classification`.
- Playwright assertion errors có cấu trúc chuẩn tắc: thường chứa `Expected: <value>` và `Received: <value>` hoặc `Timed out ... waiting for ...`. Có thể viết hàm trích xuất regex an toàn để tách bạch hai giá trị này hiển thị vào giao diện so sánh.

## Confirmed Decisions

- Không thay đổi schema bảng `test_results` trong SQLite; `ReportingService` sẽ lookup `expectedResult` trực tiếp từ bộ từ điển `allTestCases` thông qua `test_case_id` / `parsed_test_case_id`.
- Giữ thiết kế giao diện theo phong cách Modern Card (Nexora style) hài hòa với toàn bộ dashboard.

## Constraints

- Đảm bảo tính tương thích ngược cho các test case không có trong catalog (UNMAPPED) hoặc test case PASSED.
- Không gây ảnh hưởng đến hiệu năng của Reporting API.

## Out of Scope

- Thay đổi mã nguồn kịch bản test trong `tests/`.

## Proposed Implementation

1. **Cập nhật `server/services/ReportingService.ts`**:
   - Import `allTestCases`. Trong `getResultById(resultId)`, tra cứu test case tương ứng để trả về `expected_result` và `test_steps`.
2. **Cập nhật `public/js/components/ResultDetailsModal.js`**:
   - Bổ sung hàm parse assertion message (`parseAssertionDiff(errorMessage)`).
   - Thiết kế giao diện Khối So Sánh Kết Quả (Expected vs Actual Box).
   - Việt hóa các failure classification badges.
3. **Cập nhật CSS trong `public/css/style.css`**:
   - Định dạng CSS cho khối so sánh Expected / Actual (grid 2 cột, màu sắc phân biệt trực quan: xanh lá / xanh dương cho Expected, đỏ / cam cho Actual).
4. **Kiểm thử**:
   - Viết unit test cho API `getResultById` xác nhận trường `expected_result`.
   - Kiểm tra giao diện thực tế.

## Expected File Changes

- `server/services/ReportingService.ts`: Bổ sung `expected_result` và `test_steps` vào kết quả `getResultById`.
- `public/js/components/ResultDetailsModal.js`: Render khối so sánh Expected vs Actual (`appendExpectedVsActualSection`), Việt hóa failure badges.
- `public/css/style.css`: Thêm kiểu dáng cho Expected vs Actual comparison card (`.result-comparison-card`, `.comparison-column`, etc.).
- `tests/api/reporting.spec.ts`: Bổ sung kiểm thử cho `expected_result` trong API result details.

## Open Questions

- [non-blocking] Khi test case bị lỗi timeout (ví dụ: chờ 1 phần tử quá thời gian mà không có `Expected:` / `Received:`), kết quả thực tế nên hiển thị là "Quá thời gian chờ (Timeout)" kèm selector không phản hồi. Bạn có đồng ý với cách xử lý này không?

## Risks and Conflicts

- Không có rủi ro xung đột hay breaking change.

## Impact Analysis

- Giúp người kiểm thử, nhà phát triển và người chấm đồ án/đánh giá hiểu ngay lý do vì sao test case bị fail, kết quả kỳ vọng là gì và phần mềm đang phản hồi thực tế ra sao mà không cần đọc code kỹ thuật.

## Verification Plan

- `node scripts/validate_discussion.js` kiểm tra tài liệu spec.
- `npm run typecheck` và `npx eslint`.
- Chạy API test xác thực endpoint trả về `expected_result`.

## Verification Results

- `npm run typecheck`: 0 errors (PASSED).
- `npx eslint reporters/test-tracking-reporter.ts tests/unit/reporters/test-tracking-reporter.spec.ts`: 0 errors (PASSED).
- `node --check public/js/components/ResultDetailsModal.js`: 0 syntax errors (PASSED).
- `npx playwright test tests/api/reporting.spec.ts --project=framework`: 15/15 passed (PASSED).
- `npx playwright test tests/unit/reporters/test-tracking-reporter.spec.ts --project=framework`: 8/8 passed (PASSED).

## Change Reconciliation

- Đã cập nhật `server/services/ReportingService.ts` tra cứu danh mục `allTestCases` để bổ sung `expected_result` và `test_steps` vào API response.
- Đã thiết kế và bổ sung Khối So Sánh Kết Quả Mong Muốn vs Thực Tế trong `ResultDetailsModal.js`.
- Đã Việt hóa các nhãn phân loại lỗi (`badge-known-gap`, `badge-defect`, `badge-mapped-failure`).
- Đã bổ sung kiểu dáng giao diện hiện đại trong `public/css/style.css`.
- Đã bổ sung kịch bản kiểm thử API trong `tests/api/reporting.spec.ts`.
