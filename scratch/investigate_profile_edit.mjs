import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();
  
  await page.goto('https://propifyy.duckdns.org/profile', { waitUntil: 'networkidle' });
  
  const accountBtn = page.getByRole('button', { name: 'Thông tin tài khoản', exact: true });
  if (await accountBtn.isVisible()) {
    await accountBtn.click();
    await page.waitForTimeout(500);
  }
  
  const editBtn = page.getByRole('button', { name: 'Chỉnh sửa', exact: true });
  await editBtn.click();
  await page.waitForTimeout(500);
  
  const mainText = await page.getByRole('main').innerText();
  console.log('--- Main text on Profile (in edit mode) ---');
  console.log(mainText);
  
  const buttons = await page.getByRole('main').getByRole('button').evaluateAll(els => els.map(b => ({
    text: b.innerText.trim(),
    disabled: b.disabled,
    className: b.className
  })));
  console.log('--- Buttons in edit mode ---', buttons);

  await browser.close();
}

main().catch(console.error);
