import { expect, test } from '@playwright/test';

import { HeaderComponent } from '../../../pages/components/HeaderComponent';

test('opens login from the Propify header when the modal also has a login switch', async ({ page }) => {
  await page.setContent(`
    <nav>
      <a href="/" aria-label="Propify">Propify</a>
      <button>Đăng nhập</button>
    </nav>
    <section role="dialog">
      <button>Đăng nhập</button>
    </section>
    <script>
      document.querySelector('nav button').onclick = () => {
        document.body.dataset.headerLogin = 'true';
      };
      document.querySelector('[role="dialog"] button').onclick = () => {
        document.body.dataset.modalLogin = 'true';
      };
    </script>
  `);
  const header = new HeaderComponent(page);

  await header.openLogin();

  expect(await page.evaluate(() => document.body.dataset.headerLogin)).toBe('true');
  expect(await page.evaluate(() => document.body.dataset.modalLogin)).toBeUndefined();
});
