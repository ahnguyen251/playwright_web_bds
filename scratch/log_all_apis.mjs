import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log('API Request:', req.method(), req.url());
    }
  });

  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      console.log('API Response:', res.status(), res.url());
      try {
        const body = await res.text();
        console.log('Body:', body.slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await browser.close();
}

main().catch(console.error);
