import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  console.log('--- 1. Inspecting /profile?tab=transactions ---');
  await page.goto('https://propifyy.duckdns.org/profile?tab=transactions', { waitUntil: 'networkidle' });
  console.log('Page URL:', page.url());

  const headingText = await page.getByRole('heading').allInnerTexts();
  console.log('Headings:', headingText);

  // Look for cards, stats, tables
  const statsCards = await page.locator('.stat-card, .overview-card, [class*="card"], [class*="stat"]').allInnerTexts();
  console.log('Stats cards count:', statsCards.length);
  console.log('Stats cards preview:', statsCards.slice(0, 5));

  const tableHeaders = await page.locator('table th').allInnerTexts();
  console.log('Table Headers:', tableHeaders);

  const tableRows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Table Rows count:', tableRows.length);
  if (tableRows.length > 0) {
    console.log('First 3 rows:\n', tableRows.slice(0, 3).join('\n---\n'));
  }

  const buttons = await page.locator('button').allInnerTexts();
  console.log('Buttons on transaction page:', buttons);

  const inputs = await page.locator('input, select').evaluateAll(els => els.map(el => ({
    tag: el.tagName,
    type: el.type,
    name: el.name,
    id: el.id,
    placeholder: el.placeholder,
    value: el.value,
    options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => o.text) : undefined
  })));
  console.log('Inputs & selects:', JSON.stringify(inputs, null, 2));

  console.log('\n--- 2. Inspecting Listing Detail and Chat button ---');
  await page.goto('https://propifyy.duckdns.org/', { waitUntil: 'networkidle' });
  
  // Find a listing card link
  const listingLinks = await page.locator('a[href^="/listings/"]').evaluateAll(els => els.map(e => e.getAttribute('href')));
  console.log('Found listing links:', listingLinks.slice(0, 5));

  if (listingLinks.length > 0) {
    const firstLink = listingLinks[0];
    await page.goto(`https://propifyy.duckdns.org${firstLink}`, { waitUntil: 'networkidle' });
    console.log('Navigated to listing detail:', page.url());

    const detailButtons = await page.locator('button').allInnerTexts();
    console.log('Detail buttons:', detailButtons);

    const chatBtn = page.getByRole('button', { name: /Nhắn tin|Chat/i });
    console.log('Chat button count:', await chatBtn.count());
    if (await chatBtn.count() > 0) {
      console.log('Chat button text:', await chatBtn.first().innerText());
      console.log('Chat button visible:', await chatBtn.first().isVisible());
      
      // Let's see what happens when clicking Chat button
      console.log('Clicking Chat button...');
      await chatBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('After chat click URL:', page.url());
      
      // Check if chat drawer / modal / window opened
      const chatElements = await page.locator('[class*="chat"], [class*="message"], [role="dialog"]').evaluateAll(els => els.map(el => ({
        tag: el.tagName,
        className: el.className,
        role: el.getAttribute('role'),
        textSnippet: el.innerText ? el.innerText.slice(0, 100) : ''
      })));
      console.log('Chat elements found:', chatElements);
    }
  }

  // Also check unauthenticated behavior on listing detail
  console.log('\n--- 3. Inspecting unauthenticated Chat click ---');
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  if (listingLinks.length > 0) {
    await anonPage.goto(`https://propifyy.duckdns.org${listingLinks[0]}`, { waitUntil: 'networkidle' });
    const anonChatBtn = anonPage.getByRole('button', { name: /Nhắn tin|Chat/i });
    if (await anonChatBtn.count() > 0) {
      await anonChatBtn.first().click();
      await anonPage.waitForTimeout(2000);
      console.log('Anon after chat click URL:', anonPage.url());
    }
  }

  await browser.close();
}

main().catch(console.error);
