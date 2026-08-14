# Requirements-to-Tests Traceability

Tài liệu này phản ánh mã nguồn và test case đang tồn tại trên nhánh Authentication. Các cột
“mutating” mô tả coverage đã triển khai nhưng chỉ thực thi khi execution policy cho phép; kết quả
`skip` khi policy tắt không được ghi nhận là một lần chạy E2E thành công.

## MODULE 01 — AUTHENTICATION

Nguồn authoritative là `document/Propify_Playwright_TestCase_Unified.md`. Bảng dưới đây chỉ ánh xạ
16 case được yêu cầu cho Registration, Login và Forgot Password. `Automated` mô tả case có đường chạy
thực thi; khi có ghi “conditional”, lần chạy vẫn cần đủ execution gate và dữ liệu môi trường. `Partial`
nghĩa là chỉ một nhánh hoặc một phần Expected Result có thể kiểm chứng. `BLOCKED` và `EXCLUDED` không
được tính là pass.

| Test Case ID           | Trạng thái | Spec                                                                                                             | Page Object / Workflow / Fixture                                                                                           | Kết quả thực thi hoặc blocker                                                                                                                                                                                                                                       |
| ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-AUTH-REGISTER-001` | Partial    | `tests/authentication/registration.otp.mutating.spec.ts`, `tests/authentication/registration.production.spec.ts` | `RegisterPage`, `RegistrationWorkflow`, `AuthRequestObserver`, `OtpProvider`, unique registration fixture, `BrowserHelper` | Conditional: đã discover nhưng safe run skip khi OTP/mutation hoặc production-registration gate tắt. Luồng kiểm tra HTTP 2xx, submit/OTP/authenticated UI, home URL và tên cookie; response body/account `PENDING` vẫn BLOCKED vì chưa có schema backend công khai. |
| `TC-AUTH-REGISTER-002` | BLOCKED    | `tests/authentication/registration.validation.spec.ts`                                                           | `RegisterPage`, `AuthRequestObserver` fixture                                                                              | UI triển khai giữ submit disabled, không phát required-field messages và không gửi registration request; không thể chứng minh đầy đủ Expected Result click + toàn bộ lỗi bắt buộc.                                                                                  |
| `TC-AUTH-REGISTER-003` | BLOCKED    | `tests/authentication/registration.validation.spec.ts`                                                           | `RegisterPage`, validation data                                                                                            | UI triển khai trả legacy copy, khác exact Expected Result trong tài liệu.                                                                                                                                                                                           |
| `TC-AUTH-REGISTER-004` | BLOCKED    | `tests/authentication/registration.validation.spec.ts`                                                           | `RegisterPage`, environment-backed existing user                                                                           | UI triển khai trả field/generic legacy copy, khác exact Expected Result `Email đã tồn tại`.                                                                                                                                                                         |
| `TC-AUTH-REGISTER-005` | BLOCKED    | `tests/authentication/registration.validation.spec.ts`                                                           | `RegisterPage`, data-driven password table                                                                                 | UI triển khai chỉ trả legacy minimum-length feedback, không trả exact combined complexity feedback.                                                                                                                                                                 |
| `TC-AUTH-REGISTER-006` | BLOCKED    | `tests/authentication/registration.validation.spec.ts`                                                           | `RegisterPage`, validation data                                                                                            | UI triển khai trả legacy mismatch copy, khác exact Expected Result.                                                                                                                                                                                                 |
| `TC-AUTH-REGISTER-007` | Partial    | `tests/authentication/registration.otp.mutating.spec.ts`                                                         | `RegisterPage`, `RegistrationWorkflow`, shared `OtpProvider`                                                               | Nhánh OTP sai là Automated/conditional và safe run skip khi gate tắt; nhánh OTP hết hạn BLOCKED vì không có server clock, TTL override, expired-OTP seed hoặc fault injection.                                                                                      |
| `TC-AUTH-REGISTER-008` | Automated  | `tests/authentication/registration.otp.mutating.spec.ts`                                                         | `RegisterPage`, `RegistrationWorkflow`, shared `OtpProvider`                                                               | Conditional: đã discover; safe run skip khi gate tắt. Test kiểm tra resend disabled rồi chờ enabled bằng web-first assertion, không dùng fixed wait.                                                                                                                |
| `TC-AUTH-LOGIN-001`    | Automated  | `tests/authentication/login.positive.spec.ts`                                                                    | `LoginPage`, `HeaderComponent`, `AuthRequestObserver`, default-user fixture, `BrowserHelper`                               | Smoke có executable assertions cho HTTP 200, home URL, authenticated UI và tên cookie. Module run cuối PASS trên Chromium/WebKit và FAIL trên Firefox vì endpoint trả HTTP 500; không chuyển lỗi này thành skip/pass.                                               |
| `TC-AUTH-LOGIN-002`    | BLOCKED    | `tests/authentication/login.negative.spec.ts`                                                                    | `LoginPage`, `LoginWorkflow`, `AuthRequestObserver`, default-user fixture                                                  | URL và trạng thái unauthenticated kiểm tra được, nhưng UI trả legacy invalid-credentials copy hoặc endpoint HTTP 500 thay vì exact Expected Result.                                                                                                                 |
| `TC-AUTH-LOGIN-003`    | BLOCKED    | `tests/authentication/login.negative.spec.ts`                                                                    | `LoginPage`, `LoginWorkflow`, optional `lockedUser` fixture                                                                | Chưa có cặp `LOCKED_USER_EMAIL`/`LOCKED_USER_PASSWORD` trong execution environment; skip này không phải pass.                                                                                                                                                       |
| `TC-AUTH-LOGIN-004`    | Partial    | `tests/authentication/login.boundary.spec.ts`                                                                    | `LoginPage`, `AuthRequestObserver`, default-user fixture                                                                   | Thiếu Email/SĐT PASS với zero login POST; thiếu password BLOCKED vì UI giữ Continue enabled và phát đúng một login POST.                                                                                                                                            |
| `TC-AUTH-LOGIN-005`    | EXCLUDED   | `tests/authentication/login.boundary.spec.ts`                                                                    | Explicit excluded test; không gọi Google control                                                                           | Không có repository-owned deterministic OAuth mock; không tự động hóa real Google login.                                                                                                                                                                            |
| `TC-AUTH-FORGOT-001`   | Automated  | `tests/authentication/password-recovery.otp.mutating.spec.ts`                                                    | `ForgotPasswordPage`, `LoginPage`, `PasswordRecoveryWorkflow`, shared `OtpProvider`, `mutatingUser` fixture                | Conditional: đã discover; safe run skip khi OTP/mutation gates tắt. Executable path đổi mật khẩu, đăng nhập bằng mật khẩu mới và luôn thử phục hồi baseline trong nested `finally`.                                                                                 |
| `TC-AUTH-FORGOT-002`   | BLOCKED    | `tests/authentication/password-recovery.validation.spec.ts`                                                      | `ForgotPasswordPage`, `AuthRequestObserver`, `AuthenticationDataFactory`                                                   | Request thật giữ stage `email`. Module run cuối skip trên Chromium/WebKit vì exact legacy copy đã biết và FAIL trên Firefox với `Lỗi hệ thống`; không nhánh nào được ghi nhận pass cho authoritative Expected Result.                                               |
| `TC-AUTH-FORGOT-003`   | Partial    | `tests/authentication/password-recovery.otp.mutating.spec.ts`                                                    | `ForgotPasswordPage`, `PasswordRecoveryWorkflow`, shared `OtpProvider`, `mutatingUser` fixture                             | Nhánh OTP sai là Automated/conditional và safe run skip khi gate tắt; nhánh OTP hết hạn BLOCKED vì thiếu clock/TTL/expired seed/fault injection deterministic.                                                                                                      |

Các case Profile và Change Password dùng catalog legacy riêng, không thuộc 16 case của MODULE 01 trong
tài liệu unified và không được đưa vào `npm run test:auth`.

## Bằng chứng kiến trúc và an toàn

| Yêu cầu framework                                               | Implementation evidence                                                                      | Automated/static evidence                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Chọn môi trường và validate flag/secret contract                | `config/environment.schema.ts`, `config/environment.config.ts`, `types/environment.types.ts` | `tests/unit/config/environment.config.spec.ts`                                               |
| Credential indirection và nhiều user                            | `test-data/static/users.json`, `UserDataFactory`, `fixtures/auth.fixture.ts`                 | `UserDataFactory.spec.ts`, `test.fixture.spec.ts`                                            |
| Locator chỉ ở Page Object/component                             | `pages/**`, ESLint restricted syntax cho `tests/**` và `workflows/**`                        | `npm run lint`                                                                               |
| Workflow nhỏ và OTP adapter được inject                         | `workflows/authentication/**`, `types/otp.types.ts`, `helpers/otp/**`                        | `tests/unit/workflows/authentication/**`, `tests/unit/helpers/otp/**`                        |
| Safe default và lazy Gmail dependency                           | `ExecutionPolicy`, `DisabledOtpProvider`, `playwright.config.ts`                             | `environment.config.spec.ts`, `test.fixture.spec.ts`                                         |
| Mutating chạy serial, Chromium-only, không ghi secret artifacts | project `mutating-chromium`; `*.mutating.spec.ts`                                            | `tests/unit/config/playwright.config.spec.ts`, `test.describe.configure({ mode: 'serial' })` |
| Auth state dùng lại                                             | `tests/setup/auth.setup.ts`, `.auth/defaultUser.json`                                        | project `auth-setup` và dependency của browser projects                                      |
| Multi-browser và parallel cho non-mutating                      | projects `chromium`, `firefox`, `webkit`; `fullyParallel: true`                              | `npx playwright test --list` và cấu hình Playwright                                          |
| HTML/Allure và failure artifacts                                | reporters và `use` trong `playwright.config.ts`                                              | `playwright.config.spec.ts`; thư mục report/result được Git ignore                           |

## Trạng thái và giới hạn

- `npm run test:auth` chỉ chọn `tests/authentication` và loại các tag `@external`/`@mutating`;
  Profile không còn bị kéo vào module command này.
- `npm run test:auth:external` chạy serial các case có tag `@external` hoặc `@mutating`. Để thực thi
  thay vì chỉ discover/skip cần đồng thời `RUN_OTP_E2E=true`, `RUN_MUTATING_E2E=true`, cấu hình Gmail
  được liệt kê trong `.env.example`, và identity chuyên dụng tương ứng. Không ghi giá trị secret vào
  tài liệu hoặc log.
- Mutation trên production còn cần flag approval production phù hợp. Registration production cần
  `RUN_PRODUCTION_REGISTRATION_E2E=true` và bộ `REGISTRATION_*`; password recovery cần bộ
  `MUTATING_USER_*` có thể phục hồi baseline.
- `TC-AUTH-LOGIN-003` chỉ chạy khi cả `LOCKED_USER_EMAIL` và `LOCKED_USER_PASSWORD` cùng tồn tại.
- Google OAuth, expired OTP, response body/account `PENDING` chưa có deterministic contract; các phần
  đó giữ nguyên EXCLUDED/BLOCKED thay vì route interception hoặc fake assertion.

## Listings

Nguồn nghiệp vụ: `document/NghiepvuPropify.pdf`, UC-08 đến UC-17. Hằng metadata chuẩn là
`listingTestCases` trong `test-cases/listings/listing.test-cases.ts`. “Có thay đổi” luôn đi qua
`mutatingTest`; “Gỡ tin” chỉ chuyển sang `Đã gỡ`, ẩn công khai và không xóa bản ghi cơ sở dữ liệu.

| Mã kịch bản            | Yêu cầu        | Phân loại   | Metadata         | Bằng chứng                                                          | Trạng thái |
| ---------------------- | -------------- | ----------- | ---------------- | ------------------------------------------------------------------- | ---------- |
| LIST-UC08-001          | UC-08          | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC08-002          | UC-08          | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC08-003          | UC-08          | Có thay đổi | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC08-004          | UC-08          | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC08-005          | UC-08          | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC08-006          | UC-08          | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC08-007          | UC-08          | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC08-008          | UC-08          | Có thay đổi | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC09-001          | UC-09          | Chỉ đọc     | listingTestCases | tests/listings/view-own-listings.read-only.spec.ts                  | Tự động    |
| LIST-UC09-002          | UC-09          | Chỉ đọc     | listingTestCases | tests/component/pages/MyListingsPage.spec.ts                        | Tự động    |
| LIST-UC09-003          | UC-09          | Chỉ đọc     | listingTestCases | tests/listings/view-own-listings.read-only.spec.ts                  | Tự động    |
| LIST-UC09-004          | UC-09          | Chỉ đọc     | listingTestCases | tests/component/pages/MyListingsPage.spec.ts                        | Tự động    |
| LIST-UC09-005          | UC-09          | Chỉ đọc     | listingTestCases | tests/component/pages/MyListingsPage.spec.ts                        | Tự động    |
| LIST-UC09-006          | UC-09          | Chỉ đọc     | listingTestCases | tests/listings/view-own-listings.read-only.spec.ts                  | Tự động    |
| LIST-UC09-007          | UC-09          | Chỉ đọc     | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC10-001          | UC-10          | Chỉ đọc     | listingTestCases | tests/listings/listing-detail.read-only.spec.ts                     | Tự động    |
| LIST-UC10-002          | UC-10          | Chỉ đọc     | listingTestCases | tests/listings/listing-detail.read-only.spec.ts                     | Tự động    |
| LIST-UC10-003          | UC-10          | Chỉ đọc     | listingTestCases | tests/listings/listing-detail.read-only.spec.ts                     | Tự động    |
| LIST-UC10-004          | UC-10          | Chỉ đọc     | listingTestCases | tests/listings/listing-detail.read-only.spec.ts                     | Tự động    |
| LIST-UC10-005          | UC-10          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingDetailPage.spec.ts                     | Tự động    |
| LIST-UC11-EDIT-001     | UC-11-EDIT     | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC11-EDIT-002     | UC-11-EDIT     | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC11-EDIT-003     | UC-11-EDIT     | Có thay đổi | listingTestCases | tests/listings/edit-listing.mutating.spec.ts                        | Tự động    |
| LIST-UC11-EDIT-004     | UC-11-EDIT     | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC11-EDIT-005     | UC-11-EDIT     | Có thay đổi | listingTestCases | tests/component/pages/ListingFormComponent.spec.ts                  | Tự động    |
| LIST-UC11-WITHDRAW-001 | UC-11-WITHDRAW | Có thay đổi | listingTestCases | tests/listings/withdraw-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC11-WITHDRAW-002 | UC-11-WITHDRAW | Có thay đổi | listingTestCases | tests/listings/withdraw-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC11-WITHDRAW-003 | UC-11-WITHDRAW | Có thay đổi | listingTestCases | tests/listings/withdraw-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC11-WITHDRAW-004 | UC-11-WITHDRAW | Có thay đổi | listingTestCases | tests/listings/withdraw-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC11-WITHDRAW-005 | UC-11-WITHDRAW | Có thay đổi | listingTestCases | tests/component/pages/MyListingsPage.spec.ts                        | Tự động    |
| LIST-UC11-WITHDRAW-006 | UC-11-WITHDRAW | Có thay đổi | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC12-001          | UC-12          | Có thay đổi | listingTestCases | tests/listings/favorite-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC12-002          | UC-12          | Có thay đổi | listingTestCases | tests/listings/favorite-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC12-003          | UC-12          | Có thay đổi | listingTestCases | tests/listings/favorite-listing.mutating.spec.ts                    | Tự động    |
| LIST-UC12-004          | UC-12          | Có thay đổi | listingTestCases | tests/component/pages/FavoritesPage.spec.ts                         | Tự động    |
| LIST-UC12-005          | UC-12          | Có thay đổi | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC16-001          | UC-16          | Chỉ đọc     | listingTestCases | tests/listings/search-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC16-002          | UC-16          | Chỉ đọc     | listingTestCases | tests/listings/search-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC16-003          | UC-16          | Chỉ đọc     | listingTestCases | tests/listings/search-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC16-004          | UC-16          | Chỉ đọc     | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC16-005          | UC-16          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC16-006          | UC-16          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC16-007          | UC-16          | Chỉ đọc     | listingTestCases | tests/listings/search-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC16-008          | UC-16          | Chỉ đọc     | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |
| LIST-UC17-001          | UC-17          | Chỉ đọc     | listingTestCases | tests/listings/filter-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC17-002          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-003          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-004          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-005          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-006          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-007          | UC-17          | Chỉ đọc     | listingTestCases | tests/listings/filter-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC17-008          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-009          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-010          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-011          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-012          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-013          | UC-17          | Chỉ đọc     | listingTestCases | tests/listings/filter-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC17-014          | UC-17          | Chỉ đọc     | listingTestCases | docs/traceability/requirements-to-tests.md#listings-manual-evidence | Thủ công   |

## Listings manual evidence

Các kịch bản ở anchor này chưa có cơ chế tái hiện tự động ổn định hoặc cần trạng thái tài khoản đặc
biệt. Chúng được giữ trong metadata để không mất truy vết và không được thay bằng route interception
đoán endpoint:

- UC08-003: tài khoản đăng nhập chưa có số điện thoại hợp lệ.
- UC08-008, UC09-007, UC11-WITHDRAW-006, UC12-005, UC16-008 và UC17-014: lỗi upload, mạng hoặc
  server cần cơ chế lỗi xác định.
- UC16-004: chưa có giới hạn độ dài chính thức trên UI/config để đặt giá trị biên.

Khi staging/test cung cấp seed hoặc fault injection ổn định, cập nhật `playwrightTest` sang file bằng
chứng tương ứng và giữ nguyên mã kịch bản.

## Appointment Booking - UC-18

| Test Case ID      | Requirement / observable rule                                                         | Classification                                                    | Automated evidence                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `APPOINTMENT-001` | Authenticated non-owner creates a valid appointment for an eligible published listing | Manual/reseed required; automated placeholder permanently skipped | `tests/component/pages/AppointmentPage.spec.ts`; manual placeholder in `appointment-booking.mutating.spec.ts` |
| `APPOINTMENT-002` | A time slot is required before submission is enabled                                  | Read-only E2E and component                                       | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts`                                         |
| `APPOINTMENT-003` | Contact name is required                                                              | Read-only E2E and component                                       | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts`                                         |
| `APPOINTMENT-004` | Phone must match the deployed Vietnamese format                                       | Read-only E2E and component                                       | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts`                                         |
| `APPOINTMENT-005` | Email must use the deployed Gmail format                                              | Read-only E2E and component                                       | `appointment-validation.read-only.spec.ts`, `AppointmentPage.spec.ts`                                         |

Every E2E title is generated from `test-cases/appointments/appointment.test-cases.ts` and includes
the Test Case ID plus centralized tags. `APPOINTMENT-001` has no executable external success flow:
its placeholder imports the centralized mutating fixture but always skips with `MANUAL/RESEED
REQUIRED`. It is isolated in authenticated `appointment-mutating-chromium`, while deterministic
component coverage verifies preparation and submit UI behavior without backend persistence.

Manual evidence for `APPOINTMENT-001` requires a dedicated published listing owned by another user,
an authenticated test identity with no unfinished appointment for that listing, and explicit reseed
afterward. Do not record a skip as successful execution evidence.

## Appointment business rules not verified

The following items are intentionally labeled `BUSINESS RULE NOT VERIFIED` rather than represented
as passing automation:

- **Required appointment date - BUSINESS RULE NOT VERIFIED:** the deployed UI selects the first
  available date by default and has no observable blank-date state.
- **Booking one's own listing - BUSINESS RULE NOT VERIFIED:** no controlled owner listing/user pair
  is configured.
- **Duplicate unfinished appointment - BUSINESS RULE NOT VERIFIED:** no resettable booking seed or
  cleanup contract exists.
- **Urgent booking timeout - BUSINESS RULE NOT VERIFIED:** UC-18 describes the timeout, but the UI
  exposes no observable timeout value.
- **Notification delivery - BUSINESS RULE NOT VERIFIED:** no deterministic notification or mailbox
  fixture exists.
- **Network/server failure - BUSINESS RULE NOT VERIFIED:** no sanctioned fault-injection layer
  exists.

## Appointment locator risks

- The deployed appointment popup has no `role="dialog"`, so it cannot be scoped by dialog semantics.
- The popup's icon-only close button has no accessible name. Automation does not use that control.
- Verified unique role names and placeholders are used globally until the application supplies a
  semantic dialog boundary.

## Future traceability

Profile, Listings lifecycle operations, Appointment view/confirm/reject/cancel, and Transactions
currently provide implementation templates. Add a test-case ID and automated evidence row when each
scenario receives controlled state and safe execution policy.
