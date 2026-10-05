import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  await page.goto('https://propifyy.duckdns.org/profile', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Lịch sử giao dịch' }).first().click();
  await page.waitForTimeout(1000);

  // 1. Filter by Status: "Thành công"
  console.log('--- Clicking "Thành công" status filter ---');
  await page.getByRole('button', { name: 'Thành công', exact: true }).click();
  await page.waitForTimeout(1500);
  
  let rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Rows when filtered by "Thành công" (count: ' + rows.length + '):');
  rows.forEach(r => console.log(' - ' + r));

  // 2. Filter by Keyword: e.g. "cho thuê 02" or "Ruby"
  console.log('\n--- Searching keyword "cho thuê 02" ---');
  const searchInput = page.getByPlaceholder('Tìm kiếm theo tên tin đăng...');
  await searchInput.fill('cho thuê 02');
  await page.waitForTimeout(500);

  rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Rows when searched "cho thuê 02" (count: ' + rows.length + '):');
  rows.forEach(r => console.log(' - ' + r));

  // 3. Reset filters: Click "Tất cả" and clear keyword
  console.log('\n--- Resetting filters ---');
  await searchInput.fill('');
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await page.waitForTimeout(1000);

  rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Rows after reset (count: ' + rows.length + '):');
  rows.forEach(r => console.log(' - ' + r));

  await browser.close();
}

main().catch(console.error);
