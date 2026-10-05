---
ticket: TC-HOME-001-004
topic: home-search-filter-favorite
template-version: 1.1
status: active
phase: review
memory-version: 3
implementation-approved: true
has-dod: true
validation: passed
last-updated: 2026-09-22
---

# TC-HOME-001-004 - home-search-filter-favorite

## Objective

Chuẩn hóa, thiết kế kiến trúc và tự động hóa toàn bộ 4 kịch bản kiểm thử nghiệp vụ cho Module 03 — Trang chủ Propify (`https://propifyy.duckdns.org/`):
1. `TC-HOME-SEARCH-001`: [Read-Only] Tìm kiếm tương đối theo địa chỉ/tên tin đăng từ thanh tìm kiếm Hero trên trang chủ, hỗ trợ chuyển đổi nhu cầu Mua bán / Cho thuê.
2. `TC-HOME-FILTER-001`: [Read-Only] Lọc theo khoảng giá có sẵn (Cho thuê / Mua bán) khởi phát từ Trang chủ.
3. `TC-HOME-FILTER-002`: [Read-Only] Lọc theo khoảng giá tùy chỉnh và diện tích.
4. `TC-HOME-FAVORITE-001`: [Mutating] Thêm và bỏ tin yêu thích trực tiếp từ Card tin đăng tại trang chủ với trạng thái đăng nhập, quan sát khối "Tin đăng yêu thích" trên trang chủ.

## Current Understanding

1. **Khảo sát cấu trúc DOM thực tế tại Trang chủ Propify (`https://propifyy.duckdns.org/`)**:
   - Khối **Hero Search** (`section.relative`):
     - Chuyển đổi nhu cầu: 2 button `Mua bán` (mặc định active, class chứa `bg-primary`) và `Cho thuê` (class `bg-white/10`).
     - Thanh nhập từ khóa: `input[type="text"][placeholder="Nhập địa điểm, quận, đường..."]`.
     - Nút tìm kiếm: `button:has-text("Tìm kiếm")` (type submit hoặc button, có icon search).
   - Khối **Tin mua bán bất động sản** (`H2`):
     - Hiển thị 3 card tin bán tiêu biểu (`article` nằm trong thẻ `a[href^="/listings/"]`).
     - Link "Xem tất cả" (`a[href="/sales"]`).
   - Khối **Tin cho thuê bất động sản** (`H2`):
     - Hiển thị 3 card tin thuê tiêu biểu.
     - Link "Xem tất cả" (`a[href="/rent"]`).
   - Khối **Tin đăng yêu thích** (`H2`):
     - Khi chưa lưu tin: Hiển thị thông báo rỗng `"Bạn chưa lưu tin yêu thích nào."`.
     - Khi có tin yêu thích: Hiển thị các card tin đã lưu tương ứng.
   - Thẻ tin đăng (**Listing Card**):
     - Sử dụng `ListingCardComponent` đã có (`pages/components/ListingCardComponent.ts`).
     - Nút yêu thích: `button[type="button"][aria-label="Yêu thích"]` (icon SVG trái tim, khi active có style fill đỏ/rose).

2. **Cơ chế điều hướng & API khi tìm kiếm từ Trang chủ**:
   - Khi chọn tab `Mua bán` và nhập từ khóa, bấm "Tìm kiếm" -> Hệ thống điều hướng sang route `/sales?q=<keyword>` (hoặc `/sales?keyword=...`), gọi API backend `GET /api/v1/listings?demand_type=SALE&keyword=...`.
   - Khi chọn tab `Cho thuê` và nhập từ khóa, bấm "Tìm kiếm" -> Hệ thống điều hướng sang route `/rent?q=<keyword>&type=RENT`, gọi API backend `GET /api/v1/listings?demand_type=RENT&keyword=...`.
   - Bộ lọc chi tiết theo mốc giá có sẵn (preset radio) và khoảng giá/diện tích tùy chỉnh (input Từ - Đến) được tích hợp tại màn hình danh sách kết quả (`/sales` và `/rent`), nơi người dùng được điều hướng tới từ Trang chủ.

