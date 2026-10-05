---
ticket: TC-PROFILE-001-009
topic: profile-management
template-version: 1.1
status: completed
phase: completed
memory-version: 4
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-25
---

# TC-PROFILE-001-009 - profile-management

## Objective

Khảo sát, chuẩn hóa và hoàn thiện bộ kiểm thử tự động toàn diện cho 9 kịch bản kiểm thử thuộc Module 02 - Profile (Quản lý thông tin cá nhân & Đổi mật khẩu) trên hệ thống Propify:
1. `TC-PROFILE-VIEW-001`: [Happy Path] Hiển thị chính xác thông tin tài khoản hiện hành.
2. `TC-PROFILE-VIEW-002`: [Negative] Chuyển hướng đăng nhập khi token không hợp lệ.
3. `TC-PROFILE-EDIT-001`: [Happy Path / CRUD] Chỉnh sửa thông tin cá nhân thành công kèm upload Avatar.
4. `TC-PROFILE-EDIT-002`: [Business Rule] Không gọi API khi không có thay đổi dữ liệu.
5. `TC-PROFILE-EDIT-003`: [Boundary] Cắt chuỗi (truncate) khi paste Họ tên vượt quá 50 ký tự.
6. `TC-PROFILE-CHANGEPW-001`: [Happy Path / State Transition] Đổi mật khẩu thành công và thu hồi phiên cũ.
7. `TC-PROFILE-CHANGEPW-002`: [Negative] Sai mật khẩu hiện tại.
8. `TC-PROFILE-CHANGEPW-003`: [Negative] Mật khẩu mới không hợp lệ.
9. `TC-PROFILE-CHANGEPW-004`: [Negative] Xác nhận mật khẩu không khớp.

Đồng thời giải quyết các độ lệch (discrepancies) giữa tài liệu kiểm thử cũ với hành vi thực tế của giao diện web deployed, bảo toàn chính sách bảo vệ mutation an toàn (`RUN_MUTATING_E2E`), cập nhật trạng thái catalog chính xác, và nâng cao độ ổn định cho test suite.

## Current Understanding

1. **Kiến trúc trang Profile (`https://propifyy.duckdns.org/profile`)**:
   - Khi truy cập route `/profile`, người dùng được điều hướng đến trang tổng quan hồ sơ.
   - Nút **"Thông tin tài khoản"** (`button:has-text("Thông tin tài khoản")`) mở form chi tiết thông tin cá nhân.
   - Khu vực **Ảnh đại diện** gồm hình ảnh đại diện hiện tại, văn bản quy cách (`JPG, PNG, WebP · Tối đa 5 MB`) và nút **"Chọn ảnh"** gắn với `input[type="file"]`.
   - Khu vực **Thông tin cá nhân** chứa 3 trường dữ liệu:
     - `fullName` (`input#fullName`): Họ và tên người dùng.
     - `email` (`input#email`): Email người dùng (mặc định bị `disabled`).
     - `phone` (`input#phone`): Số điện thoại (mặc định bị `disabled`, kèm chú thích `"Số điện thoại đã xác nhận, không thể thay đổi."`).
   - Các nút hành động chính ở chế độ xem:
     - **"Chỉnh sửa"** (`button:has-text("Chỉnh sửa")`): Bật chế độ sửa đổi Họ và tên.
     - **"Đổi mật khẩu"** (`button:has-text("Đổi mật khẩu")`): Chuyển sang form Đổi mật khẩu.

2. **Chế độ Chỉnh sửa thông tin cá nhân**:
   - Khi click nút "Chỉnh sửa":
     - Trường `fullName` được mở khóa để chỉnh sửa.
     - Nút "Chỉnh sửa" biến mất, thay bằng cặp nút:
       - **"Hủy"**: Hoàn tác các chỉnh sửa, khôi phục giá trị cũ.
       - **"Lưu thay đổi"**: Nút submit lưu thông tin.
     - **Cơ chế chống submit thừa**: Nút "Lưu thay đổi" có thuộc tính `disabled: true` khi người dùng chưa thay đổi bất kỳ ký tự nào trong form. Chỉ khi giá trị họ tên khác với giá trị ban đầu thì nút mới chuyển sang `enabled`.

