# Authentication Use-Case Baseline

Tài liệu này là baseline yêu cầu có kiểm soát và có thể audit trực tiếp từ một bản clone của
repository. Nội dung chỉ trích xuất phạm vi Authentication/Profile UC-01 đến UC-07 từ tài liệu
nghiệp vụ do người dùng cung cấp; không sao chép PDF binary hoặc các use case ngoài phạm vi module.

## Provenance và kiểm soát thay đổi

- Tên file nguồn bên ngoài repository: `NghiepvuPropify.pdf`
- SHA-256 nguồn:
  `daaf7b1d3f0d5ee9f9db640f06a0bb25322a16b298350ca63b7063e15c8d07e8`
- Phần nguồn: 2.5.1 đến 2.5.3.4
- Ngày tạo baseline: 2026-08-05
- Phương pháp: trích xuất text và đối chiếu trực quan các trang chứa UC-01 đến UC-07; giữ nguyên UC
  ID, tên trong nguồn, actor, precondition/postcondition và phạm vi main/alternative flow.
- Bối cảnh phê duyệt: baseline này cố định phần yêu cầu nguồn phục vụ thiết kế Authentication đã được
  phê duyệt tại `docs/superpowers/specs/2026-08-05-authentication-module-design.md`. Mọi thay đổi ngữ
  nghĩa phải được đối chiếu lại với PDF có đúng SHA-256 ở trên và qua review riêng.

PDF gốc nằm ngoài repository nên không được coi là một đường dẫn có thể mở từ clone. Hash cho phép
đối chiếu đúng tài liệu khi bên đánh giá được cấp nguồn gốc qua kênh quản lý tài liệu phù hợp; file
Markdown này là nguồn baseline ổn định được dùng bởi traceability trong repository.

## UC-01 - Đăng ký tài khoản

- Tham chiếu nguồn: mục 2.5.1.
- Tên trong nguồn: `Đăng ký tài khoản`.
- Actor: Người dùng chưa đăng nhập.
- Kết quả: tài khoản được tạo; trạng thái chuyển từ `PENDING` sang `ACTIVE` sau khi xác thực thành
  công; JWT token được cấp.
- Main flow: mở form đăng ký; nhập họ tên, email và mật khẩu; submit; hệ thống validate và kiểm tra
  email tồn tại; tạo tài khoản pending; sinh/gửi OTP; người dùng nhập OTP; hệ thống kiểm tra OTP,
  kích hoạt tài khoản và trả kết quả đăng nhập thành công.
- Alternative/exception scope: dữ liệu không hợp lệ, email đã tồn tại, OTP sai, OTP hết hạn/resend,
  lỗi gửi email, timeout, database hoặc server.

## UC-02 - Đăng nhập tài khoản

- Tham chiếu nguồn: mục 2.5.2.
- Tên trong nguồn: `Đăng nhập tài khoản`.
- Actor: Người dùng chưa đăng nhập.
- Kết quả: đăng nhập thành công, token/session được tạo và người dùng được chuyển về trang chủ.
- Main flow: mở màn hình đăng nhập; nhập email/SĐT và mật khẩu; submit; hệ thống validate, kiểm tra tài
  khoản/mật khẩu, tạo JWT, lưu session và redirect.
- Alternative scope: sai thông tin hoặc tài khoản bị khóa phải hiển thị lỗi và không đăng nhập.

## UC-03 - Đăng nhập bằng Google

- Tham chiếu nguồn: mục 2.5.2, ngay sau UC-02.
- Tên trong nguồn: `Đăng nhập bằng Google`.
- Actor: Người dùng có tài khoản Google.
- Kết quả: đăng nhập thành công; tạo tài khoản nếu chưa tồn tại.
- Main flow yêu cầu sản phẩm: người dùng chọn `Đăng nhập với Google`; hệ thống redirect sang Google;
  người dùng chọn tài khoản; Google xác thực và trả access token; hệ thống kiểm tra/tạo user, tạo JWT
  và redirect về trang chủ.
- Alternative/exception scope: người dùng hủy, token không hợp lệ, lỗi OAuth/server hoặc mất mạng.

### Giới hạn automation của UC-03

