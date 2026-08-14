# BỘ TEST CASE AUTOMATION (PLAYWRIGHT) — HỆ THỐNG PROPIFY (BẢN THỐNG NHẤT)

**Phạm vi:** Phân hệ **Người dùng (Client)** — không bao gồm Admin/CMS.

# MODULE 01 — AUTHENTICATION (AUTH)

## 1.1. Đăng ký tài khoản

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-REGISTER-001 | [Happy Path] Đăng ký tài khoản thành công với thông tin hợp lệ, hoàn tất xác thực OTP | User ở màn hình Đăng ký. Email chưa từng tồn tại. **Cần cơ chế lấy OTP tự động (Gmail API/Test Mailbox).** | Email: `auto_reg@gmail.com`; Mật khẩu: `Admin@123`; Xác nhận MK: `Admin@123` | 1. Nhập Email, Mật khẩu, Xác nhận mật khẩu hợp lệ. 2. Click "Đăng ký" — quan sát nút chuyển trạng thái loading + disable. 3. Hệ thống gọi API thành công, chuyển sang bước nhập OTP. 4. Lấy OTP từ hộp thư test, nhập đủ 6 số. 5. Nhấn "Xác nhận OTP". | Bước 2: nút Đăng ký hiển thị loading và bị disable trong lúc xử lý. Bước 3: API tạo tài khoản (status PENDING) thành công, chuyển bước OTP. Bước 5: tài khoản chuyển ACTIVE, JWT token được cấp, điều hướng thành công. | - | - | - | - |
| TC-AUTH-REGISTER-002 | [Required Validation] Chặn đăng ký khi bỏ trống các trường bắt buộc | User ở màn hình Đăng ký | Để trống toàn bộ form | 1. Không điền thông tin. 2. Click "Đăng ký". | Hệ thống không gọi API tạo tài khoản; toàn bộ trường bắt buộc hiển thị lỗi trực quan (màu đỏ) dưới field. | - | - | - | - |
| TC-AUTH-REGISTER-003 | [Input Validation] Chặn đăng ký khi Email sai định dạng | User ở màn hình Đăng ký | Email lần lượt: `"auto_reg@gmail"`, `"auto_reg"`, `"auto@.com"` | 1. Nhập lần lượt từng chuỗi email sai định dạng. 2. Blur (tab-out) khỏi trường. | Với mỗi giá trị: hệ thống bắt lỗi realtime, hiển thị "Email không hợp lệ". | - | - | - | - |
| TC-AUTH-REGISTER-004 | [Business Rule] Chặn đăng ký khi Email đã tồn tại | Đã tồn tại tài khoản với email User A | Email của User A (đã tồn tại) | 1. Nhập Email đã tồn tại. 2. Blur hoặc Submit. | Hệ thống kiểm tra trùng email, hiển thị lỗi "Email đã tồn tại"; không tạo tài khoản. | - | - | - | - |
| TC-AUTH-REGISTER-005 | [Input Validation] Báo lỗi biên độ dài và định dạng ký tự của Mật khẩu | User ở màn hình Đăng ký | Mật khẩu lần lượt: `"1234567"` (<8 ký tự), `"admin123"` (thiếu hoa), `"ADMIN123"` (thiếu thường), `"AdminAsdf"` (thiếu số) | 1. Nhập từng mẫu mật khẩu sai quy chuẩn. 2. Blur khỏi field. | Với mỗi giá trị: hệ thống validate realtime, hiển thị "Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số". | - | - | - | - |
| TC-AUTH-REGISTER-006 | [Business Rule] Báo lỗi khi Xác nhận mật khẩu không khớp | User ở màn hình Đăng ký | Mật khẩu: `Admin@123`; Xác nhận MK: `Admin@1234` | 1. Nhập mật khẩu hợp lệ. 2. Nhập xác nhận mật khẩu khác giá trị. 3. Blur khỏi field. | Hiển thị lỗi ngay: "Phải trùng khớp với mật khẩu đã nhập". | - | - | - | - |
| TC-AUTH-REGISTER-007 | [Negative / State] OTP sai hoặc hết hạn | Đã submit form đăng ký hợp lệ, hệ thống đã gửi OTP | OTP sai (bất kỳ); OTP đã hết hạn (đợi quá thời gian hiệu lực) | 1. Nhập OTP sai, nhấn "Xác nhận OTP" → quan sát lỗi. 2. Chờ OTP hết hạn, nhập lại OTP cũ, nhấn "Xác nhận OTP" → quan sát lỗi. | Case 1: hiển thị lỗi OTP sai, cho nhập lại, tài khoản vẫn PENDING. Case 2: hệ thống yêu cầu gửi lại OTP. | - | - | - | - |
| TC-AUTH-REGISTER-008 | [Boundary] Nút "Gửi lại OTP" bị disable trong countdown, enable sau khi hết | Đang ở màn hình nhập OTP, vừa gửi OTP lần đầu | Countdown mặc định (VD 60s) | 1. Quan sát nút "Gửi lại OTP" ngay sau khi gửi. 2. Chờ hết countdown, quan sát lại. | Bước 1: nút disable, countdown hiển thị giảm dần. Bước 2: nút chuyển enable. | - | - | - | - |

