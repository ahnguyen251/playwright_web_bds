const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://propifyy.duckdns.org/');
  
  // Login
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByLabel('Email của bạn').fill('ngocanh25102004@gmail.com');
  await page.getByLabel('Mật khẩu').fill('Anh!12345');
  await page.getByRole('button', { name: 'Đăng nhập' }).nth(1).click();
  
  // Wait for login
  await page.waitForNavigation();
  
  // Go to post-listing
  await page.goto('https://propifyy.duckdns.org/post-listing');
  await page.waitForTimeout(3000); // Wait for form to load
  
  // Dump HTML
  const html = await page.content();
  fs.writeFileSync('dom_dump.html', html);
  
  await browser.close();
})();
