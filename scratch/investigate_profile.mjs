import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();
  
  await page.goto('https://propifyy.duckdns.org/profile', { waitUntil: 'networkidle' });
  console.log('Current URL:', page.url());
  
  const accountBtn = page.getByRole('button', { name: 'Thông tin tài khoản', exact: true });
  if (await accountBtn.isVisible()) {
    await accountBtn.click();
    await page.waitForTimeout(1000);
  }
  
  const mainText = await page.getByRole('main').innerText();
  console.log('--- Main text on Profile ---');
  console.log(mainText);
  
  const buttons = await page.getByRole('main').getByRole('button').allInnerTexts();
  console.log('--- Buttons ---', buttons);
  
  const inputs = await page.locator('input').evaluateAll((els) => els.map(el => ({
    type: el.type,
    name: el.name,
    id: el.id,
    placeholder: el.placeholder,
    value: el.value,
    maxLength: el.maxLength,
    disabled: el.disabled
  })));
  console.log('--- Inputs ---', JSON.stringify(inputs, null, 2));

  await browser.close();
}

main().catch(console.error);
