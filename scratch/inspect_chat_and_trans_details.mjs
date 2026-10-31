import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Inspect unauthenticated chat click behavior
  console.log('--- 1. Testing Unauthenticated Chat Click ---');
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();

  anonPage.on('dialog', dialog => {
    console.log('Dialog opened:', dialog.type(), dialog.message());
  });
  anonPage.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log('Browser console:', msg.type(), msg.text());
    }
  });

  await anonPage.goto('https://propifyy.duckdns.org/listings/49', { waitUntil: 'networkidle' });

  // Find all buttons on the page and identify which one is the chat button
  const allButtons = await anonPage.locator('button').evaluateAll(els => els.map(b => ({
    text: b.innerText,
    className: b.className,
    ariaLabel: b.getAttribute('aria-label'),
    title: b.title,
    html: b.outerHTML.slice(0, 150)
  })));
  console.log('All buttons on detail page:', JSON.stringify(allButtons, null, 2));

  // Find the button that opens chat
  // In the previous log, `chat-fab` or one of the empty buttons was clicked
  const chatFab = anonPage.locator('.chat-fab, button[title*="nhắn tin" i], button[aria-label*="nhắn tin" i]');
  console.log('Chat FAB count:', await chatFab.count());

  // Also look for button with message icon or text in the contact card
  const contactCardButtons = await anonPage.locator('section, aside, .contact-card, [class*="contact"]').locator('button').evaluateAll(els => els.map(b => ({
    text: b.innerText,
    className: b.className,
    html: b.outerHTML
  })));
  console.log('Contact card buttons:', JSON.stringify(contactCardButtons, null, 2));

  // Let's see what happens when clicking the chat button in contact section or chat fab
  console.log('\n--- 2. Inspecting Chat Window DOM when authenticated ---');
  const authContext = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const authPage = await authContext.newPage();
  await authPage.goto('https://propifyy.duckdns.org/listings/49', { waitUntil: 'networkidle' });

  // Look for chat button
  const authButtons = await authPage.locator('button').evaluateAll(els => els.map(b => ({
    text: b.innerText,
    className: b.className,
    html: b.outerHTML.slice(0, 150)
  })));

  // Click chat button / fab
  const chatTrigger = authPage.locator('button.chat-fab, button:has(svg):has-text("Nhắn tin"), button:has-text("Nhắn tin")');
  console.log('Auth chat trigger count:', await chatTrigger.count());
  if (await chatTrigger.count() > 0) {
    await chatTrigger.first().click();
    await authPage.waitForTimeout(1500);

    // Inspect the chat window structure
    const chatWindowHtml = await authPage.locator('.chat-window-root, [class*="chat-window"]').first().evaluate(el => el.outerHTML);
    console.log('Chat window HTML (first 1000 chars):\n', chatWindowHtml.slice(0, 1000));

    // Find inputs, send buttons, message list in chat window
    const chatInputs = await authPage.locator('.chat-window-root input, .chat-window-root textarea').evaluateAll(els => els.map(e => ({
      tag: e.tagName,
      placeholder: e.placeholder,
      className: e.className
    })));
    console.log('Chat inputs:', chatInputs);

    const chatActionButtons = await authPage.locator('.chat-window-root button').evaluateAll(els => els.map(e => ({
      text: e.innerText,
      className: e.className,
      ariaLabel: e.getAttribute('aria-label')
    })));
    console.log('Chat action buttons:', chatActionButtons);
  }

  // 3. Inspect Transaction page source & JS bundle for overview cards & filters
  console.log('\n--- 3. Inspecting Transaction Vue components in bundle ---');
  await authPage.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });

  // Find scripts loaded
  const scriptSrcs = await authPage.locator('script[src]').evaluateAll(els => els.map(e => e.src));
  console.log('Script sources:', scriptSrcs);

  // Search in page HTML for any transaction overview or table classes
  const fullHtml = await authPage.content();
  console.log('Transactions tab HTML length:', fullHtml.length);
  // Check if overview card words exist
  const hasThanhCong = fullHtml.includes('Thành công');
  const hasChoThanhToan = fullHtml.includes('Chờ thanh toán');
  const hasTongChi = fullHtml.includes('Tổng chi');
  console.log('Keywords in transactions HTML:', { hasThanhCong, hasChoThanhToan, hasTongChi });

  await browser.close();
}

main().catch(console.error);
