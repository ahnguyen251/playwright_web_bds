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

test('reports when disabled registration submit prevents user activation', async ({ page }) => {
  await page.setContent(`
    <section>
      <input placeholder="Nhập lại mật khẩu" />
      <button disabled onclick="document.body.dataset.submitted = 'true'">Tạo tài khoản</button>
    </section>
  `);
  const registerPage = new RegisterPage(page);

  await expect(registerPage.activateSubmit()).resolves.toBe('blocked');
  await expect.poll(() => page.evaluate(() => document.body.dataset.submitted)).toBeUndefined();
});

test('activates enabled registration submit through the Page Object', async ({ page }) => {
  await page.setContent(`
    <section>
      <input placeholder="Nhập lại mật khẩu" />
      <button onclick="document.body.dataset.submitted = 'true'">Tạo tài khoản</button>
    </section>
  `);
  const registerPage = new RegisterPage(page);

  await expect(registerPage.activateSubmit()).resolves.toBe('activated');
  await expect.poll(() => page.evaluate(() => document.body.dataset.submitted)).toBe('true');
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
    .poll(() => page.evaluate(() => Object.fromEntries(Object.entries(document.body.dataset))))
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
      <p>Vui lòng nhập họ và tên</p>
      <p>Email không hợp lệ</p>
      <p>Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số</p>
      <p>Phải trùng khớp với mật khẩu đã nhập</p>
      <p class="text-red-500 text-xs mb-3 flex items-center gap-1">Email đã tồn tại</p>
      <button>Tạo tài khoản</button>
    </section>
  `);
  const registerPage = new RegisterPage(page);

  expect(await registerPage.fieldValidationMessages()).toEqual([
    'Vui lòng nhập họ và tên',
    'Email không hợp lệ',
    'Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số',
    'Phải trùng khớp với mật khẩu đã nhập',
  ]);
  expect(await registerPage.serverMessage()).toBe('Email đã tồn tại');
});

test('observes the transient disabled loading state before submitting registration', async ({
  page,
}) => {
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

test('ignores an unrelated pre-click loading mutation before the registration submit event', async ({
  page,
}) => {
  await page.setContent(`
    <section>
      <button id="submit-registration">Tạo tài khoản</button>
    </section>
    <script>
      const button = document.querySelector('#submit-registration');
      button.addEventListener('mousedown', () => {
        button.disabled = true;
        button.textContent = 'Đang xử lý...';
        queueMicrotask(() => {
          button.disabled = false;
          button.textContent = 'Tạo tài khoản';
        });
      });
      button.addEventListener('click', () => {
        document.body.dataset.submitted = 'true';
      });
    </script>
  `);
  const registerPage = new RegisterPage(page);

  expect(await registerPage.submitAndObserveTransition()).toEqual({
    disabledObserved: false,
    loadingTextObserved: false,
  });
  await expect.poll(() => page.evaluate(() => document.body.dataset.submitted)).toBe('true');
});

test('does not combine non-overlapping registration loading states into a transition', async ({
  page,
}) => {
  await page.setContent(`
    <section>
      <button id="submit-registration">Tạo tài khoản</button>
    </section>
    <script>
      document.querySelector('#submit-registration').onclick = (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        requestAnimationFrame(() => {
          button.disabled = false;
          button.textContent = 'Đang xử lý...';
          requestAnimationFrame(() => {
            button.textContent = 'Tạo tài khoản';
          });
        });
      };
    </script>
  `);
  const registerPage = new RegisterPage(page);

  expect(await registerPage.submitAndObserveTransition()).toEqual({
    disabledObserved: false,
    loadingTextObserved: false,
  });
});

test('returns a safe false transition observation when submit never enters loading', async ({
  page,
}) => {
  await page.setContent('<button>Tạo tài khoản</button>');
  const registerPage = new RegisterPage(page);

  expect(await registerPage.submitAndObserveTransition()).toEqual({
    disabledObserved: false,
    loadingTextObserved: false,
  });
});

test('cancels transition observation when the submit click loses its target', async ({ page }) => {
  page.setDefaultTimeout(250);
  await page.setContent(`
    <button id="submit-registration">Tạo tài khoản</button>
    <div id="click-blocker" style="position: fixed; inset: 0"></div>
    <script>
      const button = document.querySelector('#submit-registration');
      button.addEventListener('auth-transition-observation-cancel', () => {
        document.body.dataset.observationCancelled = 'true';
      });
      const NativeMutationObserver = window.MutationObserver;
      window.MutationObserver = class extends NativeMutationObserver {
        constructor(callback) {
          super(callback);
          document.body.dataset.observationInstalled = 'true';
        }
      };
    </script>
  `);
  const registerPage = new RegisterPage(page);
  const transition = registerPage.submitAndObserveTransition();

  await expect
    .poll(() => page.evaluate(() => document.body.dataset.observationInstalled))
    .toBe('true');
  await page.evaluate(() => document.querySelector('#submit-registration')?.remove());

  await expect(transition).rejects.toThrow();
  await expect
    .poll(() => page.evaluate(() => document.body.dataset.observationCancelled))
    .toBe('true');
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
  const registerPage = new RegisterPage(page, { resendEnabledMs: 1_000 });

  await registerPage.waitForResendEnabled();
  await expect.poll(async () => registerPage.isResendEnabled()).toBe(true);
});

test('uses the configured web-first registration resend timeout', async ({ page }) => {
  await page.setContent(`
    <section>
      <button>Xác nhận OTP</button>
      <button disabled>Gửi lại</button>
    </section>
  `);
  const registerPage = new RegisterPage(page, { resendEnabledMs: 5 });

  await expect(registerPage.waitForResendEnabled()).rejects.toThrow(/5ms/);
});
