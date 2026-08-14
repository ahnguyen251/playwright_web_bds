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
  
  await page.waitForNavigation();
  await page.goto('https://propifyy.duckdns.org/post-listing');
  await page.waitForTimeout(3000);
  
  // Get all labels
  const labels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('label, .label, p')).map(e => e.innerText).filter(t => t.trim().length > 0);
  });
  
  fs.writeFileSync('labels.json', JSON.stringify(labels, null, 2));
  await browser.close();
})();