3. **Chế độ Đổi mật khẩu**:
   - Khi click nút "Đổi mật khẩu":
     - Hiển thị 3 trường nhập mật khẩu:
       - `currentPassword` (`input#currentPassword`): "Nhập mật khẩu hiện tại".
       - `newPassword` (`input#newPassword`): "Nhập mật khẩu mới". Dưới trường có gợi ý: `"Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"`.
       - `confirmPassword` (`input#confirmPassword`): "Nhập lại mật khẩu mới".
     - Cặp nút hành động:
       - **"Hủy"**: Đóng form đổi mật khẩu.
       - **"Cập nhật mật khẩu"**: Thực hiện gửi yêu cầu đổi mật khẩu. Nút này tự động disabled nếu dữ liệu không thỏa mãn độ phức tạp hoặc xác nhận mật khẩu không khớp.

4. **Trạng thái thực thi hiện tại trong repository**:
   - `TC-PROFILE-CHANGEPW-003` & `TC-PROFILE-CHANGEPW-004` trong `tests/profile/change-password.validation.spec.ts`: Đã đạt `AUTOMATED`, kiểm thử độ phức tạp và mật khẩu không khớp đều PASS 100% trên 3 browser (Chromium, Firefox, WebKit).
   - `TC-PROFILE-EDIT-001`, `TC-PROFILE-CHANGEPW-001`, `TC-PROFILE-CHANGEPW-002`: Được cấu hình đúng chuẩn mutating trong `tests/profile/profile.mutating.spec.ts` và `tests/profile/change-password.mutating.spec.ts`, tuân thủ `RUN_MUTATING_E2E=false`, tự động skip an toàn trong các lượt chạy thông thường.
   - `TC-PROFILE-VIEW-001`, `TC-PROFILE-VIEW-002`, `TC-PROFILE-EDIT-002`, `TC-PROFILE-EDIT-003`: Đang được đánh dấu `test.fail` do các "Known product gap" (độ lệch giữa tài liệu test case cũ và giao diện web thực tế).

## Requirements

1. **Yêu cầu nghiệp vụ [DoD-1]**:
   - Kiểm tra hiển thị thông tin tài khoản: Họ tên, Email, Số điện thoại và Avatar phải đồng bộ chính xác với API `/api/v1/auth/me`.
   - Kiểm tra tính bất biến của trường Email và Số điện thoại đã xác thực (phải ở trạng thái `disabled`).
2. **Yêu cầu bảo mật phiên [DoD-2]**:
   - Kiểm tra hành vi khi người dùng có token không hợp lệ truy cập `/profile`: Hệ thống phải từ chối truy cập và thực hiện redirect an toàn.
3. **Yêu cầu quy tắc form & validation [DoD-3]**:
   - Khi không có thay đổi dữ liệu: Hệ thống phải ngăn chặn việc gọi API Update (thông qua nút "Lưu thay đổi" bị vô hiệu hóa `disabled`).
   - Kiểm tra giới hạn độ dài họ tên và xử lý cắt chuỗi hoặc chặn nhập vượt quá giới hạn.
4. **Yêu cầu quy tắc đổi mật khẩu [DoD-4]**:
   - Mật khẩu mới phải thỏa mãn: tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.
   - Mật khẩu xác nhận phải khớp chính xác với mật khẩu mới.
   - Xử lý phản hồi lỗi rõ ràng khi nhập sai mật khẩu hiện tại.
5. **Yêu cầu an toàn mutation & test data [DoD-5]**:
   - Các kịch bản thay đổi dữ liệu (`TC-PROFILE-EDIT-001`, `TC-PROFILE-CHANGEPW-001`, `TC-PROFILE-CHANGEPW-002`) phải được bảo vệ bởi policy gate `RUN_MUTATING_E2E` và `RUN_OTP_E2E`.
   - Mọi thao tác chỉnh sửa dữ liệu (tên, avatar, mật khẩu) khi chạy mutating bắt buộc phải có cơ chế khôi phục baseline ban đầu (`finally` rollback) để không làm bẩn dữ liệu tài khoản test.

