import { expect, test } from '@playwright/test';

import { RegisterPage } from '../../../pages/authentication/RegisterPage';
import { HeaderComponent } from '../../../pages/components/HeaderComponent';

test('opens, fills, and submits the deployed registration form contract', async ({ page }) => {
  await page.setContent(`
    <button>Đăng ký ngay</button>
    <section hidden>
      <h1>Tạo tài khoản</h1>
      <input id="full-name" placeholder="Họ và tên" />
      <input id="email" placeholder="Email của bạn" />
      <input id="password" placeholder="Mật khẩu" type="password" />
      <input id="password-confirmation" placeholder="Nhập lại mật khẩu" type="password" />
      <button id="submit-registration">Tạo tài khoản</button>
    </section>
    <script>
      document.querySelector('body > button').onclick = () => {
        document.querySelector('section').hidden = false;
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
    <button>Đăng ký ngay</button>
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
      document.querySelector('body > button').onclick = () => {
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
  await expect(registerPage.otpHeading).toBeVisible();

  await page.evaluate(() => {
    const otpState = document.querySelector<HTMLElement>('#otp-state');
    const successState = document.querySelector<HTMLElement>('#success-state');
    if (otpState === null || successState === null) throw new Error('Expected states not found.');
    otpState.hidden = true;
    successState.hidden = false;
  });

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

  await expect(header.accountEmail('registration+run@example.test')).toBeVisible();
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
