import { test as base, type TestStatus } from '@playwright/test';

const screenshotCaptureError = 'Unable to capture expected-failure screenshot.';

export interface ExpectedFailureScreenshotPage {
  screenshot(options: { readonly fullPage: true; readonly type: 'png' }): Promise<Buffer>;
}

export interface ExpectedFailureScreenshotTestInfo {
  readonly status?: TestStatus;
  readonly expectedStatus: TestStatus;
  attach(
    name: string,
    attachment: { readonly body: Buffer; readonly contentType: string },
  ): Promise<void>;
}

export const attachExpectedFailureScreenshot = async (
  page: ExpectedFailureScreenshotPage,
  testInfo: ExpectedFailureScreenshotTestInfo,
): Promise<void> => {
  if (testInfo.status !== 'failed' || testInfo.expectedStatus !== 'failed') return;

  try {
    const body = await page.screenshot({ fullPage: true, type: 'png' });
    await testInfo.attach('expected-failure-screenshot', {
      body,
      contentType: 'image/png',
    });
  } catch {
    try {
      await testInfo.attach('expected-failure-screenshot-error', {
        body: Buffer.from(screenshotCaptureError, 'utf8'),
        contentType: 'text/plain',
      });
    } catch {
      // Evidence capture must never change the authoritative test result.
    }
  }
};

export const evidenceTest = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    await attachExpectedFailureScreenshot(page, testInfo);
  },
});
