import { expect, test } from '@playwright/test';

import { ForgotPasswordPage } from '../../../pages/authentication/ForgotPasswordPage';

test('requests a password reset from the email stage', async ({ page }) => {
  await page.setContent(`
    <section data-stage="email">
      <h1>Quên mật khẩu?</h1>
      <p>Nhập email để nhận mã OTP đặt lại mật khẩu</p>
      <input placeholder="Email của bạn" />
      <button>Gửi mã OTP</button>
      <button>← Quay lại đăng nhập</button>
    </section>
    <script type="text/javascript">
      document.querySelector('button').onclick = () => {
        document.body.dataset.requested = 'true';
      };
    </script>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  expect(await forgotPasswordPage.currentStage()).toBe('email');
  await forgotPasswordPage.requestReset('automation@gmail.com');

  expect(await page.evaluate(() => document.body.dataset.requested)).toBe('true');
});

test('exposes email interaction and deployed request readiness without requesting a reset', async ({
  page,
}) => {
  await page.setContent(`
    <section data-stage="email">
      <h1>Quên mật khẩu?</h1>
      <p>Nhập email để nhận mã OTP đặt lại mật khẩu</p>
      <input placeholder="Email của bạn" />
      <button>Gửi mã OTP</button>
    </section>
    <script type="text/javascript">
      const email = document.querySelector('input');
      email.onblur = () => { document.body.dataset.emailBlurred = email.value; };
      document.querySelector('button').onclick = () => {
        document.body.dataset.requested = 'true';
      };
    </script>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  await forgotPasswordPage.fillEmail('bad');
  await forgotPasswordPage.blurEmail();

  expect(await forgotPasswordPage.isRequestEnabled()).toBe(true);
  expect(await page.evaluate(() => document.body.dataset.emailBlurred)).toBe('bad');
  expect(await page.evaluate(() => document.body.dataset.requested)).toBeUndefined();
});

test('returns to login from the email stage', async ({ page }) => {
  await page.setContent(`
    <section>
      <h1>Quên mật khẩu?</h1>
      <p>Nhập email để nhận mã OTP đặt lại mật khẩu</p>
      <input placeholder="Email của bạn" />
      <button>Gửi mã OTP</button>
      <button>← Quay lại đăng nhập</button>
    </section>
    <script type="text/javascript">
      document.querySelector('button:last-of-type').onclick = () => {
        document.body.dataset.returnedToLogin = 'true';
      };
    </script>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  await forgotPasswordPage.backToLogin();

  expect(await page.evaluate(() => document.body.dataset.returnedToLogin)).toBe('true');
});

test('requires exactly six OTP cells', async ({ page }) => {
  await page.setContent(`
    <section>
      <h1>Xác nhận OTP</h1>
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <button>Xác nhận OTP</button>
    </section>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  await expect(forgotPasswordPage.submitOtp()).rejects.toThrow('Expected six OTP inputs, found 5.');
});

test('does not submit an incomplete OTP', async ({ page }) => {
  await page.setContent(`
    <section data-stage="otp">
      <h1>Xác nhận OTP</h1>
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <button>Xác nhận OTP</button>
    </section>
    <section data-stage="new-password" hidden>
      <input placeholder="Mật khẩu mới" type="password" />
      <input placeholder="Nhập lại mật khẩu" type="password" />
      <button>Đặt mật khẩu mới</button>
    </section>
    <script type="text/javascript">
      const otpView = document.querySelector('[data-stage="otp"]');
      const newPasswordView = document.querySelector('[data-stage="new-password"]');
      otpView.querySelector('button').onclick = () => {
        const isComplete = Array.from(otpView.querySelectorAll('input')).every(
          (input) => input.value.length === 1,
        );
        if (!isComplete) {
          document.body.dataset.rejectedOtp = 'true';
          return;
        }
        otpView.hidden = true;
        newPasswordView.hidden = false;
      };
    </script>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  await expect(forgotPasswordPage.enterOtp('123')).rejects.toThrow('Expected a six-digit OTP.');
  await expect(forgotPasswordPage.submitOtp()).rejects.toThrow('Cannot submit an incomplete OTP.');

  expect(await forgotPasswordPage.currentStage()).toBe('otp');
  expect(await page.evaluate(() => document.body.dataset.rejectedOtp)).toBeUndefined();
});

test('completes OTP verification and submits a new password', async ({ page }) => {
  await page.setContent(`
    <section data-stage="otp">
      <h1>Xác nhận OTP</h1>
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <input type="text" inputmode="numeric" maxlength="1" />
      <button>Xác nhận OTP</button>
      <button>Gửi lại</button>
    </section>
    <section data-stage="new-password" hidden>
      <h1>Tạo mật khẩu mới</h1>
      <input placeholder="Mật khẩu mới" type="password" />
      <input placeholder="Nhập lại mật khẩu" type="password" />
      <button>Đặt mật khẩu mới</button>
    </section>
    <section data-stage="login" hidden>
      <h1>Thành công!</h1>
      <button>← Quay lại đăng nhập</button>
    </section>
    <script type="text/javascript">
      const otpView = document.querySelector('[data-stage="otp"]');
      const newPasswordView = document.querySelector('[data-stage="new-password"]');
      const loginView = document.querySelector('[data-stage="login"]');
      otpView.querySelector('button').onclick = () => {
        const isComplete = Array.from(otpView.querySelectorAll('input')).every(
          (input) => input.value.length === 1,
        );
        if (!isComplete) {
          document.body.dataset.rejectedOtp = 'true';
          return;
        }
        document.body.dataset.enteredOtp = Array.from(otpView.querySelectorAll('input'))
          .map((input) => input.value)
          .join('');
        document.body.dataset.verified = 'true';
        otpView.hidden = true;
        newPasswordView.hidden = false;
      };
      otpView.querySelector('button:last-of-type').onclick = () => {
        document.body.dataset.resent = 'true';
      };
      newPasswordView.querySelector('button').onclick = () => {
        document.body.dataset.passwordReset = 'true';
        newPasswordView.hidden = true;
        loginView.hidden = false;
      };
      loginView.querySelector('button').onclick = () => {
        document.body.dataset.returnedToLogin = 'true';
      };
    </script>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  expect(await forgotPasswordPage.currentStage()).toBe('otp');
  await forgotPasswordPage.enterOtp('1234567');
  await forgotPasswordPage.resendOtp();
  await forgotPasswordPage.submitOtp();

  expect(await page.evaluate(() => document.body.dataset.enteredOtp)).toBe('123456');
  expect(await page.evaluate(() => document.body.dataset.resent)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.verified)).toBe('true');
  expect(await forgotPasswordPage.currentStage()).toBe('newPassword');

  await forgotPasswordPage.fillNewPassword({
    newPassword: 'new-password',
    passwordConfirmation: 'new-password',
  });
  await forgotPasswordPage.submitNewPassword();

  expect(await page.evaluate(() => document.body.dataset.passwordReset)).toBe('true');
  expect(await forgotPasswordPage.currentStage()).toBe('login');
  expect(await forgotPasswordPage.visibleMessage()).toBe('Thành công!');
  await forgotPasswordPage.backToLogin();
  expect(await page.evaluate(() => document.body.dataset.returnedToLogin)).toBe('true');
});

test('returns exact email-stage feedback without leaking an unrelated alert', async ({ page }) => {
  await page.setContent(`
    <p role="alert">Unrelated page alert</p>
    <section>
      <h1>Quên mật khẩu?</h1>
      <input placeholder="Email của bạn" />
      <p role="alert">Không tìm thấy tài khoản với email này</p>
      <button>Gửi mã OTP</button>
    </section>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  expect(await forgotPasswordPage.visibleMessage()).toBe('Không tìm thấy tài khoản với email này');
});

test('returns deployed email-stage feedback without requiring an alert role', async ({ page }) => {
  await page.setContent(`
    <p class="text-red-500 text-xs mb-3 flex items-center gap-1">Unrelated page feedback</p>
    <section>
      <h1>Quên mật khẩu?</h1>
      <input placeholder="Email của bạn" />
      <p class="text-red-500 text-xs mb-3 flex items-center gap-1">
        Email này chưa được đăng ký.
      </p>
      <button>Gửi mã OTP</button>
    </section>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  expect(await forgotPasswordPage.visibleMessage()).toBe('Email này chưa được đăng ký.');
});

test('preserves labelled OTP input state while waiting for resend to become enabled', async ({ page }) => {
  await page.setContent(`
    <section data-stage="otp">
      <h1>Xác nhận OTP</h1>
      <input aria-label="Mã OTP 1" type="text" inputmode="numeric" maxlength="1" />
      <input aria-label="Mã OTP 2" type="text" inputmode="numeric" maxlength="1" />
      <input aria-label="Mã OTP 3" type="text" inputmode="numeric" maxlength="1" />
      <input aria-label="Mã OTP 4" type="text" inputmode="numeric" maxlength="1" />
      <input aria-label="Mã OTP 5" type="text" inputmode="numeric" maxlength="1" />
      <input aria-label="Mã OTP 6" type="text" inputmode="numeric" maxlength="1" />
      <button>Xác nhận OTP</button>
      <button id="resend" disabled>Gửi lại</button>
    </section>
    <script>
      queueMicrotask(() => {
        document.querySelector('#resend').disabled = false;
      });
    </script>
  `);
  const forgotPasswordPage = new ForgotPasswordPage(page);

  await forgotPasswordPage.enterOtp('123456');
  await forgotPasswordPage.waitForResendEnabled();

  await expect.poll(async () => forgotPasswordPage.isResendEnabled()).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('input')).map((input) => input.value),
      ),
    )
    .toEqual(['1', '2', '3', '4', '5', '6']);
});
