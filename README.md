# AI-Powered Web Test Automation Framework

Framework Playwright + TypeScript theo chuẩn doanh nghiệp dành cho website bất động sản
[Propify](https://propifyy.duckdns.org/). Phạm vi hiện tại triển khai các chức năng người dùng:
Authentication, Profile, Listings, Appointments và Transactions; không triển khai Admin.

Module Authentication hiện có Login, Register, Gmail OTP, Forgot Password, xem/chỉnh sửa Profile
và Change Password. Mặc định framework chỉ chạy các kịch bản không thay đổi dữ liệu. Các hành trình
tạo tài khoản hoặc thay đổi tài khoản phải được bật rõ ràng bằng chính sách thực thi ở phần dưới.

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
```

Với mặc định này, các suite Login/Profile/validation không thay đổi dữ liệu có thể chạy; mọi file
`*.mutating.spec.ts` tự `skip`. Không được coi một lần chạy chỉ có kết quả skip là bằng chứng rằng
registration, password recovery, profile update hoặc password change đã chạy thành công thực tế.

Một kịch bản mutating chỉ được phép chạy khi **đồng thời** thỏa cả hai điều kiện:

```dotenv
RUN_OTP_E2E=true
RUN_MUTATING_E2E=true
```

When `TEST_ENV=production`, the schema, fixture, and mutating specs additionally require
`RUN_PRODUCTION_REGISTRATION_E2E=true`. This production approval gate defaults to disabled.

`RUN_MUTATING_E2E=true` nhưng `RUN_OTP_E2E=false` bị schema và fixture từ chối. Các kịch bản này chạy
trong project `mutating-chromium`, ở chế độ serial, một worker. Screenshot, video và trace bị tắt
trong project này để tránh ghi mật khẩu hoặc OTP vào artifact.

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
