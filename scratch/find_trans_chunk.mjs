import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  const allScripts = new Set();
  page.on('request', req => {
    if (req.url().endsWith('.js')) {
      allScripts.add(req.url());
    }
  });

  await page.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });

  console.log('All scripts loaded on transactions tab:', Array.from(allScripts));

  for (const url of allScripts) {
    const res = await page.request.get(url);
    const content = await res.text();
    if (content.includes('Mã giao dịch') || content.includes('Tìm kiếm theo tên tin đăng')) {
      console.log(`\n=== Found in ${url} ===`);
      const p = content.indexOf('Tìm kiếm theo tên tin đăng');
      console.log(content.slice(Math.max(0, p - 500), p + 1500));
    }
  }

  await browser.close();
}

main().catch(console.error);
