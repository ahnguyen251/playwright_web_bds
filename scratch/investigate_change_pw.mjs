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
  
  const changePwBtn = page.getByRole('button', { name: 'Đổi mật khẩu', exact: true });
  await changePwBtn.click();
  await page.waitForTimeout(500);
  
  const mainText = await page.getByRole('main').innerText();
  console.log('--- Main text on Profile (change password) ---');
  console.log(mainText);

  const inputs = await page.locator('input').evaluateAll((els) => els.map(el => ({
    type: el.type,
    name: el.name,
    id: el.id,
    placeholder: el.placeholder,
    disabled: el.disabled
  })));
  console.log('--- Inputs in change password ---', JSON.stringify(inputs, null, 2));

  await browser.close();
}

main().catch(console.error);
