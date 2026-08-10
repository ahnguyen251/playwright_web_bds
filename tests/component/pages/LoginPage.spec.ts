import { expect, test } from '@playwright/test';

import { LoginPage } from '../../../pages/authentication/LoginPage';

test('submits credentials through the Propify login modal', async ({ page }) => {
  await page.setContent(`
    <input id="decoy-email" placeholder="Email của bạn" value="unchanged@example.test" />
    <input id="decoy-password" placeholder="Mật khẩu" type="password" value="unchanged" />
    <button id="decoy-continue">Tiếp tục</button>
    <button aria-label="Đăng nhập">Đăng nhập</button>
    <section role="dialog" hidden>
      <input id="dialog-email" placeholder="Email của bạn" />
      <input id="dialog-password" placeholder="Mật khẩu" type="password" />
      <button>Quên mật khẩu?</button>
      <button id="dialog-continue">Tiếp tục</button>
    </section>
    <script>
      document.querySelector('[aria-label="Đăng nhập"]').onclick = () => {
        document.querySelector('[role="dialog"]').hidden = false;
      };
      document.querySelector('#dialog-continue').onclick = () => {
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
          decoyEmail: inputValue('#decoy-email'),
          decoyPassword: inputValue('#decoy-password'),
          dialogEmail: inputValue('#dialog-email'),
          dialogPassword: inputValue('#dialog-password'),
          submitted: document.body.dataset.submitted,
        };
      }),
    )
    .toEqual({
      decoyEmail: 'unchanged@example.test',
      decoyPassword: 'unchanged',
      dialogEmail: 'user@example.test',
      dialogPassword: 'secret-value',
      submitted: 'true',
    });
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

  await expect(forgotPasswordPage.heading).toBeVisible();
});
