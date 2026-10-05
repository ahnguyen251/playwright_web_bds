import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const res = await page.request.get('https://propifyy.duckdns.org/assets/Detail-DLgua-e4.js');
  const txt = await res.text();
  
  // Find where `ji` is defined
  const idx = txt.indexOf('aria-label":`Nhắn tin chủ nhà`,onClick:');
  if (idx !== -1) {
    const fnNameMatch = txt.slice(idx, idx + 60).match(/onClick:([a-zA-Z0-9_$]+)/);
    if (fnNameMatch) {
      const fnName = fnNameMatch[1];
      console.log('Function name:', fnName);
      
      // Search for function definition
      const defRegex = new RegExp(`(?:const|let|var|function)\\s+${fnName}\\s*=`, 'g');
      let m;
      while ((m = defRegex.exec(txt)) !== null) {
        console.log('Definition snippet:');
        console.log(txt.slice(m.index, m.index + 500));
      }
    }
  }

  // Also check Profile / Transactions chunks
  await page.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });
  const scripts = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]')).map(s => s.src));
  console.log('Scripts on profile page:', scripts);

  for (const s of scripts) {
    const r = await page.request.get(s);
    const content = await r.text();
    if (content.includes('Mã giao dịch') || content.includes('transaction')) {
      console.log('Found transaction code in:', s);
      const pos = content.indexOf('Mã giao dịch');
      if (pos !== -1) {
        console.log(content.slice(Math.max(0, pos - 500), pos + 1500));
      }
    }
  }

  await browser.close();
}

main().catch(console.error);
