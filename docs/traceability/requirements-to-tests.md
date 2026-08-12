# Requirements-to-Tests Traceability

Tài liệu này phản ánh mã nguồn và test case đang tồn tại trên nhánh Authentication. Các cột
“mutating” mô tả coverage đã triển khai nhưng chỉ thực thi khi execution policy cho phép; kết quả
`skip` khi policy tắt không được ghi nhận là một lần chạy E2E thành công.

## Use case Authentication UC-01 đến UC-07

| Use case | Phạm vi nghiệp vụ                                                     | Page Object / Workflow                                                           | Bằng chứng component và unit                                                                                                                                | E2E không thay đổi dữ liệu                                                                                             | E2E mutating có điều kiện                                                                                                    |
| -------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| UC-01    | Đăng ký tài khoản, validate form và xác thực OTP                      | `AuthenticationModalComponent`, `RegisterPage`; `RegistrationWorkflow`           | `RegisterPage.spec.ts`, `AuthenticationModalComponent.spec.ts`; `RegistrationWorkflow.spec.ts`, `AuthenticationDataFactory.spec.ts`, các test `helpers/otp` | `AUTH-REGISTER-001..003` trong `registration.validation.spec.ts`                                                       | `AUTH-REGISTER-OTP-001` trong `registration.otp.mutating.spec.ts`; cần cả hai flag và mailbox; mặc định skip                 |
| UC-02    | Đăng nhập bằng credential và quản lý trạng thái đăng nhập             | `LoginPage`, `HeaderComponent`; `LoginWorkflow`, facade `AuthenticationWorkflow` | `LoginPage.spec.ts`, `HeaderComponent.spec.ts`; `LoginWorkflow.spec.ts`                                                                                     | `AUTH-LOGIN-001..004` trong `login.positive.spec.ts`, `login.negative.spec.ts`, `login.boundary.spec.ts`               | Không có flow mutating                                                                                                       |
| UC-03    | Đăng nhập bằng Google OAuth                                           | `AuthenticationModalComponent.loginWithGoogle()`                                 | `AuthenticationModalComponent.spec.ts` xác nhận control/click surface                                                                                       | Không có E2E OAuth                                                                                                     | **Surface-only**; tự động chọn tài khoản Google, CAPTCHA/consent và account-selection nằm ngoài phạm vi                      |
| UC-04    | Xem thông tin tài khoản                                               | `ProfilePage`, `ProfileFormComponent`; `ProfileWorkflow`                         | `ProfilePage.spec.ts`; `ProfileWorkflow.spec.ts`                                                                                                            | `AUTH-PROFILE-001` trong `profile.positive.spec.ts`                                                                    | Không cần mutation                                                                                                           |
| UC-05    | Chỉnh sửa thông tin tài khoản, field bất biến và trạng thái không đổi | `ProfilePage`, `ProfileFormComponent`; `ProfileWorkflow`                         | `ProfilePage.spec.ts`; `ProfileWorkflow.spec.ts`                                                                                                            | `AUTH-PROFILE-002..003` trong `profile.validation.spec.ts`                                                             | `AUTH-PROFILE-MUTATING-001` trong `profile.mutating.spec.ts`; dùng tài khoản chuyên dụng và phục hồi baseline; mặc định skip |
| UC-06    | Đổi mật khẩu, validation và khôi phục credential baseline             | `ProfilePage`, `ChangePasswordComponent`; `ProfileWorkflow`                      | `ProfilePage.spec.ts`; `ProfileWorkflow.spec.ts`                                                                                                            | `AUTH-PASSWORD-001` trong `change-password.validation.spec.ts`                                                         | `AUTH-PASSWORD-MUTATING-001` trong `change-password.mutating.spec.ts`; serial, phục hồi qua OTP; mặc định skip               |
| UC-07    | Quên mật khẩu qua email, OTP, mật khẩu mới và quay lại Login          | `LoginPage`, `ForgotPasswordPage`; `PasswordRecoveryWorkflow`                    | `ForgotPasswordPage.spec.ts`; `PasswordRecoveryWorkflow.spec.ts`, các test `helpers/otp`                                                                    | `AUTH-RECOVERY-001` trong `password-recovery.validation.spec.ts`; expected failure có điều kiện nếu defect còn tồn tại | `AUTH-RECOVERY-OTP-001` trong `password-recovery.otp.mutating.spec.ts`; serial và phục hồi baseline; mặc định skip           |

Nguồn baseline có kiểm soát trong repository:
[Authentication use-case baseline](../requirements/authentication-use-cases.md), trích xuất mục 2.5.1
đến 2.5.3.4 từ file nguồn bên ngoài `NghiepvuPropify.pdf`. PDF không nằm trong repository; baseline
ghi rõ tên nguồn, SHA-256 và quy trình đối chiếu để clone vẫn audit được. UC-03 chỉ có bằng chứng
component cho bề mặt nút Google. Framework không tuyên bố đã tự động hóa redirect, consent hoặc chọn
tài khoản Google.

## Danh mục case ID Authentication

