import { expect, test } from '@playwright/test';

import { AuthenticationModalComponent } from '../../../pages/components/AuthenticationModalComponent';

test('operates shared authentication controls when the modal has no dialog role', async ({
  page,
}) => {
  await page.setContent(`
    <button>Đăng nhập</button>
    <div class="fixed inset-0">
      <section>
        <h1>Xin chào,</h1>
        <button class="absolute top-4 right-4"><svg aria-hidden="true"></svg></button>
        <button>Đăng nhập với Google</button>
        <button>Đăng ký ngay</button>
        <button>Đăng nhập</button>
      </section>
    </div>
    <script>
      const modal = document.querySelector('.fixed');
      modal.querySelector('button.absolute.top-4.right-4').onclick = () => { document.body.dataset.closed = 'true'; };
      Array.from(modal.querySelectorAll('button')).find((button) => button.textContent === 'Đăng nhập với Google').onclick = () => { document.body.dataset.google = 'true'; };
      Array.from(modal.querySelectorAll('button')).find((button) => button.textContent === 'Đăng ký ngay').onclick = () => { document.body.dataset.register = 'true'; };
      Array.from(modal.querySelectorAll('button')).find((button) => button.textContent === 'Đăng nhập').onclick = () => { document.body.dataset.login = 'true'; };
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
