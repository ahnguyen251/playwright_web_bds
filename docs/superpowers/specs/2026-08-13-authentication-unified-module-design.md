# Thiết kế tự động hóa MODULE 01 — AUTHENTICATION

Ngày: 2026-08-13

## Mục tiêu và nguồn chuẩn

Triển khai đúng 16 test case của MODULE 01 — AUTHENTICATION trong
`document/Propify_Playwright_TestCase_Unified.md` trên kiến trúc Playwright + TypeScript hiện có.
Mọi Playwright test tương ứng phải bắt đầu bằng đúng ID `TC-AUTH-*`. Metadata và test cũ dùng ID
`AUTH-*` không được coi là coverage nếu nghiệp vụ hoặc Expected Result không khớp tài liệu thống
nhất.

Phạm vi gồm:

- Đăng ký: `TC-AUTH-REGISTER-001` đến `TC-AUTH-REGISTER-008`.
- Đăng nhập: `TC-AUTH-LOGIN-001` đến `TC-AUTH-LOGIN-005`.
- Quên mật khẩu: `TC-AUTH-FORGOT-001` đến `TC-AUTH-FORGOT-003`.

Không sửa hành vi ứng dụng, không chạy Google OAuth thật, không thêm business rule ngoài tài liệu
và không thay đổi module ngoài AUTH.

## Quyết định kiến trúc

Giữ nguyên kiến trúc và cách phân tách theo rủi ro hiện tại:

`Tests → Fixtures → Workflows/Helpers → Page Objects → Playwright`

- Giữ các suite validation/read-only tách khỏi các suite OTP/mutating.
- Giữ OTP/mutating ở Chromium, serial và dưới execution safety gates hiện có.
- Không gộp mọi AUTH case vào ba file lớn nếu việc đó làm mất chính sách project hiện hữu.
- Test chỉ mô tả intent; locator nằm trong Page Object; luồng nhiều màn hình nằm trong Workflow;
  dữ liệu và execution policy nằm ngoài test.

## Luồng OTP

Giữ nguyên luồng OTP hiện đã chạy pass:

- `RegistrationWorkflow` và `PasswordRecoveryWorkflow` dùng chung contract `OtpProvider`.
- `GmailOtpProvider`, `GmailApiClient` và `GmailMessageParser` tiếp tục là hạ tầng Gmail duy nhất.
- Không tạo Gmail adapter hoặc OTP implementation thứ hai.
- Với đăng ký, `requestedAfter` được chụp ngay trước `RegisterPage.submit()`.
- Với quên mật khẩu, `requestedAfter` được chụp ngay trước `ForgotPasswordPage.requestReset()`.
- OTP thật không được hard-code hoặc ghi log. Giá trị OTP sai, khi cần, phải được tạo sao cho chắc
  chắn khác OTP thật.
- Các kiểm tra countdown dùng trạng thái UI/web-first assertions, không dùng `waitForTimeout()`.

Chỉ bổ sung các thao tác/quan sát còn thiếu vào Page Object; không thiết kế lại cơ chế lấy OTP.

## Thành phần thay đổi

### Test-case metadata và test data

- Cập nhật ba file trong `test-cases/authentication/` để phản ánh đúng ID, title, test data và
  Expected Result từ tài liệu thống nhất.
- Dữ liệu email sai và mật khẩu sai dùng đúng các tập giá trị được nêu trong MD.
- Happy-path registration dùng Gmail alias duy nhất từ factory hiện có.
- Forgot-password dùng dedicated mutating user hiện có; password được phục hồi trong `finally` khi
  hạ tầng cho phép.
- Không đưa secret hoặc credential thật vào JSON/TypeScript.

### Page Objects

- `RegisterPage`: bổ sung thao tác trường riêng lẻ, validation/server feedback, submit state,
  resend state và các checkpoint cần thiết cho đúng Expected Result.
- `LoginPage`: bổ sung quan sát điều hướng, message chính xác và các thao tác cho từng required-field
  variant khi cần.
- `ForgotPasswordPage`: bổ sung server feedback và trạng thái OTP/resend còn thiếu.
- Tiếp tục ưu tiên role, label, placeholder và test id. Không dùng `nth()` để giải quyết locator mơ
  hồ; cơ chế OTP đăng ký đang hoạt động được giữ nguyên.

### Workflows, helpers và fixtures

- Tái sử dụng `LoginWorkflow`, `RegistrationWorkflow`, `PasswordRecoveryWorkflow` và auth fixtures.
- Chỉ mở rộng Workflow khi có logic xuyên màn hình dùng lại.
- Thêm helper quan sát request/response AUTH nếu cần để chứng minh request không được gửi hoặc kiểm
  tra response, tránh lặp endpoint/predicate trong test.
- Dùng type guard trên response `unknown`; không dùng `any`.
- Kiểm tra authenticated state bằng URL, UI account control và sự tồn tại của cookie auth. Không
  đọc hoặc in giá trị token.
- Giữ nguyên safety gates cho Gmail, mutation và production.

