# Requirements-to-Tests Traceability

| Requirement                  | Implementation evidence                       | Automated evidence                             |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Strict environment selection | `config/environment.*`                        | `tests/unit/config/environment.config.spec.ts` |
| Safe credential indirection  | `UserDataFactory`, `users.json`, `.gitignore` | `UserDataFactory.spec.ts`                      |
| Independent typed data       | `ListingDataFactory`                          | `ListingDataFactory.spec.ts`                   |
| Reusable utilities           | `utils/*`                                     | `tests/unit/utils/*`                           |
| Locator ownership            | `pages/*`, ESLint restricted syntax           | `npm run lint`                                 |
| Base Page inheritance        | `pages/base/BasePage.ts`                      | strict TypeScript compilation                  |
| BaseTest fixture composition | `fixtures/test.fixture.ts`                    | `test.fixture.spec.ts`                         |
| Modal login behavior         | `LoginPage`, `AuthenticationWorkflow`         | `LoginPage.spec.ts`                            |
| Authentication state         | `tests/setup/auth.setup.ts`                   | `auth-setup` Playwright project                |
| Multi-browser support        | `playwright.config.ts`                        | `npx playwright test --list`                   |
| Login smoke coverage         | `AUTH-LOGIN-001`                              | `tests/authentication/login.spec.ts`           |
| HTML and Allure reporting    | Playwright reporters                          | generated ignored report directories           |

## Listings

Nguồn nghiệp vụ: `document/NghiepvuPropify.pdf`, UC-08 đến UC-17. Hằng metadata chuẩn là
`listingTestCases` trong `test-cases/listings/listing.test-cases.ts`. “Có thay đổi” luôn đi qua
`mutatingTest`; “Gỡ tin” chỉ chuyển sang `Đã gỡ`, ẩn công khai và không xóa bản ghi cơ sở dữ liệu.

| Mã kịch bản            | Yêu cầu        | Phân loại   | Metadata         | Bằng chứng                                                          | Trạng thái |
| ---------------------- | -------------- | ----------- | ---------------- | ------------------------------------------------------------------- | ---------- |
| LIST-UC08-001          | UC-08          | Có thay đổi | listingTestCases | tests/listings/create-listing.mutating.spec.ts                      | Tự động    |
| LIST-UC08-002          | UC-08          | Có thay đổi | listingTestCases | tests/listings/create-listing.mutating.spec.ts                      | Tự động    |
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
| LIST-UC11-EDIT-001     | UC-11-EDIT     | Có thay đổi | listingTestCases | tests/listings/edit-listing.mutating.spec.ts                        | Tự động    |
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
| LIST-UC17-002          | UC-17          | Chỉ đọc     | listingTestCases | tests/listings/filter-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC17-003          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-004          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-005          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-006          | UC-17          | Chỉ đọc     | listingTestCases | tests/component/pages/ListingListPage.spec.ts                       | Tự động    |
| LIST-UC17-007          | UC-17          | Chỉ đọc     | listingTestCases | tests/listings/filter-listing.read-only.spec.ts                     | Tự động    |
| LIST-UC17-008          | UC-17          | Chỉ đọc     | listingTestCases | tests/listings/filter-listing.read-only.spec.ts                     | Tự động    |
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
