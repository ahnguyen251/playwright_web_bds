import type { Page, TestInfo } from '@playwright/test';

const safeName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export class ScreenshotHelper {
  public static async capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(safeName(name) || 'screenshot', {
      body: screenshot,
      contentType: 'image/png',
    });
  }
}