3. **Cơ chế Thêm/Bỏ yêu thích trên Card tại Trang chủ (`TC-HOME-FAVORITE-001`)**:
   - Yêu cầu người dùng đã đăng nhập (sử dụng storageState tài khoản active).
   - Click lần 1: Nút tim chuyển active (svg fill đỏ), API thêm yêu thích được gửi thành công, Card tin xuất hiện ngay tại khối `Tin đăng yêu thích` ở cuối trang chủ.
   - Click lần 2: Nút tim quay lại trạng thái unpressed/slate, Card tin biến mất khỏi khối `Tin đăng yêu thích`.
   - Cần cơ chế dọn dẹp (teardown/cleanup) khôi phục trạng thái ban đầu của tin đăng sau khi test kết thúc.

## Requirements

1. **Tuân thủ Kiến trúc 4 tầng (4-Layer Architecture)**:
   - `pages/home/HomePage.ts`: Đóng gói toàn bộ locators và tương tác UI của Trang chủ (`/`), kế thừa `BasePage`. Không chứa assertions Playwright.
   - `workflows/home/HomeWorkflow.ts` (hoặc mở rộng `ListingWorkflow`): Điều phối các luồng người dùng từ trang chủ sang trang danh sách kết quả hoặc toggle yêu thích.
   - `fixtures/test.fixture.ts` & `fixtures/mutating.fixture.ts`: Khai báo và compose `homePage` và `homeWorkflow`.
   - `tests/home/`: Chứa các test spec, chỉ chứa metadata, tags, và web assertions (`expect(...)`). Không chứa raw locators.
2. **Tuân thủ quy định Anti-Flakiness**:
   - Không sử dụng `page.waitForTimeout()` hoặc `setTimeout()`.
   - Sử dụng auto-retrying assertions (`await expect(locator).toBeVisible()`).
   - Bắt và theo dõi API request/response chính xác khi bấm Tìm kiếm hoặc áp dụng Bộ lọc.
3. **Quy định An toàn Môi trường & Test Mutating**:
   - `TC-HOME-SEARCH-001`, `TC-HOME-FILTER-001`, `TC-HOME-FILTER-002` là `read-only`, chạy an toàn không thay đổi dữ liệu.
   - `TC-HOME-FAVORITE-001` là `mutating`, phải đặt tên file `*.mutating.spec.ts`, gắn tag `@mutating`, chạy độc lập và có teardown khôi phục trạng thái yêu thích.

## Verified Findings

1. `HomePage` hiện chưa tồn tại trong `pages/`. Cần tạo mới `pages/home/HomePage.ts`.
2. `ListingCardComponent` (`pages/components/ListingCardComponent.ts`) đã hỗ trợ sẵn:
   - `toggleFavorite()`: click nút Trái tim `button[aria-label="Yêu thích"]`.
   - `isFavorited()`: kiểm tra trạng thái active qua `aria-pressed`, `aria-label`, hoặc class fill màu.
   - `summary()`: trích xuất thông tin tiêu đề, giá, diện tích, phòng ngủ, phòng tắm.
3. Trang chủ gọi 2 API khi tải:
   - `GET /api/v1/listings?demand_type=SALE&per_page=3`
   - `GET /api/v1/listings?demand_type=RENT&per_page=3`
4. Form tìm kiếm tại Hero:
   - Input: `page.getByPlaceholder('Nhập địa điểm, quận, đường...')`.
   - Nút Mua bán: `page.getByRole('button', { name: 'Mua bán' })`.
   - Nút Cho thuê: `page.getByRole('button', { name: 'Cho thuê' })`.
   - Nút Tìm kiếm: `page.getByRole('button', { name: 'Tìm kiếm' })`.