## 1.2. Đăng nhập

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-LOGIN-001 | [Happy Path / Smoke] Đăng nhập thành công với tài khoản Active | Tài khoản User A tồn tại, đang Active. User ở trang đăng nhập. | Email/SĐT + Mật khẩu hợp lệ của User A | 1. Nhập Email/SĐT và Mật khẩu hợp lệ. 2. Click "Đăng nhập". | Đăng nhập thành công; JWT token được lưu chính xác vào LocalStorage/Cookie; điều hướng về trang chủ. | - | - | - | - |
| TC-AUTH-LOGIN-002 | [Negative] Đăng nhập thất bại khi sai mật khẩu | Tài khoản User A tồn tại | Email đúng của User A; Mật khẩu sai | 1. Nhập đúng Email, sai Mật khẩu. 2. Click "Đăng nhập". | Hiển thị "Thông tin tài khoản hoặc mật khẩu không chính xác"; không chuyển hướng trang. | - | - | - | - |
| TC-AUTH-LOGIN-003 | [State / Rule] Chặn đăng nhập với tài khoản bị khóa | Tồn tại tài khoản đã bị khóa (Locked trong DB) | Email/Mật khẩu đúng của tài khoản Locked | 1. Nhập đúng thông tin đăng nhập của tài khoản Locked. 2. Click "Đăng nhập". | Hệ thống trả mã lỗi tương ứng, hiển thị "Tài khoản của bạn đã bị khóa", dừng tiến trình. | - | - | - | - |
| TC-AUTH-LOGIN-004 | [Required Validation] Bỏ trống Email/SĐT hoặc Mật khẩu | User ở trang đăng nhập | Email/SĐT hoặc Mật khẩu để trống | 1. Để trống 1 trong 2 trường. 2. Click "Đăng nhập". | Validate chặn, không gửi request login. | - | - | - | - |
| TC-AUTH-LOGIN-005 [Optional/Low] | [Happy Path / OAuth] Đăng nhập qua Google (mock) | **Cần Playwright Browser Context có sẵn phiên Google Test HOẶC Mock API OAuth Token** (không dùng OAuth thật) | Tài khoản Google Test hợp lệ/token giả lập | 1. Click "Đăng nhập với Google". 2. Thực hiện luồng xác thực (mock). | Ứng dụng nhận access token; nếu chưa có tài khoản thì tự tạo mới; cấp JWT, chuyển hướng trang chủ. *(Priority Low — chỉ chạy khi có sẵn hạ tầng mock ổn định; nếu không có mock, loại khỏi automation suite theo quy tắc không kiểm thử OAuth thật.)* | - | - | - | - |

## 1.3. Quên mật khẩu

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-FORGOT-001 | [Happy Path / E2E] Khôi phục mật khẩu thành công qua OTP Email | Tài khoản tồn tại, đang hoạt động. **Cần Gmail API/Test Mailbox lấy OTP.** | Email hợp lệ; Mật khẩu mới: `NewAdmin@123` | 1. Nhập email, nhấn "Gửi OTP". 2. Lấy OTP qua script Gmail API. 3. Nhập OTP, xác nhận. 4. Nhập mật khẩu mới hợp lệ, nhấn "Đổi mật khẩu". | Thông báo khôi phục thành công, redirect về trang Đăng nhập. | - | - | - | - |
| TC-AUTH-FORGOT-002 | [Negative] Email không tồn tại | Email chưa từng đăng ký | Email không tồn tại | 1. Nhập email không tồn tại. 2. Nhấn "Gửi OTP". | Hiển thị lỗi, dừng luồng, không gửi OTP. | - | - | - | - |
| TC-AUTH-FORGOT-003 | [Negative / State] OTP sai hoặc hết hạn | Đã gửi OTP tới email hợp lệ | OTP sai; OTP hết hạn | 1. Nhập OTP sai, xác nhận → quan sát lỗi. 2. Chờ hết hạn, nhập OTP cũ → quan sát lỗi. | Case 1: lỗi, cho nhập lại. Case 2: yêu cầu gửi lại OTP. | - | - | - | - |

---

# MODULE 02 — PROFILE (HỒ SƠ TÀI KHOẢN)

## 2.1. Xem thông tin tài khoản

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-PROFILE-VIEW-001 | [Happy Path] Hiển thị chính xác thông tin tài khoản hiện hành | Người dùng đã đăng nhập | Dữ liệu phiên đăng nhập hiện tại | 1. Truy cập "Thông tin tài khoản". | UI kết xuất chính xác từ DB: Avatar, Họ tên, Email, SĐT, Badge trạng thái Active. | - | - | - | - |
| TC-PROFILE-VIEW-002 | [Negative] Chuyển hướng đăng nhập khi token không hợp lệ | Token hết hạn/không hợp lệ | Token invalid | 1. Với token invalid, truy cập "Thông tin tài khoản". | Redirect về trang đăng nhập. | - | - | - | - |

## 2.2. Chỉnh sửa thông tin tài khoản

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-PROFILE-EDIT-001 | [Happy Path / CRUD] Chỉnh sửa thông tin cá nhân thành công kèm upload Avatar | Người dùng đã đăng nhập, ở màn Chỉnh sửa thông tin | Họ tên mới hợp lệ; File ảnh: `avatar_valid.png` | 1. Nhập họ tên mới hợp lệ. 2. Upload avatar mới (PNG). 3. Click "Lưu". | Dữ liệu cập nhật thành công vào DB; hiển thị Toast thông báo hoàn tất; avatar mới cập nhật ngay trên header. | - | - | - | - |
| TC-PROFILE-EDIT-002 | [Business Rule] Không gọi API khi không có thay đổi dữ liệu | Form hiển thị dữ liệu hiện tại, không chỉnh sửa gì | Giữ nguyên thông tin cũ | 1. Click "Lưu" mà không chỉnh sửa gì. | Hiển thị "Không có thay đổi dữ liệu"; **không** gọi API Update. | - | - | - | - |
| TC-PROFILE-EDIT-003 ⚠ Khác biệt tài liệu | [Boundary] Cắt chuỗi (truncate) khi paste Họ tên vượt quá 50 ký tự | Đang ở màn hình Chỉnh sửa thông tin cá nhân | Chuỗi 60 ký tự | 1. Copy chuỗi 60 ký tự. 2. Paste vào field "Họ và tên". | Trường tự động cắt, chỉ giữ 50 ký tự đầu. *(Lưu ý: tài liệu gốc chỉ nêu rule 2–100 ký tự cho Họ tên ở màn Đăng ký; rule "50 ký tự" ở màn Chỉnh sửa thông tin cá nhân không có trong tài liệu — cần BA xác nhận số chính xác trước khi tin tưởng assertion 50.)* | - | - | - | - |

