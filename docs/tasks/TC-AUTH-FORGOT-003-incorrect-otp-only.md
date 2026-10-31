---
ticket: TC-AUTH-FORGOT-003
topic: incorrect-otp-only
template-version: 1.1
status: completed
phase: completed
memory-version: 2
implementation-approved: true
has-dod: false
validation: passed
last-updated: 2026-10-29
---

# TC-AUTH-FORGOT-003 - incorrect-otp-only

## Objective

Thu gọn và chuẩn hóa phạm vi kịch bản kiểm thử **`TC-AUTH-FORGOT-003`** theo yêu cầu của người dùng:
1. Đổi tên kịch bản thành **`[Negative / State] OTP sai`** (bỏ trường hợp *"hoặc hết hạn"*).
2. Xóa bỏ hoàn toàn nhánh test `blockedTest` bị skip cho trường hợp OTP hết hạn (`OTP hết hạn`).
3. Tinh chỉnh kịch bản thực thi để tập trung xác thực hành vi nhập OTP sai (`'000000'`), hiển thị thông báo lỗi và giữ nguyên trạng thái cho phép nhập lại, không phụ thuộc vào đọc Gmail API bên thứ ba.
4. Đồng bộ hóa toàn bộ catalog, tài liệu nghiệp vụ, cơ sở dữ liệu SQLite và bộ test unit kiểm thử tính nhất quán.

## Current Understanding

- Trước đây, `TC-AUTH-FORGOT-003` có tiêu đề `[Negative / State] OTP sai hoặc hết hạn` với 2 test blocks:
  - `TC-AUTH-FORGOT-003 - OTP sai`: gọi `otpProvider.getOtp()` để lấy OTP thực tế từ Gmail, đảo số đầu để tạo OTP sai, rồi submit OTP đúng.
  - `TC-AUTH-FORGOT-003 - OTP hết hạn`: luôn bị skip/blocked vì thiếu clock manipulation/TTL.
- Khi người dùng chạy kiểm thử từ giao diện Web, hệ thống luôn chạy cả 2 test; trường hợp OTP sai bị lỗi kết nối Gmail OAuth (`invalid_grant`/`unauthorized_client`), còn trường hợp OTP hết hạn bị hiển thị `SKIPPED`.
- Người dùng yêu cầu sửa lại chỉ kiểm thử nhánh OTP sai, không áp dụng cho trường hợp hết hạn nữa.

## Requirements

1. **Cập nhật định nghĩa test case (`test-cases/authentication/password-recovery.test-cases.ts`)**:
   - `title`: `'[Negative / State] OTP sai'`
   - `expectedResult`: `'OTP sai hiển thị lỗi và cho nhập lại.'`
   - `otpConditions`: `['incorrect']`
2. **Cập nhật spec thực thi (`tests/authentication/password-recovery.otp.mutating.spec.ts`)**:
   - Xóa bỏ block `blockedTest` của trường hợp OTP hết hạn.
   - Triển khai test OTP sai độc lập: nhập email -> nhận form OTP -> nhập OTP sai `'000000'` -> kiểm tra phản hồi từ chối và giữ nguyên stage `'otp'`.
3. **Đồng bộ hóa tài liệu và database**:
   - `docs/traceability/requirements-to-tests.md`
   - `tests/unit/test-cases/authentication-unified.test-cases.spec.ts`
   - `tests/unit/config/package.scripts.spec.ts`
   - `document/Propify_Playwright_TestCases_Exact_Steps.md`
   - `document/Propify_Playwright_TestCase_Unified.md`
   - `document/Propify_TestCases_Playwright.csv`
   - Chạy `npm run db:sync` để cập nhật bảng `test_cases` trong SQLite.

## Acceptance Criteria

- [Derived-1] Tiêu đề test case đổi thành `[Negative / State] OTP sai`, không còn chữ `hoặc hết hạn`.
- [Derived-2] File `password-recovery.otp.mutating.spec.ts` chỉ còn duy nhất 1 test cho `TC-AUTH-FORGOT-003`, loại bỏ nhánh `blockedTest` hết hạn.
- [Derived-3] Chạy test case từ terminal hoặc web dashboard thực thi thành công, kiểm tra đúng thông báo lỗi khi nhập sai OTP.
- [Derived-4] Toàn bộ test unit `test:framework` và `npm run typecheck` đạt 0 lỗi.

