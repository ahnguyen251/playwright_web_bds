import { expect, test } from '@playwright/test';

import { RegisterPage } from '../../../pages/authentication/RegisterPage';
import { HeaderComponent } from '../../../pages/components/HeaderComponent';

test('preserves validation feedback without submitting invalid registration data', async ({
  page,
}) => {
  await page.setContent(`
    <button>Đăng nhập</button>
    <button>Đăng ký ngay</button>
    <section>
      <input placeholder="Họ và tên" />
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <input placeholder="Nhập lại mật khẩu" type="password" />
      <p>Mật khẩu phải có ít nhất 8 ký tự</p>
      <p>Mật khẩu xác nhận không khớp</p>
      <button disabled>Tạo tài khoản</button>
    </section>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.fillRegistration({
    fullName: 'Registration Automation',
    email: 'registration@example.test',
    password: 'short',
    passwordConfirmation: 'different',
  });
  await registerPage.blurAllFields();

  expect(await registerPage.visibleValidationMessages()).toEqual([
    'Mật khẩu phải có ít nhất 8 ký tự',
    'Mật khẩu xác nhận không khớp',
  ]);
  expect(await registerPage.isSubmitEnabled()).toBe(false);
});

test('opens, fills, and submits the deployed registration form contract', async ({ page }) => {
  await page.setContent(`
    <nav><a href="/" aria-label="Propify">Propify</a><button id="open-login">Đăng nhập</button></nav>
    <section id="login-form" hidden>
      <button id="open-registration">Đăng ký ngay</button>
    </section>
    <section id="registration-form" hidden>
      <h1>Tạo tài khoản</h1>
      <input id="full-name" placeholder="Họ và tên" />
      <input id="email" placeholder="Email của bạn" />
      <input id="password" placeholder="Mật khẩu" type="password" />
      <input id="password-confirmation" placeholder="Nhập lại mật khẩu" type="password" />
      <button id="submit-registration">Tạo tài khoản</button>
    </section>
    <script>
      document.querySelector('#open-login').onclick = () => {
        document.querySelector('#login-form').hidden = false;
      };
      document.querySelector('#open-registration').onclick = () => {
        document.querySelector('#registration-form').hidden = false;
      };
      document.querySelector('#submit-registration').onclick = () => {
        document.body.dataset.submitted = 'true';
      };
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.open();
  await registerPage.fillRegistration({
    fullName: 'Registration Automation',
    email: 'registration+run@example.test',
    password: 'StrongPassword1',
    passwordConfirmation: 'StrongPassword1',
  });
  await registerPage.submit();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const inputValue = (id: string): string => {
          const input = document.querySelector<HTMLInputElement>(id);
          if (input === null) throw new Error(`Expected input not found: ${id}`);
          return input.value;
        };

        return {
          fullName: inputValue('#full-name'),
          email: inputValue('#email'),
          password: inputValue('#password'),
          passwordConfirmation: inputValue('#password-confirmation'),
          submitted: document.body.dataset.submitted,
        };
      }),
    )
    .toEqual({
      fullName: 'Registration Automation',
      email: 'registration+run@example.test',
      password: 'StrongPassword1',
      passwordConfirmation: 'StrongPassword1',
      submitted: 'true',
    });
});