## 2.3. Đổi mật khẩu

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-PROFILE-CHANGEPW-001 | [Happy Path / State Transition] Đổi mật khẩu thành công và thu hồi phiên cũ | Người dùng đã đăng nhập | MK cũ đúng; MK mới hợp lệ; Xác nhận khớp | 1. Nhập đúng MK hiện tại. 2. Nhập MK mới hợp lệ + xác nhận khớp. 3. Nhấn "Xác nhận". | Mật khẩu cập nhật vào DB; token hiện tại trong LocalStorage/Cookie bị thu hồi; tự động đẩy về trang Đăng nhập. | - | - | - | - |
| TC-PROFILE-CHANGEPW-002 | [Negative] Sai mật khẩu hiện tại | Người dùng đã đăng nhập | MK cũ sai | 1. Nhập sai MK hiện tại, các trường còn lại đúng. 2. Nhấn "Xác nhận". | Lỗi "Mật khẩu hiện tại không chính xác"; giữ nguyên form, không đổi dữ liệu. | - | - | - | - |
| TC-PROFILE-CHANGEPW-003 [CẦN XÁC NHẬN NGHIỆP VỤ] | [Negative] Mật khẩu mới không hợp lệ | MK cũ đúng | MK mới không đạt rule | 1. Nhập đúng MK hiện tại. 2. Nhập MK mới không hợp lệ. 3. Nhấn "Xác nhận". | Hiển thị lỗi, quay lại bước nhập. *(Rule cụ thể cho màn này chưa được xác nhận có trùng rule Đăng ký hay không.)* | - | - | - | - |
| TC-PROFILE-CHANGEPW-004 | [Negative] Xác nhận mật khẩu không khớp | MK cũ đúng, MK mới hợp lệ | Xác nhận MK khác MK mới | 1. Nhập đúng MK hiện tại, MK mới hợp lệ. 2. Nhập xác nhận khác giá trị. 3. Nhấn "Xác nhận". | Hiển thị lỗi không khớp. | - | - | - | - |

---

# MODULE 03 — HOMEPAGE / TÌM KIẾM & BỘ LỌC TRANG CHỦ (HOME)

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-HOME-SEARCH-001 | Tìm kiếm tương đối theo địa chỉ/tên tin đăng | Có tin đăng đã duyệt | Từ khóa khớp 1 phần địa chỉ/tiêu đề | 1. Nhập từ khóa vào thanh tìm kiếm. 2. Thực hiện tìm kiếm. | Trả về các tin đăng phù hợp theo kiểu tìm kiếm tương đối. | - | - | - | - |
| TC-HOME-FILTER-001 | Lọc theo khoảng giá có sẵn (Cho thuê / Mua bán) | Trang chủ có tin đăng ở nhiều mức giá | Chọn mốc giá tương ứng nhu cầu | 1. Chọn nhu cầu (Cho thuê/Mua bán). 2. Chọn mốc giá có sẵn. 3. Áp dụng. | Danh sách chỉ hiển thị tin đúng khoảng giá đã chọn. | - | - | - | - |
| TC-HOME-FILTER-002 | Lọc theo khoảng giá tùy chỉnh và diện tích | Trang chủ có dữ liệu | Giá Từ–Đến tùy chỉnh; Diện tích Từ–Đến | 1. Nhập khoảng giá tùy chỉnh, áp dụng. 2. Nhập khoảng diện tích, áp dụng. | Danh sách hiển thị đúng các tin nằm trong khoảng đã nhập. | - | - | - | - |
| TC-HOME-FAVORITE-001 | Thêm/bỏ tin yêu thích từ thẻ tin đăng (Card) tại trang chủ | Người dùng đã đăng nhập; tin đăng chưa yêu thích | Tin đăng bất kỳ | 1. Nhấn icon Yêu thích trên Card. 2. Nhấn lại lần 2. | Lần 1: icon chuyển active, tin xuất hiện trong "Yêu thích". Lần 2: tin biến mất khỏi "Yêu thích". | - | - | - | - |

---

# MODULE 03.x — XẾP HẠNG & THỨ TỰ HIỂN THỊ TIN ĐĂNG (RANKING)

*Nguồn: tài liệu "Quy tắc Chấm điểm & Xếp hạng Hiển thị Tin đăng" + bộ case `TC-SCORE-RANK-*`/`TC-SCORE-QUAL-*` trong file QA. Cách kiểm thử: **seed data qua API/DB** (gói VIP, điểm chất lượng, thời gian đăng biết trước) rồi **assert thứ tự DOM** (`locator('.listing-card')`) — không assert giá trị điểm số tuyệt đối trừ khi hệ thống expose API riêng.*

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-RANK-ORDER-001 | [Core Rule 1] Tin VIP Kim Cương đăng lâu (điểm thấp) LUÔN xếp TRÊN tin VIP Vàng vừa đăng (điểm cao) | **Seed qua API:** Tin A = VIP Kim Cương, Cấp 4, đã đăng 168h, Final Score ≈ 0.5; Tin B = VIP Vàng, Cấp 3, vừa đăng 0h, Final Score = 30 | Từ khóa tìm kiếm chung để 2 tin cùng xuất hiện | 1. Tìm kiếm/hiển thị danh sách chứa cả 2 tin. 2. Lấy vị trí DOM của các `.listing-card`. | Tin A xuất hiện ở vị trí trước Tin B, dù Final Score thấp hơn nhiều — đúng quy tắc Cấp ưu tiên gói xét trước Điểm hiển thị (Mục 6). | - | - | - | - |
| TC-RANK-ORDER-002 | [Core Rule 1] Tin VIP Vàng đăng lâu LUÔN xếp TRÊN tin VIP Bạc/Tin Thường mới đăng | **Seed:** Tin A = VIP Vàng, Cấp 3, đăng 72h; Tin B = VIP Bạc, Cấp 2, đăng 2h (khớp ví dụ Mục 7 tài liệu) | Danh sách chứa cả 2 tin | 1. Truy cập danh sách tin đăng. 2. Assert thứ tự DOM Tin A / Tin B. | Tin A đứng trên Tin B. | - | - | - | - |
| TC-RANK-ORDER-003 | [Core Rule 2 – Same VIP] Cùng hạng VIP Vàng, tin điểm chất lượng cao hơn xếp TRÊN | **Seed:** 2 tin cùng gói VIP Vàng, cùng thời gian đăng (0h): Tin A (Score 10/10 → Final 30); Tin B (Score 6/10 → Final 18) | Danh sách tin cùng hạng | 1. Xem danh sách tin VIP Vàng. 2. So sánh thứ tự hiển thị. | Tin A xếp trên Tin B. | - | - | - | - |
| TC-RANK-ORDER-004 | [Core Rule 2 – Time Decay] Cùng hạng VIP Bạc, tin mới đăng xếp TRÊN tin đăng lâu | **Seed:** 2 tin cùng gói VIP Bạc, cùng điểm chất lượng 10/10: Tin A (vừa đăng 1h) vs Tin B (đăng 48h) | Danh sách tin VIP Bạc | 1. Kiểm tra vị trí Tin A/Tin B. | Tin A (mới hơn, Final Score cao hơn) xếp trên Tin B. | - | - | - | - |
| TC-RANK-ORDER-005 | [Decay Rate] Tốc độ giảm điểm VIP Kim Cương (0.01) chậm hơn hẳn Tin Thường (0.08) | **Seed:** 2 tin cùng đăng 48h trước, cùng điểm chất lượng 10/10: Tin A (Kim Cương) vs Tin B (Tin Thường) | Thời gian đã đăng: 48h | 1. Gọi API/Request kiểm tra `finalScore` trả về từ Backend cho cả 2 tin (hoặc suy ra qua vị trí DOM nếu không có API). | Tỷ lệ giảm điểm của Tin B giảm mạnh hơn nhiều lần so với Tin A — thể hiện đúng cơ chế tốc độ giảm điểm khác nhau theo hạng gói (Mục 4–5). | - | - | - | - |
| TC-RANK-QUAL-001 | [Quality Score Effect] Bổ sung đầy đủ giấy tờ pháp lý/mô tả giúp tăng Điểm chất lượng và đẩy vị trí hiển thị | Tin A đang ở VIP Bạc, thiếu ảnh pháp lý (Score 6/10), đang xếp dưới Tin B (VIP Bạc, Score 8/10) | Bổ sung 2 ảnh sổ đỏ hợp lệ + mô tả chi tiết | 1. Sửa tin A, bổ sung giấy tờ pháp lý + mô tả. 2. Nhấn "Cập nhật". 3. Reload danh sách tin cùng hạng. | Điểm chất lượng Tin A tăng 6→10; Điểm gốc/Điểm hiển thị tăng theo, đẩy Tin A lên trên Tin B. | - | - | - | - |

