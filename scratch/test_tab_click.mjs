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
      try {
        const body = await res.text();
        console.log('API Response:', res.status(), res.url(), body.slice(0, 150));
      } catch (e) {}
    }
  });

  await page.goto('https://propifyy.duckdns.org/profile', { waitUntil: 'networkidle' });
  
  // Click "Lịch sử giao dịch" in sidebar
  const transTabBtn = page.getByRole('button', { name: 'Lịch sử giao dịch' }).first();
  console.log('Clicking "Lịch sử giao dịch" tab button...');
  await transTabBtn.click();
  await page.waitForTimeout(2000);

  // Check table rows
  const tableRows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Table rows after click:', tableRows);

  await browser.close();
}

main().catch(console.error);
