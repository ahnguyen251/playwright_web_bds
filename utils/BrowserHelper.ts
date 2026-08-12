import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BrowserContext } from '@playwright/test';

export class BrowserHelper {
  public static async saveStorageState(context: BrowserContext, path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await context.storageState({ path });
  }
}