---

# MODULE 04 — LISTING / QUẢN LÝ TIN ĐĂNG (LIST)

## 4.1. Tạo tin đăng

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-LIST-CREATE-001 | [Happy Path] Tạo tin đăng "Mua bán" thành công đầy đủ thông tin | User đã đăng nhập, đã có SĐT hợp lệ | Loại hình: Mua bán; Tiêu đề: "Bán căn hộ 2PN Vinhomes"; Giá: 3.5 tỷ; Pháp lý: "Sổ hồng riêng"; Diện tích, địa chỉ, ảnh hợp lệ | 1. Chọn "Mua bán". 2. Nhập đầy đủ trường bắt buộc. 3. Upload 1–10 ảnh hợp lệ. 4. Nhập Họ tên/SĐT liên hệ hợp lệ. 5. Click "Đăng tin". | Hệ thống tính điểm chất lượng tin, lưu DB với trạng thái "Chờ duyệt"; hiển thị popup/toast thông báo thành công. | - | - | - | - |
| TC-LIST-CREATE-002 | [Happy Path] Tạo tin đăng "Cho thuê" thành công đầy đủ thông tin | User đã đăng nhập, đã có SĐT hợp lệ | Loại hình: Cho thuê; Giá thuê: 7 triệu/tháng; Tiền cọc: 14 triệu; Thời gian thuê, kỳ thanh toán hợp lệ | 1. Chọn "Cho thuê". 2. Nhập đầy đủ trường bắt buộc + Thời gian thuê/Kỳ thanh toán. 3. Upload ảnh hợp lệ. 4. Click "Đăng tin". | Tin lưu DB với trạng thái "Chờ duyệt"; trường Tiền cọc/Giá thuê ghi nhận chính xác. | - | - | - | - |
| TC-LIST-CREATE-003 | [UI Context Logic] Ẩn/hiện trường đặc thù khi chuyển đổi Mua bán ↔ Cho thuê | User đang ở form Tạo tin đăng | Chuyển đổi qua lại 2 radio | 1. Chọn "Cho thuê", quan sát form. 2. Chọn "Mua bán", quan sát form. | Cho thuê: hiện "Tiền cọc", nhãn đổi "Giá thuê". Mua bán: ẩn "Tiền cọc", hiện "Pháp lý", nhãn đổi "Giá bán". | - | - | - | - |
| TC-LIST-CREATE-004 | [Required Validation] Chặn tạo tin khi thiếu Tiêu đề / thiếu Loại nhà đất | User đang ở form Tạo tin đăng | Tiêu đề hoặc Loại nhà đất: để trống | 1. Điền các trường khác hợp lệ, bỏ trống 1 trong 2 trường trên. 2. Blur/submit. | Hiển thị lỗi bắt buộc tương ứng, không gọi API. | - | - | - | - |
| TC-LIST-CREATE-005 | [Boundary] Tự động cắt chuỗi khi paste Tiêu đề / Họ tên người liên hệ vượt giới hạn | User đang ở form Tạo tin đăng | Tiêu đề: paste 140 ký tự (giới hạn 120); Họ tên liên hệ: paste 65 ký tự (giới hạn 50) | 1. Paste chuỗi vượt giới hạn vào từng field tương ứng. | Tiêu đề: tự động cắt còn 120 ký tự. Họ tên liên hệ: tự động cắt còn 50 ký tự, loại bỏ khoảng trắng đầu/cuối. | - | - | - | - |
| TC-LIST-CREATE-006 | [Business Rule] Mô tả < 20 ký tự / Diện tích ≤ 0 / Giá ≤ 0 bị chặn | User đang ở form Tạo tin đăng | Mô tả: "Nhà đẹp" (<20 ký tự); Diện tích: "0"; Giá: "0" | 1. Nhập từng giá trị không hợp lệ vào field tương ứng. 2. Blur khỏi field. | Hiển thị đúng lỗi cho từng field: Mô tả chưa đạt tối thiểu 20 ký tự; "Diện tích không hợp lệ hoặc vượt giới hạn"; "Giá phải lớn hơn 0". | - | - | - | - |
| TC-LIST-CREATE-007 | [Business Logic] Input Giá bị disable và xóa giá trị khi chọn "Thương lượng" | User đang ở form Tạo tin đăng | Đã nhập số vào Giá, sau đó chọn "Thương lượng" | 1. Nhập số vào trường Giá. 2. Chọn "Thương lượng". | Input Giá chuyển disabled và giá trị vừa nhập bị xóa về rỗng. | - | - | - | - |
| TC-LIST-CREATE-008 | [Media Validation] Chặn upload ảnh BĐS vượt 10 ảnh / sai định dạng / vượt 30MB | User đang ở form Tạo tin đăng. File test sẵn sai định dạng/quá dung lượng. | 10 ảnh hợp lệ + thử ảnh thứ 11; 1 file sai định dạng; 1 file >30MB | 1. Upload đủ 10 ảnh, thử thêm ảnh 11. 2. Upload file sai định dạng. 3. Upload file >30MB. | Case 1: chặn không cho thêm. Case 2 & 3: hiển thị lỗi upload tương ứng, không thêm vào preview. | - | - | - | - |
| TC-LIST-CREATE-009 | [Media Validation] Chặn upload Giấy tờ pháp lý vượt 5 ảnh hoặc vượt 10MB | User đang ở form Tạo tin đăng | 6 ảnh hợp lệ; hoặc 1 ảnh 15MB | 1. Kéo/thả 6 ảnh vào mục Giấy tờ pháp lý. 2. Thử upload 1 ảnh 15MB. | Hệ thống chặn file thừa/vượt dung lượng ngay tại UI, hiển thị lỗi "Cho phép tối đa 5 ảnh, mỗi file ≤10MB". | - | - | - | - |
| TC-LIST-CREATE-010 | [Input Validation] Chặn ký tự đặc biệt/số âm/số thập phân ở Số phòng ngủ, Số phòng tắm | User đang ở form Tạo tin đăng | Nhập lần lượt: `-5`, `2.5`, `abc` | 1. Nhập từng giá trị vào ô Số phòng ngủ/tắm. 2. Blur khỏi field. | Hệ thống xóa ký tự không hợp lệ hoặc báo lỗi "Chỉ cho phép nhập số tự nhiên". | - | - | - | - |
| TC-LIST-CREATE-011 | [Format Validation] SĐT liên hệ sai định dạng bị từ chối | User đang ở form Tạo tin đăng | SĐT: "12345" (sai đầu số, thiếu số) | 1. Nhập SĐT sai định dạng. 2. Blur khỏi field. | Hiển thị lỗi định dạng số điện thoại không hợp lệ. | - | - | - | - |
| TC-LIST-CREATE-012 | [Business Rule] Chặn tạo tin khi tài khoản chưa cập nhật số điện thoại | Tài khoản (VD: mới tạo qua Google OAuth) chưa có SĐT trong hồ sơ | Dữ liệu đăng tin hợp lệ | 1. Truy cập "Đăng tin" hoặc cố submit bằng tài khoản chưa có SĐT. | Hệ thống chặn hành động đăng tin, yêu cầu bổ sung SĐT trước, dừng luồng. | - | - | - | - |
| TC-LIST-CREATE-013 ⚠ Khác biệt tài liệu | [Required Validation] Chặn đăng tin "Cho thuê" khi bỏ trống Tiền cọc | User đang ở form Tạo tin đăng, đã chọn "Cho thuê" | Tiền cọc: để trống, các trường khác hợp lệ | 1. Chọn "Cho thuê". 2. Điền đủ các trường khác, bỏ trống "Tiền cọc". 3. Click "Đăng tin". | Hệ thống chặn gọi API, hiển thị lỗi "Tiền cọc là trường bắt buộc đối với loại hình cho thuê". 