5. Khối "Tin đăng yêu thích" nằm tại section cuối trang chủ trước footer, chứa heading `H2` với text "Tin đăng yêu thích". Khi rỗng có text "Bạn chưa lưu tin yêu thích nào.".

## Confirmed Decisions

1. Tạo mới Page Object `HomePage` tại `pages/home/HomePage.ts` mở rộng `BasePage`.
2. Tạo mới `HomeWorkflow` tại `workflows/home/HomeWorkflow.ts` hoặc tích hợp các phương thức tương tác Trang chủ vào `ListingWorkflow`.
3. Đăng ký fixture `homePage` vào `fixtures/test.fixture.ts` và `fixtures/mutating.fixture.ts`.
4. Tổ chức các test specs trong thư mục `tests/home/`:
   - `tests/home/home-search.read-only.spec.ts` cho `TC-HOME-SEARCH-001`.
   - `tests/home/home-filter.read-only.spec.ts` cho `TC-HOME-FILTER-001` và `TC-HOME-FILTER-002`.
   - `tests/home/home-favorite.mutating.spec.ts` cho `TC-HOME-FAVORITE-001`.
5. Cập nhật `test-cases/home/home.test-cases.ts`: Chuyển `automation.status` từ `NOT_AUTOMATED` sang `AUTOMATED` và gắn đường dẫn `scriptPath`.

## Constraints

1. Không can thiệp hoặc sửa đổi mã nguồn ứng dụng web Propify (`production`).
2. Tuyệt đối không đặt raw locator trong file `tests/`.
3. Test mutating yêu thích phải luôn có khối `finally` hoặc cleanup đảm bảo trạng thái tài khoản không bị ô nhiễm sau khi chạy.
4. Mọi locator phải tuân theo thứ tự ưu tiên ngữ nghĩa: `getByRole` > `getByPlaceholder` > `getByText` > `getByTestId`. Cấm dùng CSS utility class Tailwind trần.

## Out of Scope

1. Các tính năng Admin, Quản trị hệ thống backend.
2. Các chức năng đặt lịch hẹn (`TC-APT-*`) và thanh toán VIP (`TC-PKG-*`).
3. Chỉnh sửa chi tiết tin đăng hoặc xác thực pháp lý tin đăng.

## Proposed Implementation

1. **Page Object (`pages/home/HomePage.ts`)**:
   - Locators:
     - `searchInput`: `this.page.getByPlaceholder('Nhập địa điểm, quận, đường...')`
     - `searchButton`: `this.page.getByRole('button', { name: 'Tìm kiếm' })`
     - `saleDemandButton`: `this.page.getByRole('button', { name: 'Mua bán' })`
     - `rentDemandButton`: `this.page.getByRole('button', { name: 'Cho thuê' })`
     - `saleSectionHeading`: `this.page.getByRole('heading', { name: 'Tin mua bán bất động sản', level: 2 })`
     - `rentSectionHeading`: `this.page.getByRole('heading', { name: 'Tin cho thuê bất động sản', level: 2 })`
     - `favoritesSectionHeading`: `this.page.getByRole('heading', { name: 'Tin đăng yêu thích', level: 2 })`
     - `favoritesEmptyMessage`: `this.page.getByText('Bạn chưa lưu tin yêu thích nào.')`
     - `viewAllSalesLink`: `this.page.getByRole('link', { name: /Xem tất cả/i }).filter({ has: this.page.locator('xpath=ancestor::div[contains(., "Tin mua bán")]') }).or(this.page.locator('a[href="/sales"]'))`
     - `viewAllRentLink`: `this.page.locator('a[href="/rent"]')`
   - Inquiry Methods:
     - `open()`: Điều hướng đến `ROUTES.home` (`/`).
     - `selectDemand(type: 'sale' | 'rent')`: Click chọn nhu cầu Mua bán hoặc Cho thuê.
     - `search(keyword: string, demand?: 'sale' | 'rent')`: Nhập từ khóa và bấm Tìm kiếm, đợi chuyển trang.
     - `saleCards()`: Trả về danh sách `ListingCardComponent` trong section Mua bán.
     - `rentCards()`: Trả về danh sách `ListingCardComponent` trong section Cho thuê.
     - `favoriteCards()`: Trả về danh sách `ListingCardComponent` trong section Tin đăng yêu thích.
     - `isFavoritesEmpty()`: Kiểm tra sự hiện diện của thông báo rỗng.

