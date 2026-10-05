import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://propifyy.duckdns.org/listings/48', { waitUntil: 'networkidle' });

  // Get the click event handler or look at the Vue component for the listing detail
  const btnInfo = await page.locator('button[aria-label="Nhắn tin chủ nhà"]').evaluate(el => {
    // Check vue instance or attributes
    const vnode = el.__vnode || (el._vnode);
    const props = vnode ? vnode.props : null;
    return {
      onclick: el.onclick ? el.onclick.toString() : null,
      hasVnode: !!vnode,
      props: props ? Object.keys(props) : null,
      outerHTML: el.outerHTML
    };
  });
  console.log('Button info:', btnInfo);

  // Let's also check all script files loaded on detail page
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  });
  console.log('Detail page scripts:', scripts);

  // Download all scripts and search for "Nhắn tin chủ nhà"
  for (const src of scripts) {
    const res = await page.request.get(src);
    const txt = await res.text();
    const idx = txt.indexOf('Nhắn tin chủ nhà');
    if (idx !== -1) {
      console.log(`Found in script ${src}:`);
      console.log(txt.slice(Math.max(0, idx - 400), idx + 400));
    }
  }

  // Also let's inspect the transactions script / component in the bundle
  for (const src of scripts) {
    const res = await page.request.get(src);
    const txt = await res.text();
    const idx = txt.indexOf('Tìm kiếm theo tên tin đăng...');
    if (idx !== -1) {
      console.log(`Found Transactions in script ${src}:`);
      console.log(txt.slice(Math.max(0, idx - 600), idx + 1000));
    }
  }

  await browser.close();
}

main().catch(console.error);
