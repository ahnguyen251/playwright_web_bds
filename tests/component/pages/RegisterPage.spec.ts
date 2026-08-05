import { expect, test } from '@playwright/test';

import { RegisterPage } from '../../../pages/authentication/RegisterPage';

test('fills deployed registration fields and exposes validation feedback without a phone operation', async ({
  page,
}) => {
  await page.setContent(`
    <section role="dialog">
      <button>Đóng</button>
      <button>Đăng nhập với Google</button>
      <button>Đăng ký ngay</button>
      <button>Đăng nhập</button>
      <section hidden>
        <h1>Tạo tài khoản</h1>
        <input placeholder="Họ và tên" />
        <input placeholder="Email của bạn" />
        <input placeholder="Mật khẩu" type="password" />
        <input placeholder="Nhập lại mật khẩu" type="password" />
        <p hidden>Vui lòng nhập email hợp lệ</p>
        <p hidden>Mật khẩu phải có ít nhất 8 ký tự</p>
        <p hidden>Mật khẩu xác nhận không khớp</p>
        <button>Tạo tài khoản</button>
      </section>
    </section>
    <script type="text/javascript">
      const dialog = document.querySelector('[role="dialog"]');
      const registrationView = dialog.querySelector('section');
      dialog.querySelector('button:nth-of-type(3)').onclick = () => {
        registrationView.hidden = false;
      };
      registrationView.querySelectorAll('input').forEach((input) => {
        input.onblur = () => {
          registrationView.querySelectorAll('p').forEach((message) => {
            message.hidden = false;
          });
        };
      });
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.open();
  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'bad',
    password: 'abc',
    passwordConfirmation: 'xyz',
  });
  await registerPage.blurAllFields();

  expect(await registerPage.validationMessages()).toEqual([
    'Vui lòng nhập email hợp lệ',
    'Mật khẩu phải có ít nhất 8 ký tự',
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(registerPage).not.toHaveProperty('fillPhone');
});

test('enters six OTP digits and submits the verification', async ({ page }) => {
  await page.setContent(`
    <section>
      <h1>Xác thực email</h1>
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <p role="alert">Mã OTP không hợp lệ</p>
      <p>Mã OTP đã hết hạn</p>
      <button>Xác nhận OTP</button>
      <button>Gửi lại</button>
    </section>
    <script type="text/javascript">
      document.querySelector('button').onclick = () => {
        document.body.dataset.verified = 'true';
      };
      document.querySelector('button:last-of-type').onclick = () => {
        document.body.dataset.resent = 'true';
      };
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.enterOtp('123456');
  await registerPage.submitOtp();
  await registerPage.resendOtp();

  expect(await page.evaluate(() => document.body.dataset.verified)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.resent)).toBe('true');
});