Yêu cầu sản phẩm vẫn bao gồm redirect và bước người dùng chọn tài khoản Google. Phạm vi automation
đã phê duyệt chỉ kiểm tra bề mặt nút Google qua `AuthenticationModalComponent`; không tự động hóa
Google consent, CAPTCHA hoặc account selection. Đây là giới hạn automation, không phải thay đổi yêu
cầu sản phẩm.

## UC-04 - Xem thông tin tài khoản

- Tham chiếu nguồn: mục 2.5.3.1.
- Tên trong nguồn: `Xem thông tin tài khoản`.
- Actor/precondition: người dùng đã đăng nhập và có token hợp lệ.
- Kết quả: thông tin tài khoản cá nhân được hiển thị.
- Main flow: chọn thông tin tài khoản; hệ thống kiểm tra token, lấy dữ liệu user và hiển thị; người
  dùng xem thông tin.
- Alternative/exception scope: token không hợp lệ redirect về login; không có dữ liệu hiển thị empty;
  lỗi server, mất mạng hoặc timeout được báo phù hợp.

## UC-05 - Chỉnh sửa thông tin cá nhận

- Tham chiếu nguồn: mục 2.5.3.2.
- Tên chính xác trong nguồn: `Chỉnh sửa thông tin cá nhận`.
- Nhãn chuẩn hóa dùng trong framework: `Chỉnh sửa thông tin cá nhân` (sửa lỗi chính tả “cá nhận” của
  nguồn, không đổi ý nghĩa).
- Actor/precondition: người dùng đã đăng nhập và có token hợp lệ.
- Kết quả: thông tin cá nhân được cập nhật thành công.
- Main flow: tải dữ liệu hiện tại; hiển thị form; người dùng chỉnh sửa, có thể upload avatar và nhấn
  lưu; hệ thống validate, upload avatar nếu có, gửi update, lưu database và báo thành công.
- Alternative/exception scope: lỗi từng field; không có thay đổi thì không gọi API; upload/server/mạng
  lỗi phải được xử lý hoặc báo phù hợp.

## UC-06 - Đối mật khẩu

- Tham chiếu nguồn: mục 2.5.3.3.
- Tên chính xác trong nguồn: `Đối mật khẩu`.
- Nhãn chuẩn hóa dùng trong framework: `Đổi mật khẩu` (sửa lỗi chính tả “Đối” của nguồn, không đổi ý
  nghĩa).
- Actor/precondition: người dùng đã đăng nhập.
- Kết quả: mật khẩu được cập nhật.
- Main flow: mở màn hình đổi mật khẩu; nhập mật khẩu hiện tại, mật khẩu mới và confirmation; submit;
  hệ thống validate, kiểm tra mật khẩu hiện tại, hash/update mật khẩu, invalidate token và redirect về
  login.
- Alternative/exception scope: sai mật khẩu hiện tại, mật khẩu mới không hợp lệ, confirmation không
  khớp, lỗi server/mạng hoặc timeout.

## UC-07 - Quên mật khẩu

- Tham chiếu nguồn: mục 2.5.3.4.
- Tên trong nguồn: `Quên mật khẩu`.
- Actor/precondition: người dùng chưa đăng nhập và có email hợp lệ.
- Kết quả: mật khẩu được cập nhật và người dùng có thể đăng nhập lại.
- Main flow: mở Forgot Password; nhập email và gửi OTP; hệ thống kiểm tra email, sinh/gửi OTP và hiển
  thị form OTP; người dùng xác nhận OTP; hệ thống hiển thị form mật khẩu mới; người dùng nhập/confirm
  mật khẩu; hệ thống validate, hash/update, báo thành công và redirect về login.
- Alternative/exception scope: email không tồn tại, OTP sai/hết hạn, mật khẩu không hợp lệ, lỗi gửi
  email, server hoặc mạng.

## Quan hệ với automation scope

- UC-01, UC-05, UC-06 và UC-07 có nhánh thay đổi dữ liệu; real E2E chỉ chạy với cả hai execution flag,
  tài khoản/mailbox chuyên dụng và cơ chế phục hồi baseline.
- UC-02 và UC-04 có coverage non-mutating/read-only.
- UC-03 hiện surface-only; Google account-selection automation nằm ngoài phạm vi.
- Chi tiết mapping Page Object, Workflow và test ID nằm tại
  `docs/traceability/requirements-to-tests.md`.
