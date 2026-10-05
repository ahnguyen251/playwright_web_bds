import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/defaultUser.json' });
  const page = await context.newPage();

  page.on('request', req => {
    if (req.url().includes('chat') || req.url().includes('message')) {
      console.log('Chat Req:', req.method(), req.url());
      if (req.method() === 'POST') {
        console.log('Payload:', req.postData());
      }
    }
  });

  page.on('response', async res => {
    if (res.url().includes('chat') || res.url().includes('message')) {
      console.log('Chat Res:', res.status(), res.url());
      try {
        const text = await res.text();
        console.log('Body:', text.slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://propifyy.duckdns.org/listings/48', { waitUntil: 'networkidle' });
  
  // Click host chat button
  const hostChatBtn = page.locator('button[aria-label="Nhắn tin chủ nhà"]');
  console.log('Clicking chat button...');
  await hostChatBtn.click();
  await page.waitForTimeout(2000);

  // Check the message list in the chat window
  const messages = await page.locator('.chat-window-root .cm-bubble, .chat-window-root [class*="message"]').allInnerTexts();
  console.log('Messages count in room:', messages.length);
  console.log('Messages preview:', messages.slice(-5));

  // Check the textarea and send button
  const textarea = page.locator('.chat-window-root textarea.ci-input');
  console.log('Textarea visible:', await textarea.isVisible());

  const sendBtn = page.locator('.chat-window-root button.ci-send-btn');
  console.log('Send button visible:', await sendBtn.isVisible());
  console.log('Send button disabled when empty:', await sendBtn.isDisabled());

  // Type a test message and see if send button enables
  await textarea.fill('Hello test inspection');
  console.log('Send button disabled after fill:', await sendBtn.isDisabled());

  await browser.close();
}

main().catch(console.error);
