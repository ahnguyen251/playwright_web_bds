import { join } from 'node:path';
import { test as base, type BrowserContext } from '@playwright/test';

import { UserDataFactory } from '../test-data/factories/UserDataFactory';
import type { UserCredentials } from '../types/user.types';

export interface AuthFixtures {
  readonly defaultUser: UserCredentials;
  readonly contextForUser: (alias: string) => Promise<BrowserContext>;
}

export const authTest = base.extend<AuthFixtures>({
  defaultUser: async ({}, use) => {
    await use(UserDataFactory.getCredentials('defaultUser'));
  },
  contextForUser: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    const contextFactory = async (alias: string): Promise<BrowserContext> => {
      UserDataFactory.getRecord(alias);
      const context = await browser.newContext({
        storageState: join('.auth', `${alias}.json`),
      });
      contexts.push(context);
      return context;
    };

    await use(contextFactory);
    await Promise.all(contexts.map((context) => context.close()));
  },
});