2. **Fixtures (`fixtures/test.fixture.ts` & `fixtures/mutating.fixture.ts`)**:
   - Bổ sung `homePage: async ({ page }, use) => { await use(new HomePage(page)); }`.

3. **Test Suites (`tests/home/`)**:
   - `tests/home/home-search.read-only.spec.ts`:
     - Test tìm kiếm theo tên tin đăng / địa chỉ với nhu cầu Mua bán -> verify kết quả trên trang `/sales`.
     - Test tìm kiếm với nhu cầu Cho thuê -> verify kết quả trên trang `/rent`.
   - `tests/home/home-filter.read-only.spec.ts`:
     - Test chọn nhu cầu từ trang chủ, lọc theo mốc giá có sẵn (preset) -> verify toàn bộ tin trả về nằm trong khoảng giá.
     - Test lọc theo khoảng giá tùy chỉnh (Từ - Đến) và diện tích tùy chỉnh -> verify tin thỏa mãn cả 2 điều kiện.
   - `tests/home/home-favorite.mutating.spec.ts`:
     - Đăng nhập với tài khoản hợp lệ, vào Trang chủ.
     - Chọn 1 card tin chưa yêu thích, bấm nút Trái tim -> verify icon active và card xuất hiện trong section "Tin đăng yêu thích".
     - Bấm lại nút Trái tim -> verify icon inactive và card biến mất khỏi section "Tin đăng yêu thích".
     - Teardown khôi phục lại trạng thái ban đầu.

4. **Catalog Definition (`test-cases/home/home.test-cases.ts`)**:
   - Cập nhật cả 4 test case sang trạng thái `AUTOMATED` kèm đường dẫn script tương ứng.

## Expected File Changes

1. `[NEW] pages/home/HomePage.ts`: Page Object đại diện cho Trang chủ Propify.
2. `[MODIFY] fixtures/page.fixture.ts`: Khai báo và khởi tạo fixture `homePage` trong `PageFixtures` và `pageTest`.
3. `[MODIFY] playwright.config.ts`: Bổ sung `home` vào `endToEndTestMatch` và `generalMutatingTestMatch`.
4. `[MODIFY] test-cases/home/home.test-cases.ts`: Cập nhật `automation.status: 'AUTOMATED'`, `scriptPath`, hàm trợ năng `getHomeTestCase` và `homeCaseTitle`.
5. `[NEW] tests/home/home-search.read-only.spec.ts`: Kịch bản `TC-HOME-SEARCH-001`.
6. `[NEW] tests/home/home-filter.read-only.spec.ts`: Kịch bản `TC-HOME-FILTER-001` và `TC-HOME-FILTER-002`.
7. `[NEW] tests/home/home-favorite.mutating.spec.ts`: Kịch bản `TC-HOME-FAVORITE-001`.

## Open Questions

- [non-blocking] Luồng lọc giá có sẵn và tùy chỉnh (`TC-HOME-FILTER-001`, `TC-HOME-FILTER-002`): Do trên trang chủ thực tế Propify không có dropdown mốc giá mà nằm ở trang kết quả danh sách (`/sales` và `/rent`), kịch bản kiểm thử sẽ đi từ Trang chủ chọn nhu cầu (Mua bán / Cho thuê) -> chuyển hướng sang danh sách tương ứng để áp dụng bộ lọc mốc giá / khoảng tùy chỉnh và assert kết quả. Thiết kế này đã khớp hoàn toàn với kiến trúc frontend hiện tại.