## Acceptance Criteria

- [DoD-1] `TC-PROFILE-VIEW-001` xác minh toàn diện thông tin cá nhân: Họ tên, Email, SĐT, Avatar và trạng thái `disabled` của Email/SĐT so khớp với dữ liệu API backend `/api/v1/auth/me`.
- [DoD-2] `TC-PROFILE-VIEW-002` xác minh token không hợp lệ bị từ chối truy cập vào `/profile` và được điều hướng an toàn khỏi trang cá nhân.
- [DoD-3] `TC-PROFILE-EDIT-002` xác minh nút "Lưu thay đổi" bị `disabled` khi form không có thay đổi, đảm bảo 0 API call được phát ra.
- [DoD-4] `TC-PROFILE-EDIT-003` xác minh hành vi nhập/paste vượt độ dài cho phép trên trường Họ tên.
- [DoD-5] `TC-PROFILE-CHANGEPW-003` và `TC-PROFILE-CHANGEPW-004` xác minh validation mật khẩu mới (độ phức tạp và xác nhận khớp) PASS ổn định trên cả 3 engine trình duyệt (Chromium, Firefox, WebKit).
- [DoD-6] Các test mutating `TC-PROFILE-EDIT-001`, `TC-PROFILE-CHANGEPW-001`, `TC-PROFILE-CHANGEPW-002` tuân thủ nghiêm ngặt execution policy, chỉ chạy trong project `mutating-chromium`, và luôn dọn dẹp dữ liệu khôi phục baseline trong khối `finally`.
- [DoD-7] Toàn bộ test suite vượt qua `npm run typecheck`, `npm run lint` với 0 error, 0 warning; kết quả chạy test được tự động ghi nhận vào SQLite `data/autotest.db`.

## Verified Findings

Dựa trên điều tra thực tế trực tiếp từ DOM live `https://propifyy.duckdns.org/profile` và source code:
1. **Badge "Active" trong `TC-PROFILE-VIEW-001`**:
   - Tài liệu test case cũ ghi: `"UI kết xuất chính xác từ DB: Avatar, Họ tên, Email, SĐT, Badge trạng thái Active."`.
   - Kết quả DOM dump thực tế: Trên giao diện Profile hoàn toàn không có badge có text "Active". Thay vào đó, trường SĐT có dòng chữ khẳng định trạng thái xác thực: `"Số điện thoại đã xác nhận, không thể thay đổi."`.
   - Code hiện tại đang dùng `test.fail(true, 'Known product gap: the deployed Profile view does not render the documented Active badge.')`.

2. **Chuyển hướng trong `TC-PROFILE-VIEW-002`**:
   - Tài liệu test case cũ ghi: `"Redirect về trang đăng nhập (/login)."`.
   - Kết quả thực tế trên client router: Khi token invalid hoặc không có token, SPA router điều hướng về `/` (trang chủ) thay vì trang login riêng biệt `/login`.
   - Code hiện tại đang dùng `test.fail(true, 'Known product gap: an invalid token currently redirects to home instead of the documented login route.')`.

3. **Nút "Lưu thay đổi" khi không sửa dữ liệu trong `TC-PROFILE-EDIT-002`**:
   - Tài liệu test case cũ ghi: `"Click 'Lưu' mà không chỉnh sửa gì -> Hiển thị 'Không có thay đổi dữ liệu'; không gọi API Update."`.
   - Kết quả DOM dump thực tế: Nút "Lưu thay đổi" mang thuộc tính `disabled: true` khi form ở giá trị nguyên bản! Vì nút bị disabled, người dùng không thể click và do đó không có thông báo toast xuất hiện.
   - Đây thực chất là hành vi UI chuẩn (UX best practice) để chặn request dư thừa. Code hiện tại đang dùng `test.fail(true, 'Known product gap: unchanged Profile data disables Save and does not show the required feedback.')`.