## Thiết kế test theo Test Case ID

| Test Case ID | Thiết kế coverage | Trạng thái thiết kế |
| --- | --- | --- |
| `TC-AUTH-REGISTER-001` | Unique Gmail alias, quan sát submit loading/disabled, response tạo tài khoản, OTP workflow hiện tại, auth cookie và trạng thái đăng nhập | Có điều kiện Gmail/mutation |
| `TC-AUTH-REGISTER-002` | Form trống, validation bắt buộc và request count bằng 0 | Tự động |
| `TC-AUTH-REGISTER-003` | Data-driven đúng ba email sai, blur và message chính xác | Tự động |
| `TC-AUTH-REGISTER-004` | Submit email tài khoản hiện có, message duplicate và không authenticated | Tự động nếu backend có contract ổn định |
| `TC-AUTH-REGISTER-005` | Data-driven đúng bốn mật khẩu sai và message complexity chính xác | Tự động |
| `TC-AUTH-REGISTER-006` | Password confirmation mismatch, blur và message chính xác | Tự động |
| `TC-AUTH-REGISTER-007` | Nhánh OTP sai dùng backend thật; nhánh hết hạn chỉ chạy khi có expiry contract xác định | Một phần; expiry BLOCKED |
| `TC-AUTH-REGISTER-008` | Disabled ngay sau gửi và web-first wait đến enabled theo countdown UI | Có điều kiện Gmail/mutation |
| `TC-AUTH-LOGIN-001` | Login Active user, home navigation, account UI và auth-cookie presence | Tự động, Smoke |
| `TC-AUTH-LOGIN-002` | Sai password, exact server message, giữ nguyên trang và unauthenticated | Tự động |
| `TC-AUTH-LOGIN-003` | Chỉ chạy khi có deterministic Locked user hoặc API seed/reset contract | BLOCKED |
| `TC-AUTH-LOGIN-004` | Hai required-field variant và login request count bằng 0 | Tự động |
| `TC-AUTH-LOGIN-005` | Chỉ chạy với deterministic OAuth mock; không chạy Google thật | EXCLUDED/BLOCKED |
| `TC-AUTH-FORGOT-001` | Dedicated user, shared OTP provider, đổi password, kiểm tra success/login và phục hồi baseline trong cleanup | Có điều kiện Gmail/mutation |
| `TC-AUTH-FORGOT-002` | Unique valid-but-nonexistent email, exact error và giữ nguyên email stage | Tự động nếu backend có contract ổn định |
| `TC-AUTH-FORGOT-003` | Nhánh OTP sai dùng backend thật; nhánh hết hạn chỉ chạy khi có expiry contract xác định | Một phần; expiry BLOCKED |

## Chính sách BLOCKED và EXCLUDED

Không tạo route mock để biến E2E nghiệp vụ thành test pass giả.

- `TC-AUTH-LOGIN-003` bị chặn vì repository không có Locked account config, seed helper hoặc API
  reset trạng thái.
- `TC-AUTH-LOGIN-005` bị loại khỏi execution vì repository không có OAuth mock xác định.
- Nhánh OTP hết hạn của `TC-AUTH-REGISTER-007` và `TC-AUTH-FORGOT-003` bị chặn vì không có server
  clock, TTL override, expired-OTP seed hoặc fault injection.
- Thiếu biến môi trường hoặc safety flag tạo execution skip có lý do, không được báo là pass.
- Mỗi placeholder bị chặn vẫn dùng đúng Test Case ID và blocker cụ thể để giữ traceability.

Nếu một Test Case ID gồm cả nhánh có thể chạy và nhánh bị chặn, hai test có thể dùng chung ID với hậu
tố mô tả nhánh. Trạng thái tổng thể của ID được báo là “Tự động một phần / BLOCKED” cho đến khi mọi
Expected Result trong case đều có bằng chứng.

## Đồng bộ và assertion

- Dùng Playwright web-first assertions cho UI state và navigation.
- Chỉ dùng `expect.poll()` cho trạng thái backend/realtime thực sự bất đồng bộ.
- Không dùng fixed sleep hoặc `waitForTimeout()`.
- Đối với “không gọi API”, listener được gắn trước thao tác và request count được kiểm tra sau chuỗi
  tương tác đồng bộ của UI.
- Đối với loading ngắn, quan sát transition của thuộc tính button quanh request thay vì làm chậm hoặc
  mock response happy path.
- Không log request body chứa password, OTP, cookie hoặc token.

## Verification và báo cáo

Sau triển khai:

1. Chạy TypeScript check.
2. Chạy component/unit tests của các Page Object, Workflow, fixture/helper bị thay đổi.
3. Chạy đúng AUTH module bằng command được ghi lại nguyên văn.
4. Sửa lỗi automation; không sửa application để ép test pass.
5. Báo cáo từng Test Case ID: Automated/Partial/BLOCKED/EXCLUDED, spec file, supporting files,
   execution result và blocker.

Các thay đổi Listing và file không liên quan đang có trong working tree phải được giữ nguyên, không
stage và không sửa.