## Risks and Conflicts

1. **Trạng thái Yêu thích phụ thuộc dữ liệu phiên (`TC-HOME-FAVORITE-001`)**: Nếu tin đăng trên trang chủ tình cờ đã được tài khoản test yêu thích từ trước, trạng thái nút bấm ban đầu sẽ là active. Giải pháp: Kiểm tra trạng thái hiện tại trước khi toggle và luôn khôi phục lại trạng thái ban đầu trong khối `finally`.
2. **Dữ liệu tin đăng động trên production**: Số lượng tin hiển thị trên trang chủ có thể thay đổi theo thời gian. Giải pháp: Kiểm thử tương đối dựa trên danh sách thẻ thực tế trả về từ DOM và API thay vì hardcode số lượng cố định.

## Acceptance Criteria

- [DoD-1] `TC-HOME-SEARCH-001`: Từ trang chủ, khi người dùng nhập từ khóa tìm kiếm (theo địa chỉ hoặc tên tin đăng) và bấm "Tìm kiếm" với tab "Mua bán" hoặc "Cho thuê", hệ thống điều hướng chính xác sang trang danh sách tương ứng (`/sales` hoặc `/rent`) và hiển thị các tin đăng phù hợp theo cơ chế tìm kiếm tương đối.
- [DoD-2] `TC-HOME-FILTER-001`: Khởi phát từ trang chủ theo nhu cầu (Mua bán hoặc Cho thuê), áp dụng mốc giá có sẵn (preset range); danh sách kết quả chỉ hiển thị các tin đăng có mức giá nằm trong khoảng đã chọn.
- [DoD-3] `TC-HOME-FILTER-002`: Khởi phát từ trang chủ theo nhu cầu, áp dụng bộ lọc khoảng giá tùy chỉnh (Từ - Đến) kết hợp khoảng diện tích tùy chỉnh (Từ - Đến); danh sách kết quả hiển thị đúng các tin thỏa mãn đồng thời cả 2 khoảng giá trị.
- [DoD-4] `TC-HOME-FAVORITE-001`: Với người dùng đã đăng nhập, khi nhấn icon Yêu thích (Trái tim) trên một thẻ tin đăng tại trang chủ, icon chuyển sang trạng thái active và tin xuất hiện trong mục "Tin đăng yêu thích" trên trang chủ; khi nhấn lại lần thứ hai, icon trở về bình thường và tin biến mất khỏi mục "Tin đăng yêu thích". Sau khi chạy xong, trạng thái yêu thích ban đầu của tin được khôi phục nguyên vẹn.

## Change Reconciliation

- **Page Object**: Đã hoàn thành `pages/home/HomePage.ts` mở rộng `BasePage`, đóng gói semantic locators (`getByPlaceholder`, `getByRole`) và các phương thức thao tác/truy vấn trạng thái, không chứa assertions Playwright.
- **Fixtures**: Đã cập nhật `fixtures/page.fixture.ts` khai báo và tích hợp fixture `homePage` vào chuỗi composition fixture của framework (`pageTest` -> `workflowTest` -> `appointmentTest` -> `test` / `mutatingTest`).
- **Playwright Config**: Đã cập nhật `playwright.config.ts` thêm `home` vào regex `endToEndTestMatch` và `generalMutatingTestMatch` để Playwright tự động phát hiện và thực thi các spec trong thư mục `tests/home/`.
- **Test Cases Catalog**: Đã cập nhật `test-cases/home/home.test-cases.ts`, chuyển toàn bộ 4 TC sang trạng thái `AUTOMATED` kèm đường dẫn script tương ứng và bổ sung helper `getHomeTestCase`, `homeCaseTitle`.
- **Test Specs**: Đã tạo đầy đủ 3 test spec:
  - `tests/home/home-search.read-only.spec.ts` cho `TC-HOME-SEARCH-001`.
  - `tests/home/home-filter.read-only.spec.ts` cho `TC-HOME-FILTER-001` và `TC-HOME-FILTER-002`.
  - `tests/home/home-favorite.mutating.spec.ts` cho `TC-HOME-FAVORITE-001` (gắn tag `@mutating`, có teardown khôi phục).