4. **Độ dài Họ tên trong `TC-PROFILE-EDIT-003`**:
   - Tài liệu test case cũ ghi: `"Trường tự động cắt, chỉ giữ chính xác 50 ký tự đầu."`.
   - Kết quả DOM dump thực tế: `input#fullName` có `maxLength = -1` (không thiết lập thuộc tính maxLength ở HTML level), cho phép paste chuỗi dài hơn 50 ký tự.
   - Code hiện tại đang dùng `test.fail(true, 'Known product gap: the deployed full-name input currently accepts more than 50 characters.')`.

5. **Quy tắc mật khẩu trong `TC-PROFILE-CHANGEPW-003` & `004`**:
   - Giao diện thực tế hiển thị đúng: `"Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"`.
   - Nút "Cập nhật mật khẩu" bị disabled khi dữ liệu chưa đạt. Khi paste dữ liệu không khớp hoặc thiếu độ phức tạp, hiển thị lỗi chuẩn. Đã được tự động hóa và chạy PASS 100%.

## Confirmed Decisions

1. **Giữ nguyên chính sách an toàn cho Mutating Specs**:
   - `TC-PROFILE-EDIT-001`, `TC-PROFILE-CHANGEPW-001`, `TC-PROFILE-CHANGEPW-002` bắt buộc nằm trong `*.mutating.spec.ts` và được kiểm soát bởi biến môi trường `RUN_MUTATING_E2E=false`.
   - Trong chế độ safe run mặc định, các test này được skip có chủ đích và không gây ảnh hưởng đến dữ liệu thực của tài khoản test.
2. **Xử lý các Test Cases có Product Gap**:
   - Cần thống nhất với người dùng về việc:
     - Giữ nguyên `test.fail` để phản ánh đúng rằng web app chưa cập nhật theo tài liệu đặc tả cũ; HOẶC
     - Cập nhật test assertion để bám sát hành vi thực tế của web app (ví dụ: xác nhận nút Lưu bị disabled thay vì chờ toast, chấp nhận redirect về `/` khi invalid token) để các test case chuyển sang trạng thái xanh (PASS).
3. **Tự động đồng bộ báo cáo**:
   - Mọi kết quả chạy đều tự động import vào SQLite `data/autotest.db` nhờ cơ chế `globalSetup` và `TestTrackingReporter` đã triển khai.

## Constraints

1. Tuân thủ nghiêm ngặt kiến trúc 4 tầng:
   - `tests/` chỉ chứa kịch bản, metadata test case, tags và web assertions (`expect(...)`). Tuyệt đối không dùng raw locator trong `tests/`.
   - `pages/` (Page Objects) kế thừa `BasePage`, đóng gói mọi locator và tương tác; không import `expect` từ `@playwright/test`.
   - `workflows/` phối hợp các bước đa trang, không chứa assertion hay state dùng chung.
2. Không dùng `page.waitForTimeout()` hoặc `setTimeout()` tùy tiện. Sử dụng web-first assertions và auto-retrying.
3. Không sửa đổi mã nguồn ứng dụng web backend/frontend bên ngoài phạm vi framework kiểm thử.

## Out of Scope

1. Sửa đổi backend API hoặc code frontend của trang web Propify (vì đây là target application under test).
2. Chạy mutating thực sự trên môi trường production khi chưa có cờ cấp phép tường minh từ người dùng.
3. Các module khác ngoài phạm vi Profile (như Listings, Appointments, Packages).

## Proposed Implementation

1. **Chuẩn hóa Page Objects (`pages/profile/ProfilePage.ts`, `pages/components/ProfileFormComponent.ts`, `pages/components/ChangePasswordComponent.ts`)**:
   - Đảm bảo các locator sử dụng semantic hierarchy (`getByRole`, `getByLabel`, `getByPlaceholder`).
   - Cung cấp đầy đủ các phương thức truy vấn trạng thái (state query methods): `isSaveDisabled()`, `isSaveEnabled()`, `hasAvatar()`, `isEmailDisabled()`, `isPhoneDisabled()`.