## 4.2. Xem danh sách & Chi tiết tin đăng

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-LIST-VIEW-001 | Xem danh sách tin đăng của tôi + tìm kiếm trong danh sách | User đã đăng nhập, có ≥1 tin đăng | Từ khóa khớp 1 tin của User A | 1. Truy cập "Danh sách tin đăng". 2. Nhập từ khóa tìm kiếm trong danh sách. | Hiển thị đúng danh sách tin của User A; kết quả tìm kiếm lọc đúng theo từ khóa. | - | - | - | - |
| TC-LIST-VIEW-002 | Hiển thị rỗng khi không có tin đăng / không có kết quả tìm kiếm | Tài khoản chưa có tin đăng; hoặc từ khóa không khớp | Tài khoản mới; từ khóa không tồn tại | 1. Truy cập danh sách khi chưa có tin. 2. Tìm kiếm với từ khóa không khớp. | Cả 2 trường hợp hiển thị empty state phù hợp. | - | - | - | - |
| TC-LIST-DETAIL-001 | Xem chi tiết tin đăng đã duyệt thành công | Tồn tại tin đăng "Đã duyệt" | Tin đăng đã duyệt | 1. Click vào tin đăng đã duyệt. | Hiển thị đầy đủ thông tin, hình ảnh/video, mô tả, liên hệ, tiện ích, tin liên quan; view count tăng. | - | - | - | - |
| TC-LIST-DETAIL-002 | Không tồn tại / chưa duyệt → không hiển thị nội dung | PostID không tồn tại; hoặc tin ở trạng thái "Chờ duyệt" | PostID invalid; tin chưa duyệt | 1. Truy cập chi tiết với PostID không tồn tại. 2. Truy cập trực tiếp chi tiết tin chưa duyệt. | Case 1: "Tin không tồn tại". Case 2: không hiển thị nội dung. | - | - | - | - |