- **Kiểm tra tĩnh**:
  - `npm run typecheck`: Passed, 0 errors.
  - `npx eslint pages/home/HomePage.ts fixtures/page.fixture.ts test-cases/home/home.test-cases.ts tests/home playwright.config.ts`: Passed, 0 errors, 0 warnings.
- **Xác thực danh mục**: `npx ts-node scripts/validate-test-cases.ts` xác nhận 4 TC đã map thành công, số lượng AUTOMATED nâng lên 61/83.

## Impact Analysis

1. **Kiến trúc & Tầng Page Object**:
   - Thêm mới `HomePage` (`pages/home/HomePage.ts`) độc lập, kế thừa `BasePage`, đóng gói toàn bộ locators và state inquiry của trang chủ. Không xâm lấn các Page Objects khác.
2. **Hệ thống Fixtures**:
   - Bổ sung `homePage` vào `fixtures/page.fixture.ts`, thừa hưởng tự nhiên vào toàn bộ chuỗi composition fixture (`pageTest`, `workflowTest`, `appointmentTest`, `test`, `mutatingTest`). Không làm thay đổi hành vi của các fixture khác.
3. **Cấu hình Thực thi Playwright**:
   - Bổ sung `home` vào `endToEndTestMatch` và `generalMutatingTestMatch` trong `playwright.config.ts`, đảm bảo các test specs mới được nhận diện chính xác ở các project Chromium, Firefox, WebKit và Mutating-Chromium.
4. **An toàn Dữ liệu & Mutation Gates**:
   - 3 kịch bản `TC-HOME-SEARCH-001`, `TC-HOME-FILTER-001`, `TC-HOME-FILTER-002` hoàn toàn read-only, sử dụng clean storage state.
   - Kịch bản `TC-HOME-FAVORITE-001` được cô lập trong `mutating-chromium` với cờ `@mutating`, có cơ chế teardown hoàn nguyên trạng thái yêu thích ban đầu trong khối `finally`.

## Verification Plan

### Automated Static Verification
- `npm run typecheck`: Đảm bảo toàn bộ codebase và các file mới tuân thủ strict mode của TypeScript.
- `npx eslint pages/home/HomePage.ts fixtures/page.fixture.ts test-cases/home/home.test-cases.ts tests/home playwright.config.ts`: Đảm bảo tuân thủ nghiêm ngặt chuẩn code, không vi phạm quy tắc cấm locator trong test hoặc assertion trong page.

### Scoped Automated E2E Execution
- `npx playwright test tests/home/home-search.read-only.spec.ts --project=chromium`: Kiểm thử tìm kiếm từ trang chủ theo từ khóa địa chỉ/tiêu đề cho cả 2 nhu cầu Mua bán và Cho thuê (`[DoD-1]`).
- `npx playwright test tests/home/home-filter.read-only.spec.ts --project=chromium`: Kiểm thử lọc theo mốc giá có sẵn (`[DoD-2]`) và khoảng giá/diện tích tùy chỉnh (`[DoD-3]`).
- `npx playwright test tests/home/home-favorite.mutating.spec.ts --project=mutating-chromium`: Kiểm thử thêm và bỏ yêu thích trực tiếp trên thẻ tin tại trang chủ với tài khoản đã đăng nhập (`[DoD-4]`).

## Verification Results

*(Sẽ được cập nhật sau khi thực thi các lệnh kiểm thử)*