2. **Chuẩn hóa Workflows (`workflows/authentication/ProfileWorkflow.ts`)**:
   - Rà soát các workflow helper: `updateProfile`, `changePassword`, `captureAvatarBaseline` để đảm bảo xử lý dọn dẹp mượt mà.
3. **Đồng bộ hóa Specs trong `tests/profile/`**:
   - `tests/profile/profile.positive.spec.ts`: Xác minh `TC-PROFILE-VIEW-001`.
   - `tests/profile/profile.negative.spec.ts`: Xác minh `TC-PROFILE-VIEW-002`.
   - `tests/profile/profile.validation.spec.ts`: Xác minh `TC-PROFILE-EDIT-002` và `TC-PROFILE-EDIT-003`.
   - `tests/profile/profile.mutating.spec.ts`: Xác minh `TC-PROFILE-EDIT-001`.
   - `tests/profile/change-password.validation.spec.ts`: Xác minh `TC-PROFILE-CHANGEPW-003` và `TC-PROFILE-CHANGEPW-004`.
   - `tests/profile/change-password.mutating.spec.ts`: Xác minh `TC-PROFILE-CHANGEPW-001` và `TC-PROFILE-CHANGEPW-002`.
4. **Cập nhật danh mục `test-cases/authentication/profile.test-cases.ts`**:
   - Đồng bộ hóa trạng thái automation status và scriptPath sau khi chuẩn hóa.

## Expected File Changes

- `docs/tasks/TC-PROFILE-001-009-profile-management.md` (Tạo mới persistent task memory)
- `pages/components/ProfileFormComponent.ts` (Tối ưu hóa selector avatar input dạng chuẩn `input[type="file"]`)
- `tests/unit/test-cases/business-automation-baseline.spec.ts` (Đồng bộ baseline test catalog)

## Open Questions

- [non-blocking] Đối với các case có Product Gap giữa tài liệu đặc tả cũ và web app thực tế (TC-PROFILE-VIEW-001 thiếu badge Active, TC-PROFILE-VIEW-002 redirect về /, TC-PROFILE-EDIT-002 nút Lưu disabled thay vì toast, TC-PROFILE-EDIT-003 input không truncate 50 ký tự): Bạn muốn giữ nguyên `test.fail` như hiện tại để ghi nhận bug tồn đọng của sản phẩm, hay cập nhật assertion bám theo hành vi thực tế của web?

## Risks and Conflicts

1. **Rủi ro mất dữ liệu tài khoản test khi chạy mutating**:
   - Nếu test `TC-PROFILE-CHANGEPW-001` hoặc `TC-PROFILE-EDIT-001` bị dừng đột ngột giữa chừng trước khi kịp chạy `finally`, mật khẩu hoặc avatar có thể bị đổi khác baseline.
   - *Biện pháp giảm thiểu*: Luôn bọc toàn bộ khối thao tác trong `try ... finally` với fallback reset qua `passwordRecoveryWorkflow.resetPassword()` và khôi phục baseline avatar.
2. **Flakiness khi tải ảnh đại diện**:
   - Upload ảnh avatar qua mạng có thể có độ trễ kết xuất.
   - *Biện pháp giảm thiểu*: Sử dụng web-first assertion `expect.poll` hoặc chờ API response status 200 trước khi kiểm tra avatar đồng bộ.

## Impact Analysis

- **Mã nguồn bị ảnh hưởng**: Chỉ tác động trong thư mục `tests/profile/`, `pages/profile/`, `pages/components/`, `test-cases/authentication/`. Không làm ảnh hưởng đến các module khác (Appointments, Listings, Auth chung).
- **Hệ thống cơ sở dữ liệu**: Dữ liệu test cases trong `autotest.db` sẽ được tự động đồng bộ khi chạy test mà không cần can thiệp thủ công.

## Verification Plan

