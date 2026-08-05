import { expect, test } from '@playwright/test';

import { AuthenticationModalComponent } from '../../../pages/components/AuthenticationModalComponent';

test('operates shared authentication controls within the modal', async ({ page }) => {
  await page.setContent(`
    <button>Đăng nhập</button>
    <section role="dialog">
      <h1>Xin chào,</h1>
      <button>Đóng</button>
      <button>Đăng nhập với Google</button>
      <button>Đăng ký ngay</button>
      <button>Đăng nhập</button>
    </section>
    <script>
      const dialog = document.querySelector('[role="dialog"]');
      dialog.querySelector('button:nth-of-type(1)').onclick = () => { document.body.dataset.closed = 'true'; };
      dialog.querySelector('button:nth-of-type(2)').onclick = () => { document.body.dataset.google = 'true'; };
      dialog.querySelector('button:nth-of-type(3)').onclick = () => { document.body.dataset.register = 'true'; };
      dialog.querySelector('button:nth-of-type(4)').onclick = () => { document.body.dataset.login = 'true'; };
    </script>
  `);
  const authenticationModal = new AuthenticationModalComponent(page);

  await authenticationModal.switchToRegister();
  await authenticationModal.switchToLogin();
  await authenticationModal.loginWithGoogle();
  await authenticationModal.close();

  expect(await page.evaluate(() => document.body.dataset.register)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.login)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.google)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.closed)).toBe('true');
});
