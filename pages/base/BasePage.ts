import type { Page } from '@playwright/test';

import { TIMEOUTS } from '../../constants/timeouts';

export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.navigation });
  }

  public currentUrl(): string {
    return this.page.url();
  }

  public async captureScreenshot(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: true });
  }
}