## 4.3. Chỉnh sửa & Gỡ tin đăng

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-LIST-EDIT-001 | [State Transition] Chỉnh sửa tin thành công, tự động chuyển về "Chờ duyệt" | Tin đăng của User đang "Đang đăng" | Sửa nội dung mô tả | 1. Chọn "Sửa" trên tin đăng. 2. Thay đổi nội dung. 3. Nhấn "Cập nhật". | Dữ liệu mới lưu vào DB; trạng thái chuyển từ "Đang đăng" về "Chờ duyệt". | - | - | - | - |
| TC-LIST-EDIT-002 | [Permission Security] Chặn sửa tin đăng của người dùng khác | User B đã đăng nhập; PostID thuộc sở hữu User A | URL: `/listing/edit/{PostID_of_A}` | 1. Tại tài khoản User B, truy cập trực tiếp URL sửa tin của User A. | Hệ thống từ chối, hiển thị "Bạn không có quyền chỉnh sửa bài viết này" hoặc redirect về trang quản lý cá nhân. | - | - | - | - |
| TC-LIST-REMOVE-001 | [State Transition] Gỡ tin đăng thành công khi đang "Đang đăng" | Tin đăng của User đang "Đang đăng" | Tin đăng "Đang đăng" | 1. Nhấn "Gỡ tin". 2. Xác nhận tại popup. | Trạng thái chuyển "Đã gỡ"; tin biến mất khỏi trang công khai. | - | - | - | - |
| TC-LIST-REMOVE-002 | [Business Rule] Chặn gỡ tin khi trạng thái không phải "Đang đăng" | Tin đăng ở trạng thái "Chờ duyệt"/"Bị từ chối" | Tin đăng "Chờ duyệt" | 1. Cố gắng gỡ tin không ở trạng thái "Đang đăng" (qua UI hoặc API). | Hệ thống từ chối, giữ nguyên trạng thái ban đầu. | - | - | - | - |

## 4.4. Yêu thích, Xác thực, Báo cáo tin đăng

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-LIST-FAVORITE-001 | [Happy Path / CRUD] Thêm và bỏ tin đăng khỏi Yêu thích | User đã đăng nhập, tin chưa yêu thích | Tin đăng bất kỳ | 1. Click icon Trái tim → thêm yêu thích, kiểm tra tại trang "Tin đăng yêu thích". 2. Click lại icon Trái tim → bỏ yêu thích. | Bước 1: icon active, tin xuất hiện trong danh sách yêu thích. Bước 2: tin biến mất khỏi danh sách yêu thích. | - | - | - | - |
| TC-LIST-FAVORITE-002 | Chuyển hướng đăng nhập khi thêm yêu thích lúc chưa đăng nhập | Người dùng chưa đăng nhập | - | 1. Nhấn icon Trái tim khi chưa đăng nhập. | Chuyển tới màn hình đăng nhập. | - | - | - | - |
| TC-LIST-VERIFY-001 | Gửi hồ sơ xác thực tin đăng thành công | Chủ tin, tin thuộc nhu cầu Mua bán, chưa có hồ sơ "Chờ duyệt" | CCCD 2 mặt + giấy tờ pháp lý hợp lệ | 1. Upload CCCD mặt trước/sau, giấy tờ pháp lý. 2. Nhấn "Đăng lại tin". | Hồ sơ lưu, trạng thái xác thực → "Chờ duyệt". | - | - | - | - |
| TC-LIST-VERIFY-002 | Chặn gửi hồ sơ khi thiếu ảnh bắt buộc hoặc sai định dạng/dung lượng | Đang ở form xác thực | Thiếu 1 trong 3 ảnh bắt buộc; hoặc file sai định dạng/>30MB | 1. Bỏ qua 1 ảnh bắt buộc hoặc upload sai định dạng/quá dung lượng. 2. Nhấn "Đăng lại tin". | Hiển thị lỗi tương ứng, không lưu hồ sơ. | - | - | - | - |
| TC-LIST-REPORT-001 | [Happy Path] Gửi báo cáo vi phạm tin đăng thành công | User đã đăng nhập, đang xem tin của người khác | Lý do: "Giá không đúng thực tế, tin ảo" | 1. Nhấn "Báo cáo tin đăng". 2. Chọn lý do, nhập mô tả chi tiết. 3. Nhấn "Gửi phản ánh". | Báo cáo lưu vào DB thành công; popup tự đóng; hiển thị toast thành công; tin bị gắn cờ cảnh báo. | - | - | - | - |
| TC-LIST-REPORT-002 | Chặn gửi báo cáo khi bỏ trống lý do xác nhận | Đang ở popup xác nhận báo cáo | Lý do: "" | 1. Để trống ô lý do. 2. Nhấn xác nhận. | Hệ thống chặn gửi (nguồn: kết quả kiểm thử thực tế "chặn gửi chuỗi rỗng"). | - | - | - | - |

## 4.5. Bộ lọc & Tìm kiếm tin đăng (trang danh sách)

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-LIST-FILTER-001 | Lọc theo Người đăng (Chủ nhà/Môi giới) + khoảng giá tùy chỉnh | Danh sách có dữ liệu đa dạng | Người đăng: Chủ nhà/Môi giới; Giá Từ<Đến | 1. Chọn Người đăng. 2. Nhập khoảng giá hợp lệ. 3. Áp dụng bộ lọc. | Danh sách lọc đúng theo cả 2 điều kiện. | - | - | - | - |
| TC-LIST-FILTER-002 | Lọc thất bại khi khoảng giá/diện tích không hợp lệ (Từ > Đến) | Danh sách có dữ liệu | Giá/Diện tích Từ > Đến | 1. Nhập Từ > Đến cho giá hoặc diện tích. 2. Áp dụng. | Hiển thị lỗi khoảng giá trị không hợp lệ tương ứng. | - | - | - | - |
| TC-LIST-FILTER-003 | Đặt lại bộ lọc về mặc định | Đã áp dụng ≥1 điều kiện lọc | - | 1. Nhấn "Đặt lại bộ lọc". | Toàn bộ điều kiện về mặc định, danh sách trở về ban đầu. | - | - | - | - |
| TC-LIST-SEARCH-001 | Tìm kiếm tin đăng theo từ khóa (có kết quả / không có kết quả) | Hệ thống có dữ liệu tin đăng | Từ khóa khớp dữ liệu; từ khóa không khớp | 1. Tìm với từ khóa khớp → kiểm tra kết quả. 2. Tìm với từ khóa không khớp → kiểm tra empty state. | Case 1: trả kết quả đúng, loại tin không đủ điều kiện, sắp xếp mặc định. Case 2: thông báo không tìm thấy. | - | - | - | - |

