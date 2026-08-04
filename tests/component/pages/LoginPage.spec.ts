import { expect, test } from '@playwright/test';

import { LoginPage } from '../../../pages/authentication/LoginPage';

test('submits credentials through the Propify login modal', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section role="dialog" hidden>
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <button>Quên mật khẩu?</button>
      <button>Tiếp tục</button>
    </section>
    <script>
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('[role="dialog"]').hidden = false;
      };
      document.querySelector('section button:last-of-type').onclick = () => {
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
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <button>Quên mật khẩu?</button>
      <button>Tiếp tục</button>
      <h1 hidden>Quên mật khẩu</h1>
    </section>
    <script>
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('[role="dialog"]').hidden = false;
      };
      document.querySelector('section button:first-of-type').onclick = () => {
        document.querySelector('h1').hidden = false;
      };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  const forgotPasswordPage = await loginPage.openForgotPassword();

  expect(await forgotPasswordPage.isOpen()).toBe(true);
});
