import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  // Listen to network requests on /profile?tab=transactions
  page.on('response', async res => {
    if (res.url().includes('trans') || res.url().includes('payment')) {
      console.log('Response URL:', res.url(), res.status());
      try {
        const data = await res.json();
        console.log('Response JSON:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Could not parse JSON');
      }
    }
  });

  await page.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await browser.close();
}

main().catch(console.error);