---

# MODULE 05 — APPOINTMENT / QUẢN LÝ LỊCH HẸN (APT)

*Nhiều case dưới đây yêu cầu **2 Browser Context** (Khách = Context A, Chủ nhà = Context B) để kiểm tra đồng bộ trạng thái 2 chiều.*

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-APT-CREATE-001 | [State Transition] Đặt lịch hẹn thành công, khởi tạo trạng thái "Chờ xác nhận" | Khách đã đăng nhập (Context A); căn hộ "Đang đăng"; không phải chủ căn hộ; chưa có lịch hẹn chưa hoàn thành tại căn hộ này | Ngày/Khung giờ hợp lệ (> giờ hiện tại 2h); Họ tên/SĐT hợp lệ | 1. Chọn ngày trên Carousel. 2. Chọn khung giờ từ dropdown. 3. Nhập/chỉnh sửa thông tin liên hệ. 4. Nhấn "Đặt lịch hẹn". | Bản ghi lịch hẹn tạo thành công, trạng thái mặc định "Chờ xác nhận"; gửi thông báo cho các bên. | - | - | - | - |
| TC-APT-CREATE-002 | Chặn đặt lịch cho căn hộ của chính mình / khi đã có lịch chưa hoàn thành | Người dùng là chủ căn hộ đang thao tác; hoặc đã có lịch hẹn chưa hoàn thành tại cùng căn hộ | Căn hộ của chính mình; căn hộ đã có lịch trước đó | 1. Thử đặt lịch cho căn hộ của chính mình. 2. Thử đặt thêm lịch cho căn hộ đã có lịch chưa hoàn thành. | Case 1: "Bạn không thể đặt lịch căn hộ của chính mình". Case 2: "Bạn đã có lịch hẹn với căn hộ này. Vui lòng xem lại." | - | - | - | - |
| TC-APT-CREATE-003 | Khung giờ hiển thị chỉ cách giờ hiện tại tối thiểu 2 tiếng; SĐT sai định dạng bị chặn | Đang mở popup đặt lịch | Dropdown khung giờ; SĐT sai định dạng | 1. Mở dropdown Khung giờ, kiểm tra danh sách. 2. Nhập SĐT sai định dạng, submit. | Case 1: chỉ hiện khung giờ ≥ hiện tại + 2h. Case 2: lỗi định dạng SĐT. | - | - | - | - |
| TC-APT-CONFIRM-001 | [State Transition / Multi-Context] Chủ nhà xác nhận lịch hẹn thành công | Context A (Khách) + Context B (Chủ nhà) đồng thời; lịch hẹn "Chờ xác nhận" | Bản ghi lịch hẹn có sẵn | 1. (Context B) Vào danh sách lịch hẹn, click "Xác nhận lịch hẹn". 2. (Context A) Reload/quan sát. | Trạng thái chuyển "Đã xác nhận" ngay lập tức; đồng bộ trên cả 2 giao diện. | - | - | - | - |
| TC-APT-REJECT-001 | [State Transition / Business Rule] Từ chối lịch hẹn — bắt buộc nhập lý do | Lịch hẹn "Chờ xác nhận"; Chủ nhà ở trang quản lý lịch hẹn (Context B) | Lý do: "Khung giờ này tôi có lịch bàn giao căn hộ khác" | 1. Click "Từ chối lịch hẹn". 2. Để trống lý do, nhấn "Gửi" → quan sát lỗi. 3. Nhập lý do hợp lệ, nhấn "Gửi". | Bước 2: chặn, báo lỗi bắt buộc nhập lý do. Bước 3: trạng thái → "Bị từ chối", Khách xem được lý do. | - | - | - | - |
| TC-APT-CANCEL-001 | [State Transition] Khách/Chủ nhà hủy lịch hẹn "Đã xác nhận" thành công | Lịch hẹn giữa Khách A và Chủ nhà B đang "Đã xác nhận"; còn ≥2h trước giờ hẹn | Lý do hủy hợp lệ | 1. (Context A) Vào "Lịch hẹn của tôi", nhấn "Hủy lịch", xác nhận. 2. (Context B) Vào "Quản lý lịch hẹn", nhấn "Hủy lịch", xác nhận (test riêng biệt cho từng bên). | Trạng thái chuyển "Khách hủy" (nếu Khách thao tác) hoặc "Chủ nhà hủy" (nếu Chủ nhà thao tác); bên còn lại nhận thông báo. | - | - | - | - |
| TC-APT-CANCEL-002 | Chặn hủy khi dưới 2 tiếng trước giờ hẹn / khi bỏ trống lý do | Lịch hẹn "Đã xác nhận", còn <2h trước giờ hẹn; hoặc đủ điều kiện hủy nhưng bỏ trống lý do | Lịch cận giờ; lý do hủy: "" | 1. Nhấn "Hủy lịch" khi còn <2h → quan sát. 2. Ở điều kiện đủ hủy, để trống lý do, xác nhận → quan sát. | Case 1: chặn, giữ nguyên "Đã xác nhận", lỗi "chỉ được hủy trước giờ hẹn tối thiểu 2 giờ". Case 2: chặn lưu, cảnh báo "Vui lòng cung cấp lý do hủy lịch". | - | - | - | - |
| TC-APT-CANCEL-003 | [Business Rule] Chặn thao tác Hủy khi lịch hẹn đã ở trạng thái đóng (Bị từ chối/Đã gỡ) | Bản ghi lịch hẹn đang "Bị từ chối" hoặc đã bị 1 bên hủy trước đó | Thao tác API/UI can thiệp | 1. Cố gắng kích hoạt Hủy (UI hoặc API request) trên bản ghi đã đóng. | Hệ thống từ chối thực thi, báo lỗi "Trạng thái lịch hẹn không hợp lệ để thực hiện thao tác", giữ nguyên trạng thái. | - | - | - | - |

---

