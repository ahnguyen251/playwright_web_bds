import { expect, test } from '@playwright/test';

import { RegisterPage } from '../../../pages/authentication/RegisterPage';

test('exposes only visible registration validation and submit readiness without submitting', async ({
  page,
}) => {
  await page.setContent(`
    <div class="fixed inset-0">
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
        <button disabled>Tạo tài khoản</button>
      </section>
    </div>
    <script type="text/javascript">
      const modal = document.querySelector('.fixed');
      const registrationView = modal.querySelector('section');
      const buttons = Array.from(modal.querySelectorAll(':scope > button'));
      buttons.find((button) => button.textContent === 'Đăng ký ngay').onclick = () => {
        registrationView.hidden = false;
      };
      const [fullName, email, password, confirmation] = registrationView.querySelectorAll('input');
      const [emailMessage, passwordMessage, confirmationMessage] = registrationView.querySelectorAll('p');
      const submitButton = registrationView.querySelector('button');
      const updateState = () => {
        const emailValid = /\\S+@\\S+\\.\\S+/.test(email.value);
        const passwordValid = password.value.length >= 8;
        const confirmationMatches = password.value === confirmation.value;
        emailMessage.hidden = emailValid;
        passwordMessage.hidden = passwordValid;
        confirmationMessage.hidden = confirmationMatches;
        submitButton.disabled = !fullName.value.trim() || !emailValid || !passwordValid || !confirmationMatches;
      };
      registrationView.querySelectorAll('input').forEach((input) => {
        input.oninput = updateState;
        input.onblur = updateState;
      });
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.open();
  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'tester@example.test',
    password: 'Abcdef1',
    passwordConfirmation: 'different',
  });
  await registerPage.blurAllFields();

  expect(await registerPage.visibleValidationMessages()).toEqual([
    'Mật khẩu phải có ít nhất 8 ký tự',
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await registerPage.isSubmitEnabled()).toBe(false);

  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'tester@example.test',
    password: 'Abcdef12',
    passwordConfirmation: 'different',
  });

  expect(await registerPage.visibleValidationMessages()).toEqual([
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await registerPage.validationMessages()).toEqual([
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await registerPage.isSubmitEnabled()).toBe(false);

  await registerPage.fillRegistration({
    fullName: 'Nguyễn Kiểm Thử',
    email: 'tester@example.test',
    password: 'Abcdef12',
    passwordConfirmation: 'Abcdef12',
  });

  expect(await registerPage.visibleValidationMessages()).toEqual([]);
  expect(await registerPage.isSubmitEnabled()).toBe(true);
  expect(await page.evaluate(() => document.body.dataset.submitted)).toBeUndefined();
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
