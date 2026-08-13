import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BrowserContext } from '@playwright/test';

import { AUTH_COOKIE_NAMES } from '../constants/authentication';

export class BrowserHelper {
  public static async hasAuthenticationCookies(context: BrowserContext): Promise<boolean> {
    const cookies = await context.cookies();

    return AUTH_COOKIE_NAMES.every((name) => cookies.some((cookie) => cookie.name === name));
  }

  public static async saveStorageState(context: BrowserContext, path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await context.storageState({ path });
  }
}