1. **Kiểm tra tĩnh (Static Analysis)**:
   - `npm run typecheck`: Đảm bảo TypeScript biên dịch không lỗi (0 error).
   - `npx eslint pages/profile/ pages/components/ProfileFormComponent.ts pages/components/ChangePasswordComponent.ts workflows/authentication/ProfileWorkflow.ts tests/profile/ test-cases/authentication/profile.test-cases.ts`: Đảm bảo tuân thủ ESLint (0 error, 0 warning).
2. **Kiểm tra đơn vị và catalog**:
   - `npx playwright test tests/unit/test-cases/profile.test-cases.spec.ts`: Đảm bảo danh mục 9 test cases profile được định nghĩa đúng thứ tự và metadata.
   - `npx playwright test tests/unit/test-cases/business-automation-baseline.spec.ts`: Đảm bảo catalog automation baseline khớp 100%.
   - `npx playwright test tests/component/pages/ProfilePage.spec.ts`: Đảm bảo 13 component tests cho ProfilePage đều PASS.
3. **Kiểm tra thực thi E2E**:
   - Chạy toàn bộ 22 executions thuộc 9 test cases Profile:
     ```bash
     npx playwright test tests/profile/
     ```
4. **Kiểm tra SQLite & Dashboard UI**:
   - Xác nhận `autotest.db` ghi nhận đầy đủ lượt chạy và trạng thái 9 test cases hiển thị chính xác trên giao diện `http://localhost:3000`.

## Verification Results

1. **Kiểm tra tĩnh**:
   - `npm run typecheck`: **PASSED** (0 error).
   - `npx eslint ...`: **PASSED** (0 error, 0 warning trên toàn bộ file Profile).
2. **Kiểm tra đơn vị và component**:
   - `tests/component/pages/ProfilePage.spec.ts`: **13/13 PASSED** (6.0s).
   - `tests/unit/test-cases/profile.test-cases.spec.ts`: **4/4 PASSED** (1.4s).
   - `tests/unit/test-cases/business-automation-baseline.spec.ts`: **1/1 PASSED** (1.2s).
3. **Kiểm tra thực thi E2E Profile**:
   - `npx playwright test tests/profile/`: **19 passed, 3 skipped (22/22 executions)**.
     - `TC-PROFILE-CHANGEPW-003`, `TC-PROFILE-CHANGEPW-004`: PASS trên cả 3 trình duyệt (Chromium, Firefox, WebKit).
     - `TC-PROFILE-EDIT-001`, `TC-PROFILE-CHANGEPW-001`, `TC-PROFILE-CHANGEPW-002`: Tự động skip an toàn (3 skipped) dưới cờ `RUN_MUTATING_E2E=false`.
     - `TC-PROFILE-VIEW-001`, `TC-PROFILE-VIEW-002`, `TC-PROFILE-EDIT-002`, `TC-PROFILE-EDIT-003`: Fail đúng như dự kiến (`test.fail`), bảo toàn tính nghiêm ngặt khi phát hiện lỗi tồn đọng của sản phẩm (Product Gap).
   - Kết quả tự động nạp vào SQLite: `Trạng thái: THÀNH CÔNG`, ánh xạ đủ 9/9 Test Case IDs.

## Change Reconciliation

1. `pages/components/ProfileFormComponent.ts`:
   - Chuẩn hóa locator `avatarInput` thành `profileView.locator('input[type="file"]')`, tương thích mọi định dạng ảnh được hỗ trợ trên giao diện Propify (`.jpg,.jpeg,.png,.webp,.gif,...`).
2. `tests/unit/test-cases/business-automation-baseline.spec.ts`:
   - Đồng bộ danh mục `expectedAutomatedIds` bao gồm 4 test cases của Module Home vừa được tự động hóa, đưa tổng số automated cases lên 61 và backlog còn 22 cases.
3. `docs/tasks/TC-PROFILE-001-009-profile-management.md`:
   - Hoàn thiện và cập nhật đầy đủ tài liệu đặc tả và kết quả xác minh kiểm thử theo chuẩn Spec-First.
