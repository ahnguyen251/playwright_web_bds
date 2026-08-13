import { expect, test } from '@playwright/test';

import { LoginPage } from '../../../pages/authentication/LoginPage';

test('opens and submits through a login modal without a dialog role', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <div class="fixed inset-0" hidden>
      <section>
        <h1>Xin chào,</h1>
        <input placeholder="Email của bạn" />
        <input placeholder="Mật khẩu" type="password" />
        <button>Quên mật khẩu?</button>
        <button>Tiếp tục</button>
      </section>
    </div>
    <script type="text/javascript">
      const headerNavigation = document.createElement('nav');
      const headerLogo = document.createElement('a');
      headerLogo.href = '/';
      headerLogo.setAttribute('aria-label', 'Propify');
      headerLogo.textContent = 'Propify';
      const headerLoginButton = document.querySelector('button');
      headerLoginButton.before(headerNavigation);
      headerNavigation.append(headerLogo, headerLoginButton);
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('.fixed').hidden = false;
      };
      document.querySelector('.fixed section button:last-of-type').onclick = () => {
        document.body.dataset.submitted = 'true';
      };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.submitCredentials({
    alias: 'defaultUser',
    email: 'user@example.test',
    password: 'secret-value',
  });

  expect(await page.evaluate(() => document.body.dataset.submitted)).toBe('true');
});

test('opens the forgot-password view from the login modal', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section role="dialog" hidden>
      <h1>Xin chào,</h1>
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <button>Quên mật khẩu?</button>
      <button>Tiếp tục</button>
      <h1 hidden>Quên mật khẩu</h1>
    </section>
    <script type="text/javascript">
      const headerNavigation = document.createElement('nav');
      const headerLogo = document.createElement('a');
      headerLogo.href = '/';
      headerLogo.setAttribute('aria-label', 'Propify');
      headerLogo.textContent = 'Propify';
      const headerLoginButton = document.querySelector('button');
      headerLoginButton.before(headerNavigation);
      headerNavigation.append(headerLogo, headerLoginButton);
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('[role="dialog"]').hidden = false;
      };
      document.querySelector('section button:first-of-type').onclick = () => {
        document.querySelector('h1[hidden]').hidden = false;
      };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  const forgotPasswordPage = await loginPage.openForgotPassword();

  expect(await forgotPasswordPage.isOpen()).toBe(true);
});

test('exposes invalid-email feedback without submitting credentials', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section role="dialog" hidden>
      <h1>Xin chào,</h1>
      <p class="text-red-500 text-xs mb-2 flex items-center gap-1">Vui lòng nhập email hợp lệ</p>
      <div><input placeholder="Email của bạn" /></div>
      <div><input placeholder="Mật khẩu" type="password" /></div>
      <p class="text-red-500 text-xs mb-3 flex items-center gap-1">Thông tin đăng nhập không chính xác</p>
      <button>Quên mật khẩu?</button>
      <button disabled>Tiếp tục</button>
    </section>
    <script type="text/javascript">
      const headerNavigation = document.createElement('nav');
      const headerLogo = document.createElement('a');
      headerLogo.href = '/';
      headerLogo.setAttribute('aria-label', 'Propify');
      headerLogo.textContent = 'Propify';
      const headerLoginButton = document.querySelector('button');
      headerLoginButton.before(headerNavigation);
      headerNavigation.append(headerLogo, headerLoginButton);
      const dialog = document.querySelector('[role="dialog"]');
      const email = dialog.querySelector('input[placeholder="Email của bạn"]');
      const password = dialog.querySelector('input[placeholder="Mật khẩu"]');
      const submit = dialog.querySelector('button:last-of-type');
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        dialog.hidden = false;
      };
      const updateState = () => {
        submit.disabled = !email.value.includes('@') || password.value.length === 0;
      };
      email.oninput = updateState;
      password.oninput = updateState;
      email.onblur = () => {
        if (!email.value.includes('@')) {
          document.body.dataset.validationTriggered = 'true';
        }
      };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.fillCredentials({ email: 'invalid-email', password: 'x' });
  await loginPage.blurEmail();

  expect(await loginPage.validationMessage()).toBe('Vui lòng nhập email hợp lệ');
  expect(await loginPage.serverMessage()).toBe('Thông tin đăng nhập không chính xác');
  expect(await loginPage.isSubmitEnabled()).toBe(false);
  expect(await page.evaluate(() => document.body.dataset.validationTriggered)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.submitted)).toBeUndefined();
});

test('fills empty login fields separately and returns the exact scoped server feedback', async ({
  page,
}) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section role="dialog" hidden>
      <h1>Xin chào,</h1>
      <input placeholder="Email của bạn" value="prefilled@example.test" onblur="document.body.dataset.email = this.value" />
      <input placeholder="Mật khẩu" type="password" value="prefilled-password" onblur="document.body.dataset.password = this.value" />
      <p class="text-red-500 text-xs mb-3 flex items-center gap-1">Tài khoản của bạn đã bị khóa</p>
      <button>Quên mật khẩu?</button>
      <button>Tiếp tục</button>
    </section>
    <script type="text/javascript">
      const navigation = document.createElement('nav');
      const logo = document.createElement('a');
      logo.href = '/';
      logo.setAttribute('aria-label', 'Propify');
      const login = document.querySelector('[aria-label="Đăng nhập"]');
      login.before(navigation);
      navigation.append(logo, login);
      login.onclick = () => { document.querySelector('[role="dialog"]').hidden = false; };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.fillEmail('');
  await loginPage.blurEmail();
  await loginPage.fillPassword('');
  await loginPage.blurPassword();

  await expect.poll(() => page.evaluate(() => ({ ...document.body.dataset }))).toEqual({
    email: '',
    password: '',
  });
  expect(await loginPage.serverMessage()).toBe('Tài khoản của bạn đã bị khóa');
});
