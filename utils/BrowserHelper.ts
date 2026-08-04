import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

export class BrowserHelper {
  public static async waitForDocumentReady(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
  }

  public static async saveStorageState(context: BrowserContext, path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await context.storageState({ path });
  }
}
