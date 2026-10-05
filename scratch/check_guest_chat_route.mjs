import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const anonContext = await browser.newContext();
  const page = await anonContext.newPage();
  
  await page.goto('https://propifyy.duckdns.org/chat', { waitUntil: 'networkidle' });
  console.log('Navigated to /chat as guest. Final URL:', page.url());

  const headings = await page.getByRole('heading').allInnerTexts();
  console.log('Headings on /chat:', headings);

  await browser.close();
}

main().catch(console.error);
