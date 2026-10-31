import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const jsRequests = [];
  page.on('request', req => {
    if (req.url().endsWith('.js')) {
      jsRequests.push(req.url());
    }
  });

  await page.goto('https://propifyy.duckdns.org/listings/49', { waitUntil: 'networkidle' });
  console.log('All JS requests on listing detail:', jsRequests);

  for (const url of jsRequests) {
    const res = await page.request.get(url);
    const txt = await res.text();
    if (txt.includes('Nhắn tin') || txt.includes('Nhắn tin chủ nhà')) {
      console.log(`\n=== Found "Nhắn tin" in ${url} ===`);
      let pos = 0;
      while ((pos = txt.indexOf('Nhắn tin', pos)) !== -1) {
        console.log(txt.slice(Math.max(0, pos - 150), pos + 250));
        console.log('---');
        pos += 8;
      }
    }
  }

  // Now do the same for /profile?tab=transactions
  const transJsRequests = [];
  page.on('request', req => {
    if (req.url().endsWith('.js') && !transJsRequests.includes(req.url())) {
      transJsRequests.push(req.url());
    }
  });
  await page.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });
  for (const url of transJsRequests) {
    const res = await page.request.get(url);
    const txt = await res.text();
    if (txt.includes('Lịch sử giao dịch') || txt.includes('Gói tin')) {
      console.log(`\n=== Found Transactions in ${url} ===`);
      let pos = 0;
      while ((pos = txt.indexOf('Lịch sử giao dịch', pos)) !== -1) {
        console.log(txt.slice(Math.max(0, pos - 150), pos + 300));
        console.log('---');
        pos += 17;
      }
    }
  }

  await browser.close();
}

main().catch(console.error);
