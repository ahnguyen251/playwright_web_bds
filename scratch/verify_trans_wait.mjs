import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  console.log('Navigating to /profile...');
  await page.goto('https://propifyy.duckdns.org/profile', { waitUntil: 'domcontentloaded' });
  
  const transBtn = page.getByRole('button', { name: 'Lịch sử giao dịch' }).first();
  await transBtn.waitFor({ state: 'visible' });

  const responsePromise = page.waitForResponse(
    res => res.url().includes('/user/transactions') && res.status() === 200,
    { timeout: 10000 }
  );

  await transBtn.click();
  const res = await responsePromise;
  console.log('Transaction response received:', res.status());

  const tableRows = page.locator('table tbody tr');
  await tableRows.first().waitFor({ state: 'visible' });
  
  const count = await tableRows.count();
  console.log('Rows count:', count);
  console.log('First row text:', await tableRows.first().innerText());

  // Test keyword search
  const searchInput = page.getByPlaceholder('Tìm kiếm theo tên tin đăng...');
  await searchInput.fill('cho thuê 02');
  
  // Wait for row count to become 1
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('table tbody tr');
    return rows.length === 1 && rows[0].innerText.includes('cho thuê 02');
  }, null, { timeout: 5000 });
  
  console.log('After filter row text:', await tableRows.first().innerText());

  await browser.close();
}

main().catch(console.error);
