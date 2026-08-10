import { expect, test } from '@playwright/test';

import { LoginPage } from '../../../pages/authentication/LoginPage';

test('submits credentials through the Propify login modal', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section id="authentication-modal" hidden>
      <input id="email" placeholder="Email của bạn" />
      <input id="password" placeholder="Mật khẩu" type="password" />
      <button>Quên mật khẩu?</button>
      <button id="continue">Tiếp tục</button>
    </section>
    <script>
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('#authentication-modal').hidden = false;
      };
      document.querySelector('#continue').onclick = () => {
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

  await expect
    .poll(() =>
      page.evaluate(() => {
        const inputValue = (selector: string): string => {
          const input = document.querySelector<HTMLInputElement>(selector);
          if (input === null) {
            throw new Error(`Expected input not found: ${selector}`);
          }
          return input.value;
        };

        return {
          email: inputValue('#email'),
          password: inputValue('#password'),
          submitted: document.body.dataset.submitted,
        };
      }),
    )
    .toEqual({
      email: 'user@example.test',
      password: 'secret-value',
      submitted: 'true',
    });
});

test('opens the forgot-password view from the login modal', async ({ page }) => {
  await page.setContent(`
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section id="authentication-modal" hidden>
      <input placeholder="Email của bạn" />
      <input placeholder="Mật khẩu" type="password" />
      <button>Quên mật khẩu?</button>
      <button>Tiếp tục</button>
      <h1 hidden>Quên mật khẩu</h1>
    </section>
    <script>
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('#authentication-modal').hidden = false;
      };
      document.querySelector('section button:first-of-type').onclick = () => {
        document.querySelector('h1').hidden = false;
      };
    </script>
  `);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  const forgotPasswordPage = await loginPage.openForgotPassword();

  await expect(forgotPasswordPage.heading).toBeVisible();
});
