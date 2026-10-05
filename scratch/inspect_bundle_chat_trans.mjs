import { chromium } from 'playwright';
import fs from 'node:fs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Check unauthenticated click on aria-label="Nhắn tin chủ nhà"
  console.log('--- Checking unauthenticated click on aria-label="Nhắn tin chủ nhà" ---');
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();
  
  anonPage.on('dialog', dialog => {
    console.log('Dialog:', dialog.message());
  });

  await anonPage.goto('https://propifyy.duckdns.org/listings/48', { waitUntil: 'networkidle' });
  const hostChatBtn = anonPage.locator('button[aria-label="Nhắn tin chủ nhà"]');
  console.log('Host chat button count:', await hostChatBtn.count());
  
  if (await hostChatBtn.count() > 0) {
    // Listen for navigation or toast
    console.log('Clicking "Nhắn tin chủ nhà" as guest...');
    await hostChatBtn.click();
    await anonPage.waitForTimeout(2000);
    console.log('Anon Page URL after click:', anonPage.url());
    
    // Check for toasts or modals
    const toasts = await anonPage.locator('.toast-item, [role="alert"], [class*="toast"]').allInnerTexts();
    console.log('Toasts after click:', toasts);
  }

  // 2. Authenticated click on aria-label="Nhắn tin chủ nhà"
  console.log('\n--- Checking authenticated click on aria-label="Nhắn tin chủ nhà" ---');
  const authContext = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const authPage = await authContext.newPage();
  await authPage.goto('https://propifyy.duckdns.org/listings/48', { waitUntil: 'networkidle' });
  
  const authHostChatBtn = authPage.locator('button[aria-label="Nhắn tin chủ nhà"]');
  if (await authHostChatBtn.count() > 0) {
    console.log('Clicking "Nhắn tin chủ nhà" as auth user...');
    await authHostChatBtn.click();
    await authPage.waitForTimeout(2000);
    console.log('Auth Page URL after click:', authPage.url());
    
    const activeChat = await authPage.locator('.chat-window-root').evaluateAll(els => els.map(e => e.outerHTML));
    if (activeChat.length > 0) {
      console.log('Active chat window innerText:\n', await authPage.locator('.chat-window-root').first().innerText());
      
      const inputs = await authPage.locator('.chat-window-root textarea, .chat-window-root input').evaluateAll(els => els.map(e => ({
        tag: e.tagName,
        placeholder: e.placeholder,
        class: e.className
      })));
      console.log('Active chat room inputs:', inputs);

      const buttons = await authPage.locator('.chat-window-root button').evaluateAll(els => els.map(e => ({
        text: e.innerText,
        class: e.className,
        title: e.title
      })));
      console.log('Active chat room buttons:', buttons);
    }
  }

  // 3. Inspect JS bundle for Transactions and Chat
  console.log('\n--- Inspecting JS bundle ---');
  const res = await anonPage.request.get('https://propifyy.duckdns.org/assets/index-Cg0ltatH.js');
  const jsText = await res.text();
  console.log('Bundle length:', jsText.length);

  // Search transactions component
  const transIndex = jsText.indexOf('Lịch sử giao dịch');
  if (transIndex !== -1) {
    console.log('Transaction snippet from bundle:');
    console.log(jsText.slice(Math.max(0, transIndex - 200), transIndex + 1200));
  }

  // Search "Nhắn tin chủ nhà" in bundle
  const chatIndex = jsText.indexOf('Nhắn tin chủ nhà');
  if (chatIndex !== -1) {
    console.log('\nChat snippet from bundle:');
    console.log(jsText.slice(Math.max(0, chatIndex - 400), chatIndex + 600));
  }

  await browser.close();
}

main().catch(console.error);