# MODULE 06 — LỊCH SỬ GIAO DỊCH (TRANS)

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-TRANS-VIEW-001 | Xem danh sách lịch sử giao dịch thành công | User đã đăng nhập, có giao dịch | User A có giao dịch | 1. Nhấn "Lịch sử giao dịch" tại menu tài khoản. | Hiển thị khối tổng quan (Thành công/Chờ thanh toán/Tổng chi) + bảng giao dịch, mặc định sắp xếp thời gian giảm dần. | - | - | - | - |
| TC-TRANS-FILTER-001 | [Happy Path / Filter] Tra cứu và lọc lịch sử giao dịch cá nhân | Đã có giao dịch thành công và thất bại | Trạng thái: "Thành công"; Loại gói: "Ruby" | 1. Nhập mã giao dịch/áp dụng lọc trạng thái "Thành công". 2. Chọn loại gói "Ruby", tìm kiếm. | Kết quả lọc real-time đúng điều kiện; số tiền hiển thị khớp với cấu hình gói. | - | - | - | - |

---

# MODULE 07 — NÂNG CẤP GÓI TIN & THANH TOÁN (PACKAGE)

*Pre-conditions chung: cần **Payment Sandbox (VNPAY)** đã tích hợp theo xác nhận thực tế của QA (thẻ test: `9704198888888888888`, chủ thẻ `NGUYEN VAN A`, OTP `123456`).*

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-PKG-UPGRADE-001 | [Happy Path / E2E] Nâng cấp gói tin thành công qua VNPAY Sandbox | User đã đăng nhập, sở hữu tin đăng dạng thường (hoặc "Đang duyệt" theo UC-13) | Gói: "Ruby"/VIP tương ứng; Thẻ test VNPAY | 1. Tại quản lý tin, chọn "Nâng cấp gói tin". 2. Chọn gói, click "Thanh toán". 3. Điền thông tin thẻ test, OTP test tại VNPAY Sandbox, xác nhận. 4. Chờ redirect về Propify. | Hiển thị "Thanh toán thành công"; loại tin cập nhật lên VIP tương ứng; ghi nhận giao dịch mới vào DB. | - | - | - | - |
| TC-PKG-UPGRADE-002 | [State Transition] Nâng cấp lên hạng VIP cao hơn tính lại Cấp ưu tiên & Hệ số nhân ngay lập tức | User sở hữu tin đang chạy gói VIP Bạc (Cấp 2, hệ số x2.0) | Gói nâng cấp: VIP Vàng (Cấp 3, hệ số x3.0) | 1. Chọn nâng cấp VIP Bạc → VIP Vàng. 2. Hoàn tất thanh toán sandbox. 3. Kiểm tra thông tin gói trên UI/DB. | Cấp ưu tiên 2→3; hệ số nhân x2.0→x3.0; Điểm hiển thị được recalculate ngay. | - | - | - | - |
| TC-PKG-UPGRADE-003 | [Business Rule] Chặn hạ cấp gói VIP khi gói hiện tại còn hiệu lực | User sở hữu tin đang chạy gói VIP Kim Cương (Cấp 4) | Thử chọn gói: VIP Bạc (Cấp 2) | 1. Mở popup nâng cấp gói tại tin VIP Kim Cương. 2. Quan sát danh sách gói khả dụng. | Các gói có Cấp ưu tiên thấp hơn hiện tại bị disable/ẩn, không cho chọn hạ cấp. | - | - | - | - |
| TC-PKG-UPGRADE-004 | Hủy nâng cấp / Đổi gói-thời hạn tại màn hình xác nhận | Đã chọn gói và thời hạn, ở màn xác nhận | Đổi gói khác; đổi thời hạn khác | 1. Nhấn Hủy tại màn xác nhận → không thực hiện thanh toán. 2. Đổi gói/thời hạn khác → số tiền cập nhật lại tương ứng. | Case 1: đóng màn hình, không thanh toán. Case 2: số tiền/quyền lợi cập nhật đúng theo lựa chọn mới. | - | - | - | - |
| TC-PKG-UPGRADE-005 | Hiển thị lỗi khi thanh toán thất bại / bị hủy tại cổng thanh toán | Đang ở bước xác nhận VNPAY Sandbox | Kết quả sandbox: Failed hoặc User Cancel | 1. Thực hiện thanh toán với kết quả giả lập thất bại. 2. Thực hiện hủy tại cổng thanh toán. | Case 1: thông báo giao dịch thất bại. Case 2: thông báo hủy thanh toán. | - | - | - | - |

---

# MODULE 08 — CHAT (NHẮN TIN TRỰC TUYẾN)

*Pre-conditions chung: **2 Browser Context + WebSocket**.*

| Test Case ID | Test Case Title/Name | Pre-conditions | Test Data | Test Steps | Expected Result | Browser_version_1 | KQ thực tế | Ngày | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| TC-CHAT-CREATE-001 | Khởi tạo phòng chat mới, gửi & nhận tin nhắn realtime 2 chiều | Khách thuê đã đăng nhập; tin đăng "Đang đăng"; chưa có lịch sử chat trước đó | Nội dung tin nhắn hợp lệ | 1. (Context A - Khách) Nhấn "Nhắn tin" tại chi tiết tin đăng. 2. Hệ thống tạo Room_ID, vào cửa sổ Chat. 3. Gửi tin nhắn. 4. (Context B - Chủ tin) Quan sát nhận tin realtime, phản hồi lại. | Tin nhắn hiển thị tức thời ở cả 2 phía qua Socket; Chủ tin nhận Push Notification. | - | - | - | - |
| TC-CHAT-CREATE-002 | Chuyển hướng đăng nhập khi nhắn tin lúc chưa đăng nhập | Người dùng chưa đăng nhập | - | 1. Nhấn "Nhắn tin" khi chưa đăng nhập. | Chặn vào phòng chat, chuyển hướng đến màn hình Đăng nhập. | - | - | - | - |

**Ghi chú kỹ thuật triển khai Playwright:** giữ nguyên như bản trước — Page Object Model theo từng màn hình, Fixtures seed data qua API, Mailosaur/Gmail API cho OTP, 2 `browserContext` cho các luồng 2 người dùng tương tác (Đặt lịch–Xác nhận, Chat, Ranking multi-post), ưu tiên Web-first Assertions.
