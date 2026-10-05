import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();
  
  await page.goto('https://propifyy.duckdns.org/profile', { waitUntil: 'networkidle' });
  const accept = await page.locator('input[type="file"]').getAttribute('accept');
  console.log('accept attribute on input[type="file"]:', accept);

  await browser.close();
}

main().catch(console.error);
