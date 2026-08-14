# AI-Powered Web Test Automation Framework

Framework Playwright + TypeScript theo chuẩn doanh nghiệp dành cho website bất động sản
[Propify](https://propifyy.duckdns.org/). Phạm vi hiện tại triển khai các chức năng người dùng:
Authentication, Profile, Listings, Appointments và Transactions; không triển khai Admin.

Module Authentication hiện có Login, Register, Gmail OTP, Forgot Password, xem/chỉnh sửa Profile
và Change Password. Mặc định framework chỉ chạy các kịch bản không thay đổi dữ liệu. Các hành trình
tạo tài khoản hoặc thay đổi tài khoản phải được bật rõ ràng bằng chính sách thực thi ở phần dưới.
Module Appointment Booking có workflow, dữ liệu độc lập, test truy vết và cổng mutation tập trung;
Admin và các thao tác phá hủy dữ liệu production nằm ngoài phạm vi hiện tại.

## Công nghệ

- Node.js 20+, npm và TypeScript 6 strict mode
- Playwright Test 1.62 với Chromium, Firefox và WebKit
- Zod để kiểm tra cấu hình môi trường trước khi mở trình duyệt
- Gmail API OAuth2 cho việc đọc OTP có kiểm soát
- ESLint, Prettier, HTML report và Allure report

## Kiến trúc

```text
Tests -> Fixtures -> Workflows -> Page Objects/Components -> Playwright
                    |
                    +-> Types, Test Data, Constants, Helpers, Utilities
```

- `tests/`: chỉ mô tả kịch bản, metadata và assertion; không chứa locator hoặc chi tiết nghiệp vụ.
- `fixtures/`: khởi tạo Page Object, Workflow, người dùng, execution policy và OTP provider.
- `workflows/`: phối hợp các hành trình nghiệp vụ có thể tái sử dụng; không chứa locator/assertion.
- `pages/`: sở hữu toàn bộ locator và thao tác UI. Mọi Page Object kế thừa `BasePage`.
- `helpers/otp/`: adapter Gmail và logic phân tích/correlation OTP, tách khỏi UI.
- `test-cases/`: metadata có kiểu dữ liệu cho ID, độ ưu tiên, tag và kết quả mong đợi.
- `test-data/`: dữ liệu kiểm thử không nhạy cảm và factory tạo dữ liệu độc lập.
- `config/`, `constants/`, `types/`, `utils/`: hợp đồng và logic kỹ thuật dùng chung.
- `docs/traceability/`: liên kết yêu cầu nghiệp vụ, mã nguồn và bằng chứng kiểm thử.
- `reporters/`: metadata và điểm mở rộng cho report.

Dependency chỉ đi từ tầng cao xuống tầng thấp. Page Object không phụ thuộc test, fixture hoặc
workflow; workflow phụ thuộc hợp đồng `OtpProvider`, không phụ thuộc trực tiếp Gmail.

## Cấu trúc chính

```text
config/                       Environment validation and selection
constants/                    Routes, tags, and timeouts
fixtures/                     Auth, Page, Workflow, and BaseTest composition
helpers/otp/                  OTP contracts adapters and Gmail integration
pages/                        Page Objects and reusable components
reporters/                    Allure environment metadata
test-cases/authentication/    Typed authentication case catalogs
test-data/                    Static safe data, factories, and upload files
tests/                        Unit, component, setup, and E2E scenarios
types/                        Shared TypeScript contracts
utils/                        Stateless technical helpers
workflows/                    Reusable business journeys
docs/                         Requirements, plans, prompts, and traceability
.auth/                        Generated storage state (ignored)
playwright-report/            Generated HTML report (ignored)
test-results/                 Generated Playwright artifacts (ignored)
allure-results/               Generated Allure raw results (ignored)
```

## Cài đặt

```bash
npm install
npx playwright install
```

Tạo file cấu hình cục bộ, sau đó thay toàn bộ placeholder bằng giá trị trong secret store của máy
hoặc CI:

```powershell
Copy-Item .env.example .env
```

Không commit `.env`, OAuth token, mật khẩu, OTP, storage state hoặc report được sinh ra. File
`.env.example` chỉ chứa placeholder an toàn.

## Môi trường và người dùng

`TEST_ENV` nhận một trong ba giá trị `dev`, `staging`, `production`; Base URL được lấy tương ứng từ
`DEV_BASE_URL`, `STAGING_BASE_URL`, `PRODUCTION_BASE_URL`. Cấu hình không hợp lệ sẽ dừng trước khi
Playwright khởi chạy.

Người dùng mặc định dùng `DEFAULT_USER_EMAIL` và `DEFAULT_USER_PASSWORD`. Người dùng phụ (nếu cần)
dùng `SECONDARY_USER_EMAIL` và `SECONDARY_USER_PASSWORD`. `test-data/static/users.json` chỉ giữ tên
alias và tên biến môi trường, không giữ credential thật.

## Chính sách thực thi an toàn

Giá trị mặc định:

```dotenv
RUN_OTP_E2E=false
RUN_MUTATING_E2E=false
RUN_PRODUCTION_REGISTRATION_E2E=false
RUN_PRODUCTION_MUTATING_E2E=false
```

Với mặc định này, các suite Login/Profile/validation không thay đổi dữ liệu có thể chạy; mọi file
`*.mutating.spec.ts` tự `skip`. Không được coi một lần chạy chỉ có kết quả skip là bằng chứng rằng
registration, password recovery, profile update hoặc password change đã chạy thành công thực tế.

Appointment E2E scenarios require a controlled, published listing owned by another user:

```dotenv
APPOINTMENT_LISTING_ID=replace-with-a-resettable-non-production-listing-id
```

`APPOINTMENT_LISTING_ID` is optional so unit/component tests and test discovery remain available
without controlled backend state.

Một kịch bản mutating Authentication chỉ được phép chạy khi **đồng thời** thỏa cả hai điều kiện:

```dotenv
RUN_OTP_E2E=true
RUN_MUTATING_E2E=true
```

When `TEST_ENV=production`, the two approvals are deliberately separate:
`RUN_PRODUCTION_REGISTRATION_E2E=true` authorizes only the dedicated production-registration
project. Password recovery, change-password, profile mutation, and Listings mutation require
`RUN_PRODUCTION_MUTATING_E2E=true`; the registration approval never authorizes an existing-account
mutation. Both production approval flags default to disabled.

`RUN_MUTATING_E2E=true` nhưng `RUN_OTP_E2E=false` bị schema và fixture từ chối. Các kịch bản này chạy
trong project `mutating-chromium`, ở chế độ serial, một worker. Screenshot, video và trace bị tắt
trong project này để tránh ghi mật khẩu hoặc OTP vào artifact.

Kịch bản đăng ký production chạy riêng trong project `production-registration-chromium`, không dùng
storage state đã đăng nhập, không retry, chạy serial với một worker và tắt screenshot, video, trace.
Ngoài các cổng thực thi ở trên, kịch bản này chỉ có ba biến cấu hình riêng:

```dotenv
REGISTRATION_EMAIL_TEMPLATE=replace-with-registration+{unique}@example.test
REGISTRATION_FULL_NAME=replace-with-registration-full-name
REGISTRATION_PASSWORD=replace-with-registration-password
```

Email template phải chứa đúng một `{unique}`. Production registration dùng chính cấu hình Gmail/OTP
chia sẻ ở phần dưới, bao gồm `OTP_MAILBOX_ADDRESS`, sender, subject, pattern, timeout và poll interval;
không có bộ biến `GMAIL_OTP_TIMEOUT_MS` hoặc `GMAIL_OTP_POLL_INTERVAL_MS` riêng.

Chỉ bật mutating trên môi trường kiểm thử được phép. Không dùng tài khoản cá nhân. Cấu hình một tài
khoản automation chuyên dụng, có thể khôi phục qua Gmail, bằng:

```dotenv
MUTATING_USER_EMAIL=replace-with-mutating-user@example.test
MUTATING_USER_BASELINE_PASSWORD=replace-with-mutating-baseline-password
MUTATING_USER_BASELINE_NAME=replace-with-mutating-baseline-name
```

Các flow profile/password cố gắng đưa tên và mật khẩu về baseline. Password recovery được dùng để
khôi phục trạng thái ngay cả khi lần chạy trước dừng giữa chừng; tuy vậy tài khoản vẫn phải được quản
lý như test data có trạng thái và không được chạy song song.

## Thiết lập Gmail OAuth2 cho OTP

1. Tạo hoặc chọn Google Cloud project dành riêng cho automation và bật Gmail API.
2. Cấu hình OAuth consent screen và OAuth client phù hợp với công cụ lấy refresh token nội bộ.
3. Cấp quyền chỉ đọc Gmail ở mức tối thiểu cần thiết cho mailbox automation; adapter chỉ tìm và đọc
   thư, không xóa hoặc đánh dấu đã đọc.
4. Lưu client ID, client secret và refresh token vào `.env` cục bộ hoặc CI secret store:

```dotenv
GMAIL_CLIENT_ID=replace-with-google-oauth-client-id
GMAIL_CLIENT_SECRET=replace-with-local-secret
GMAIL_REFRESH_TOKEN=replace-with-local-refresh-token
OTP_MAILBOX_ADDRESS=replace-with-gmail-mailbox@example.test
GMAIL_OTP_SENDER=replace-with-otp-sender@example.test
GMAIL_OTP_SUBJECT=replace-with-exact-otp-subject
GMAIL_OTP_PATTERN=replace-with-exact-otp-text-{otp}
OTP_POLL_INTERVAL_MS=2000
OTP_TIMEOUT_MS=60000
```

`GMAIL_OTP_PATTERN` is a literal text template containing exactly one `{otp}` placeholder; the
framework never compiles arbitrary environment-provided regular expressions. The provider requires
the configured sender and subject in addition to the existing recipient and timestamp correlation.

Không in các giá trị này ra log và không đính kèm nội dung email/OTP vào report. Khi
`RUN_OTP_E2E=true`, thiếu bất kỳ biến Gmail bắt buộc nào sẽ làm cấu hình thất bại rõ ràng.

Registration tạo địa chỉ Gmail plus-address dạng `mailbox+auth-<unique-id>@gmail.com`. Trước lần
chạy mutating đầu tiên, phải kiểm tra có kiểm soát rằng Propify coi plus-address là tài khoản riêng và
Gmail vẫn chuyển thư về `OTP_MAILBOX_ADDRESS`. Nếu ứng dụng chuẩn hóa alias về địa chỉ gốc, không
chạy đăng ký song song; chuyển sang một danh tính automation xác định và chính sách cleanup được phê
duyệt. Factory chủ động từ chối mailbox không thuộc `gmail.com`.

## Chạy kiểm thử

Kiểm tra chất lượng mã nguồn:

```bash
npm run typecheck
npm run lint
npm run format:check
```

Chạy unit/component không cần website thật:

```bash
npx playwright test --project=framework
```

Chạy Authentication/Profile theo chính sách an toàn mặc định:

```bash
npm run test:auth
```

Chạy toàn bộ cấu hình hoặc từng browser:

```bash
npm test
npm run test:chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

Các project browser phụ thuộc `auth-setup`, dùng `.auth/defaultUser.json` cho scenario cần đăng nhập
và giữ chế độ parallel. Login/registration/recovery tự đặt storage state rỗng khi cần kiểm tra trạng
thái chưa đăng nhập.

Sau khi đã cấu hình mailbox/tài khoản chuyên dụng và phê duyệt môi trường, chạy riêng mutating:

```bash
npm run test:auth:mutating
```

Script trên chọn `mutating-chromium`, lọc tag `@mutating` và ép `--workers=1`; hai execution flag vẫn
phải được đặt trong `.env`.

Các tag hiện có: `@smoke`, `@regression`, `@authentication`, `@profile`, `@otp`, `@mutating`,
`@listings`, `@appointments`, `@transactions`.

```bash
npm run test:smoke
npm run test:regression
npx playwright test --grep @authentication
```

## Known product defect

`AUTH-RECOVERY-001` kiểm tra nút gửi OTP phải bị vô hiệu khi email sai định dạng. Bản triển khai
Propify hiện tại có thể chỉ validate sau khi nhấn gửi. Test dùng `test.fail` có điều kiện: nếu defect
còn tồn tại thì kết quả được báo là expected failure; khi sản phẩm sửa, cùng test sẽ chạy như một
assertion bình thường. Test không nhấn gửi OTP nên không làm thay đổi dữ liệu.

## Chẩn đoán và report

Các project browser thông thường chụp screenshot khi fail, giữ video khi fail và thu trace ở lần
retry đầu tiên. Project mutating tắt ba artifact này theo chính sách bảo vệ secret.

- HTML report: `playwright-report/`
- Playwright artifacts: `test-results/`
- Allure raw results: `allure-results/`
- Allure report: `allure-report/`

```bash
npm run report:html
npm run report:allure:generate
npm run report:allure:open
```

Allure CLI cần Java. Các thư mục report/result đều bị Git ignore; CI publishing và history retention
là điểm mở rộng, chưa gắn với một CI provider cụ thể.

## Mở rộng framework

Khi thêm Chat, Payment, Notification, Admin, API, Visual hoặc AI testing:

1. Thêm domain contract dưới `types/` và dữ liệu an toàn/factory dưới `test-data/`.
2. Thêm Page Object/component dưới `pages/<feature>/`; mọi locator phải ở tầng này.
3. Thêm workflow nhỏ, tập trung một trách nhiệm dưới `workflows/<feature>/`.
4. Đăng ký Page/Workflow qua fixture có kiểu dữ liệu; inject adapter qua interface khi có hạ tầng ngoài.
5. Thêm case ID, tags và mapping vào `docs/traceability/requirements-to-tests.md`.
6. Viết scenario chỉ gọi public API và assertion; bổ sung unit/component trước E2E.
7. Tách test thay đổi dữ liệu thành project/flag riêng, có baseline recovery và artifact policy phù hợp.

Gmail hiện chỉ là adapter đầu tiên của `OtpProvider`; có thể thay bằng IMAP, test-mail service hoặc API
nội bộ mà không sửa Page Object hay test scenario.

## Listings module

Module Tin đăng bao phủ tạo, xem danh sách, xem chi tiết, chỉnh sửa, gỡ hiển thị, tìm kiếm, lọc và
yêu thích theo Page Object Model. Tiêu đề và nội dung nghiệp vụ của test case dùng tiếng Việt; tên
file, identifier và API contract giữ bằng tiếng Anh để phù hợp kiến trúc TypeScript hiện có.

Chạy nhóm chỉ đọc trên Chromium (không cần cờ mutation):

```powershell
Remove-Item Env:ALLOW_MUTATING_E2E -ErrorAction SilentlyContinue
npx playwright test tests/listings/*.read-only.spec.ts --project=chromium
```

Các test cần trạng thái tin cụ thể đọc tham chiếu `LISTING_*_ID` và `LISTING_*_TITLE` từ môi trường.
Nếu staging/test chưa seed alias tương ứng, fixture sẽ skip có lý do thay vì chọn ngẫu nhiên một tin.
Các cặp `OWNED_PUBLISHED_CANCEL` và `OWNED_PUBLISHED_WITHDRAW` phải là hai bản ghi `Đang đăng`
riêng biệt; bản ghi xác nhận gỡ cần được seed lại trước lần chạy opt-in tiếp theo.

### Cổng an toàn cho E2E có thay đổi dữ liệu

Mọi spec `*.mutating.spec.ts` chỉ import `mutatingTest` từ `fixtures/mutating.fixture.ts`. Fixture tự
động này tập trung toàn bộ kiểm tra môi trường và skip test trước Page action, trừ khi giá trị chính
xác `ALLOW_MUTATING_E2E=true` được cung cấp. Trên production còn bắt buộc
`RUN_PRODUCTION_MUTATING_E2E=true`. Không sao chép điều kiện môi trường vào từng spec.

Mặc định an toàn, kể cả khi `TEST_ENV=production`:

```powershell
Remove-Item Env:ALLOW_MUTATING_E2E -ErrorAction SilentlyContinue
npx playwright test tests/listings/*.mutating.spec.ts --project=mutating-chromium
```

Lệnh trên phải báo toàn bộ kịch bản mutating là `skipped`. Chỉ bật opt-in cho staging/test đã được
phê duyệt, có dữ liệu seed riêng và chính sách khôi phục:

```powershell
$env:TEST_ENV='staging'
$env:ALLOW_MUTATING_E2E='true'
npx playwright test tests/listings/*.mutating.spec.ts --project=mutating-chromium
```

Không chạy lệnh opt-in khi target hiện tại là production. Framework đã sẵn sàng cho `dev`, `staging`
và `production` thông qua URL theo môi trường, nhưng cờ opt-in vẫn là quyết định chủ động độc lập.

Mọi file `*.mutating.spec.ts` bị loại khỏi các project `chromium`, `firefox`, `webkit` và chỉ được
discover trong project `mutating-chromium` với `fullyParallel: false`, `workers: 1`. Các kiểm tra tạo
và chỉnh sửa thành công dùng component fixture xác định để không để lại bản ghi hoặc làm trôi alias
trên môi trường dùng chung. Kịch bản xác nhận gỡ tin vẫn cần seed lại bản ghi dành riêng sau mỗi lần
opt-in vì giao diện không cung cấp thao tác khôi phục trạng thái `Đang đăng`.

Theo nghiệp vụ, “Gỡ tin đăng” chỉ chuyển trạng thái sang `Đã gỡ` và ẩn tin khỏi danh sách công khai.
Test xác nhận hàng/bản ghi vẫn tồn tại; framework không thực hiện xóa vật lý trong cơ sở dữ liệu.

## Appointment Booking module

The Appointment module implements the UC-18 journey through
`AppointmentWorkflow.prepareAppointment()` and `submitPreparedAppointment()`. It discovers only
enabled semantic date/time buttons and selects either an exact enabled option or the earliest enabled
option, so no expiring date is stored in source or JSON. Exact disabled options fail immediately with
a descriptive error instead of waiting for a browser click timeout.

Test Case IDs:

- `APPOINTMENT-001`: create an appointment successfully (manual/reseed required; automation is
  permanently skipped until an approved cleanup contract exists);
- `APPOINTMENT-002`: require an appointment time;
- `APPOINTMENT-003`: require a contact name;
- `APPOINTMENT-004`: validate a Vietnamese phone number;
- `APPOINTMENT-005`: require a Gmail email address.

Discover all appointment tests without executing them:

```bash
npx playwright test tests/appointments --list
```

Run deterministic unit/component coverage:

```bash
npx playwright test tests/unit tests/component --project=framework
```

Run read-only appointment validation against a configured controlled listing:

```bash
npx playwright test tests/appointments/appointment-validation.read-only.spec.ts --project=chromium
```

Do not automate the create scenario against an external target. The UI/API currently provides no
confirmed cleanup operation, so a successful run leaves persistent appointment state and is not
repeatable. `APPOINTMENT-001` remains as a permanently skipped manual evidence placeholder. A manual
run requires an authenticated non-owner test user, a dedicated published listing, confirmation that
no unfinished appointment exists, and explicit reseeding afterward.

The placeholder remains behind the centralized mutation policy and is discovered only by the
authenticated `appointment-mutating-chromium` project. That project depends on `auth-setup`, uses the
default authenticated storage state, disables artifacts, and runs serially with one worker. The
general `mutating-chromium` project keeps empty storage for registration and other flows that require
it. Normal browser projects exclude every `*.mutating.spec.ts` file.

## Safety

Test Listings chỉ đọc chạy mặc định. Các luồng tạo, sửa, gỡ và yêu thích được bảo vệ bởi cổng an
toàn tập trung nêu trên. Appointment creation không còn là E2E thành công có thể thực thi: placeholder
luôn skip cho đến khi có cleanup contract được phê duyệt; kiểm tra submit thành công chỉ chạy bằng
component fixture xác định, không ghi backend.
Payment và Transaction mutation vẫn cần môi trường kiểm thử cùng chính sách dọn dữ liệu riêng.