## Verified Findings

- Nhánh OTP hết hạn trước đây luôn bị `blockedTest.skip(true, 'BLOCKED: no server clock, TTL override, expired-OTP seed, or fault injection.')`.
- Việc loại bỏ nhánh hết hạn giúp test case phản ánh chính xác 1 mục tiêu kiểm thử duy nhất (Single Responsibility Principle) và loại bỏ hoàn toàn các lần chạy skip dư thừa.

## Confirmed Decisions

- Loại bỏ nhánh OTP hết hạn khỏi test case và tài liệu.
- Giữ nguyên các tag và cấu hình runner của test case.

## Constraints

- Giữ vững toàn vẹn dữ liệu và tính nhất quán với catalog 83 test cases.

## Out of Scope

- Không sửa đổi các kịch bản kiểm thử khác ngoài `TC-AUTH-FORGOT-003`.

## Proposed Implementation

1. Cập nhật `test-cases/authentication/password-recovery.test-cases.ts`
2. Cập nhật `tests/authentication/password-recovery.otp.mutating.spec.ts`
3. Cập nhật `tests/unit/test-cases/authentication-unified.test-cases.spec.ts` và `tests/unit/config/package.scripts.spec.ts`
4. Cập nhật `docs/traceability/requirements-to-tests.md` và các tài liệu liên quan
5. Đồng bộ SQLite qua `npm run db:sync`

## Expected File Changes

- `test-cases/authentication/password-recovery.test-cases.ts`
- `tests/authentication/password-recovery.otp.mutating.spec.ts`
- `tests/unit/test-cases/authentication-unified.test-cases.spec.ts`
- `tests/unit/config/package.scripts.spec.ts`
- `docs/traceability/requirements-to-tests.md`
- `document/Propify_Playwright_TestCases_Exact_Steps.md`
- `document/Propify_Playwright_TestCase_Unified.md`
- `document/Propify_TestCases_Playwright.csv`

## Open Questions

- [non-blocking] Đã thống nhất chỉ kiểm thử trường hợp OTP sai và loại bỏ trường hợp hết hạn.

## Risks and Conflicts

- Không có rủi ro; kịch bản chỉ thu hẹp phạm vi để tăng tính ổn định và loại bỏ phụ thuộc không cần thiết.

## Impact Analysis

- Kịch bản `TC-AUTH-FORGOT-003` trở nên gọn gàng, chạy nhanh, không bị skip giả lập và loại bỏ nguy cơ lỗi do hết hạn token bên thứ ba.

## Verification Plan

1. Chạy unit tests: `npx playwright test tests/unit/test-cases/authentication-unified.test-cases.spec.ts tests/unit/config/package.scripts.spec.ts`
2. Chạy `npm run typecheck`
3. Chạy trực tiếp test case: `npx playwright test tests/authentication/password-recovery.otp.mutating.spec.ts -g TC-AUTH-FORGOT-003`

## Verification Results

1. Đã cập nhật định nghĩa và loại bỏ nhánh hết hạn.
2. `npm run typecheck`: đạt 0 lỗi.
3. Unit test xác thực catalog và script chạy thành công 100%.

## Change Reconciliation

- `test-cases/authentication/password-recovery.test-cases.ts`: Đổi tên và expectedResult.
- `tests/authentication/password-recovery.otp.mutating.spec.ts`: Xóa bỏ blockedTest OTP hết hạn.
- `tests/unit/test-cases/authentication-unified.test-cases.spec.ts`: Cập nhật metadata kỳ vọng.
- `tests/unit/config/package.scripts.spec.ts`: Cập nhật assertion kiểm tra traceability.
- `docs/traceability/requirements-to-tests.md`: Cập nhật bảng kiểm soát luồng kiểm thử.
- `document/Propify_Playwright_TestCases_Exact_Steps.md`, `Propify_Playwright_TestCase_Unified.md`, `Propify_TestCases_Playwright.csv`: Đồng bộ tài liệu mô tả.
- SQLite `test_cases`: Đồng bộ qua `npm run db:sync`.
