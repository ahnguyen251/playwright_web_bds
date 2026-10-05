import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const anonContext = await browser.newContext();
  const page = await anonContext.newPage();
  
  await page.goto('https://propifyy.duckdns.org/listings/48', { waitUntil: 'networkidle' });
  
  const hostChatBtn = page.locator('button[aria-label="Nhắn tin chủ nhà"]');
  console.log('Clicking "Nhắn tin chủ nhà"...');
  await hostChatBtn.click();
  await page.waitForTimeout(1000);

  // Check dialogs, modals, headings
  const dialogs = await page.locator('[role="dialog"], .modal, [class*="modal"], [class*="auth"]').evaluateAll(els => els.map(e => ({
    tag: e.tagName,
    role: e.getAttribute('role'),
    className: e.className,
    text: e.innerText.slice(0, 150)
  })));
  console.log('Dialogs / Modals present:', dialogs);

  const headings = await page.getByRole('heading').allInnerTexts();
  console.log('Headings on page:', headings);

  // Check if login form is visible
  const emailInput = page.getByPlaceholder(/Email/i);
  console.log('Email input visible:', await emailInput.isVisible());
  const passInput = page.getByPlaceholder(/Mật khẩu/i);
  console.log('Password input visible:', await passInput.isVisible());

  await browser.close();
}

main().catch(console.error);