| Case ID / family             | Loại                             | Mục tiêu                                                   | Bằng chứng thực thi hiện tại                                                                                                 |
| ---------------------------- | -------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `AUTH-LOGIN-001`             | Positive / smoke                 | Đăng nhập bằng credential hợp lệ                           | `tests/authentication/login.positive.spec.ts`; non-mutating, multi-browser                                                   |
| `AUTH-LOGIN-002`             | Negative                         | Từ chối mật khẩu sai và giữ trạng thái chưa đăng nhập      | `tests/authentication/login.negative.spec.ts`; non-mutating, multi-browser                                                   |
| `AUTH-LOGIN-003`             | Validation / boundary            | Email sai định dạng hiển thị lỗi, nút Continue bị vô hiệu  | `tests/authentication/login.boundary.spec.ts`; non-mutating, multi-browser                                                   |
| `AUTH-LOGIN-004`             | Boundary                         | Trường bắt buộc rỗng giữ nút submit bị vô hiệu             | `tests/authentication/login.boundary.spec.ts`; non-mutating, multi-browser                                                   |
| `AUTH-REGISTER-001`          | Negative / validation / boundary | Email sai, mật khẩu 7 ký tự và confirmation không khớp     | `tests/authentication/registration.validation.spec.ts`; không submit                                                         |
| `AUTH-REGISTER-002`          | Positive boundary                | Chấp nhận đúng biên tối thiểu 8 ký tự                      | `tests/authentication/registration.validation.spec.ts`; không submit                                                         |
| `AUTH-REGISTER-003`          | Negative / validation            | Từ chối confirmation không khớp                            | `tests/authentication/registration.validation.spec.ts`; không submit                                                         |
| `AUTH-REGISTER-OTP-001`      | Positive / OTP / mutating        | Tạo Gmail alias mới, đăng ký và xác thực OTP               | `tests/authentication/registration.otp.mutating.spec.ts`; policy-off skip, chưa phải bằng chứng real-run                     |
| `AUTH-RECOVERY-001`          | Negative / validation            | Email recovery sai không được phép gửi OTP                 | `tests/authentication/password-recovery.validation.spec.ts`; không submit; expected failure có điều kiện cho defect hiện tại |
| `AUTH-RECOVERY-OTP-001`      | Positive / OTP / mutating        | Reset password tài khoản chuyên dụng rồi phục hồi baseline | `tests/authentication/password-recovery.otp.mutating.spec.ts`; policy-off skip, chưa phải bằng chứng real-run                |
| `AUTH-PROFILE-001`           | Positive / smoke                 | Đọc thông tin tài khoản đã xác thực                        | `tests/profile/profile.positive.spec.ts`; read-only, multi-browser                                                           |
| `AUTH-PROFILE-002`           | Validation                       | Email và phone đã xác thực luôn bị vô hiệu                 | `tests/profile/profile.validation.spec.ts`; read-only, multi-browser                                                         |
| `AUTH-PROFILE-003`           | Validation / boundary            | Không có thay đổi thì Save bị vô hiệu                      | `tests/profile/profile.validation.spec.ts`; không submit, multi-browser                                                      |
| `AUTH-PROFILE-MUTATING-001`  | Positive / mutating              | Đổi tên tài khoản chuyên dụng và phục hồi baseline         | `tests/profile/profile.mutating.spec.ts`; policy-off skip, chưa phải bằng chứng real-run                                     |
| `AUTH-PASSWORD-001`          | Negative / validation            | Confirmation mật khẩu mới không khớp, không submit         | `tests/profile/change-password.validation.spec.ts`; non-mutating, multi-browser                                              |
| `AUTH-PASSWORD-MUTATING-001` | Positive / OTP / mutating        | Đổi mật khẩu, đăng nhập lại và phục hồi baseline qua OTP   | `tests/profile/change-password.mutating.spec.ts`; policy-off skip, chưa phải bằng chứng real-run                             |

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

- Các suite non-mutating là bằng chứng thực thi trực tiếp cho validation/read-only và có thể chạy ở ba
  browser sau `auth-setup`.
- Các suite OTP/mutating yêu cầu đồng thời `RUN_OTP_E2E=true` và `RUN_MUTATING_E2E=true`, Gmail OAuth2
  hợp lệ và tài khoản chuyên dụng có thể phục hồi. Mặc định chúng chỉ được discover rồi skip.
- `AUTH-RECOVERY-001` dùng `test.fail` có điều kiện cho lỗi sản phẩm: email recovery sai hiện có thể
  chỉ bị validate sau khi người dùng nhấn gửi. Kịch bản không nhấn gửi và tự trở về pass bình thường
  khi sản phẩm sửa.
- Google OAuth chỉ được kiểm tra bề mặt UI. Google consent, CAPTCHA và account-selection automation
  nằm ngoài phạm vi.
- Admin và xóa tài khoản production nằm ngoài phạm vi; registration có thể tạo dữ liệu tồn tại lâu
  dài nên chỉ chạy khi môi trường và chính sách cleanup đã được phê duyệt.

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

## Future traceability

Profile, Appointments, and Transactions continue to use implementation templates. Add a test-case
ID and an automated evidence row when a safe executable scenario is added.