test('exposes web-first OTP and success checkpoints and completes registration', async ({
  page,
}) => {
  await page.setContent(`
    <nav><a href="/" aria-label="Propify">Propify</a><button id="open-login">Đăng nhập</button></nav>
    <section id="login-form" hidden>
      <button id="open-registration">Đăng ký ngay</button>
    </section>
    <section id="registration-form" hidden>
      <input placeholder="Họ và tên" />
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <input placeholder="Nhập lại mật khẩu" type="password" />
      <button id="submit-registration">Tạo tài khoản</button>
    </section>
    <section id="otp-state" hidden><h1>Xác thực email</h1></section>
    <section id="success-state" hidden>
      <h1>Đăng ký thành công!</h1>
      <button id="complete-registration">Khám phá ngay</button>
    </section>
    <script>
      document.querySelector('#open-login').onclick = () => {
        document.querySelector('#login-form').hidden = false;
      };
      document.querySelector('#open-registration').onclick = () => {
        document.querySelector('#registration-form').hidden = false;
      };
      document.querySelector('#submit-registration').onclick = () => {
        document.querySelector('#registration-form').hidden = true;
        document.querySelector('#otp-state').hidden = false;
      };
      document.querySelector('#complete-registration').onclick = () => {
        document.body.dataset.completed = 'true';
      };
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.open();
  await registerPage.submit();
  await registerPage.waitForOtpScreen();
  await expect(registerPage.otpHeading).toBeVisible();

  await page.evaluate(() => {
    const otpState = document.querySelector<HTMLElement>('#otp-state');
    const successState = document.querySelector<HTMLElement>('#success-state');
    if (otpState === null || successState === null) throw new Error('Expected states not found.');
    otpState.hidden = true;
    successState.hidden = false;
  });

  await registerPage.waitForRegistrationSuccess();
  await expect(registerPage.registrationSuccessHeading).toBeVisible();
  await registerPage.completeRegistration();
  await expect.poll(() => page.evaluate(() => document.body.dataset.completed)).toBe('true');
});

test('locates the authenticated registration email by exact visible text', async ({ page }) => {
  await page.setContent(`
    <div>registration+run@example.test</div>
    <div>registration+run@example.test.backup</div>
  `);
  const header = new HeaderComponent(page);

  await header.waitForAccountEmail('registration+run@example.test');
  await expect(header.accountEmail('registration+run@example.test')).toBeVisible();
});

test('enters and submits OTP through six unique accessible textbox names', async ({ page }) => {
  await page.setContent(`
    <h1>Xác thực email</h1>
    <input aria-label="Mã OTP 1" maxlength="1" oninput="document.body.dataset.otp1 = this.value" />
    <input aria-label="Mã OTP 2" maxlength="1" oninput="document.body.dataset.otp2 = this.value" />
    <input aria-label="Mã OTP 3" maxlength="1" oninput="document.body.dataset.otp3 = this.value" />
    <input aria-label="Mã OTP 4" maxlength="1" oninput="document.body.dataset.otp4 = this.value" />
    <input aria-label="Mã OTP 5" maxlength="1" oninput="document.body.dataset.otp5 = this.value" />
    <input aria-label="Mã OTP 6" maxlength="1" oninput="document.body.dataset.otp6 = this.value" />
    <button onclick="document.body.dataset.verified = 'true'">Xác nhận</button>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.enterOtp('123456');

  await expect
    .poll(() =>
      page.evaluate(() => ({
        otp1: document.body.dataset.otp1,
        otp2: document.body.dataset.otp2,
        otp3: document.body.dataset.otp3,
        otp4: document.body.dataset.otp4,
        otp5: document.body.dataset.otp5,
        otp6: document.body.dataset.otp6,
      })),
    )
    .toEqual({ otp1: '1', otp2: '2', otp3: '3', otp4: '4', otp5: '5', otp6: '6' });
  await expect.poll(() => page.evaluate(() => document.body.dataset.verified)).toBe('true');
});

test('blocks valid OTP entry until six unique accessible input names are deployed', async ({
  page,
}) => {
  await page.setContent(`
    <h1>Xác thực email</h1>
    <input maxlength="1" oninput="document.body.dataset.otpTouched = 'true'" />
    <input maxlength="1" oninput="document.body.dataset.otpTouched = 'true'" />
    <input maxlength="1" oninput="document.body.dataset.otpTouched = 'true'" />
    <input maxlength="1" oninput="document.body.dataset.otpTouched = 'true'" />
    <input maxlength="1" oninput="document.body.dataset.otpTouched = 'true'" />
    <input maxlength="1" oninput="document.body.dataset.otpTouched = 'true'" />
  `);
  const registerPage = new RegisterPage(page);

  await expect(registerPage.enterOtp('123456')).rejects.toThrow(
    'OTP entry is blocked: Propify must expose six unique accessible textbox names: "Mã OTP 1" through "Mã OTP 6".',
  );
  await expect.poll(() => page.evaluate(() => document.body.dataset.otpTouched)).toBeUndefined();
});

test('rejects an invalid OTP format before evaluating the accessibility contract', async ({
  page,
}) => {
  await page.setContent('<h1>Xác thực email</h1>');
  const registerPage = new RegisterPage(page);

  await expect(registerPage.enterOtp('12A456')).rejects.toThrow(
    'OTP must contain exactly six digits.',
  );
});

test('fills and blurs each registration field without exposing form locators', async ({ page }) => {
  await page.setContent(`
    <section>
      <input placeholder="Họ và tên" onblur="document.body.dataset.fullName = this.value" />
      <input placeholder="Email của bạn" onblur="document.body.dataset.email = this.value" />
      <input placeholder="Mật khẩu" type="password" onblur="document.body.dataset.password = this.value" />
      <input placeholder="Nhập lại mật khẩu" type="password" onblur="document.body.dataset.passwordConfirmation = this.value" />
      <button>Tạo tài khoản</button>
    </section>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.fillFullName('Registration Automation');
  await registerPage.blurFullName();
  await registerPage.fillEmail('registration@example.test');
  await registerPage.blurEmail();
  await registerPage.fillPassword('StrongPassword1');
  await registerPage.blurPassword();
  await registerPage.fillPasswordConfirmation('StrongPassword1');
  await registerPage.blurPasswordConfirmation();

  await expect
    .poll(() => page.evaluate(() => ({ ...document.body.dataset })))
    .toEqual({
      email: 'registration@example.test',
      fullName: 'Registration Automation',
      password: 'StrongPassword1',
      passwordConfirmation: 'StrongPassword1',
    });
});

test('returns scoped registration validation and server feedback exactly', async ({ page }) => {
  await page.setContent(`
    <p role="alert">Unrelated page alert</p>
    <section>
      <input placeholder="Họ và tên" />
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <input placeholder="Nhập lại mật khẩu" type="password" />
      <p>Email không hợp lệ</p>
      <p class="text-red-500 text-xs mb-3 flex items-center gap-1">Email đã tồn tại</p>
      <button>Tạo tài khoản</button>
    </section>
  `);
  const registerPage = new RegisterPage(page);

  expect(await registerPage.fieldValidationMessages()).toEqual(['Email không hợp lệ']);
  expect(await registerPage.serverMessage()).toBe('Email đã tồn tại');
});

test('observes the transient disabled loading state before submitting registration', async ({ page }) => {
  await page.setContent(`
    <section>
      <button id="submit-registration">Tạo tài khoản</button>
    </section>
    <script>
      document.querySelector('#submit-registration').onclick = (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = 'Đang xử lý...';
        queueMicrotask(() => {
          button.disabled = false;
          button.textContent = 'Tạo tài khoản';
        });
      };
    </script>
  `);
  const registerPage = new RegisterPage(page);

  expect(await registerPage.submitAndObserveTransition()).toEqual({
    disabledObserved: true,
    loadingTextObserved: true,
  });
});

test('waits web-first for registration OTP resend to become enabled', async ({ page }) => {
  await page.setContent(`
    <section>
      <button>Xác nhận OTP</button>
      <button id="resend" disabled>Gửi lại</button>
    </section>
    <script>
      queueMicrotask(() => {
        document.querySelector('#resend').disabled = false;
      });
    </script>
  `);
  const registerPage = new RegisterPage(page);

  await registerPage.waitForResendEnabled();
  await expect.poll(async () => registerPage.isResendEnabled()).toBe(true);
});
