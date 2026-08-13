import { expect, test } from '@playwright/test';

import { AUTH_COOKIE_NAMES } from '../../../constants/authentication';
import { BrowserHelper } from '../../../utils/BrowserHelper';

test('reports authenticated when both required cookie names are present', async ({ context }) => {
  await context.addCookies(
    AUTH_COOKIE_NAMES.map((name) => ({
      name,
      value: crypto.randomUUID(),
      domain: 'example.test',
      path: '/',
    })),
  );

  await expect(BrowserHelper.hasAuthenticationCookies(context)).resolves.toBe(true);
});

test('reports unauthenticated when one required cookie name is absent', async ({ context }) => {
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAMES[0],
      value: crypto.randomUUID(),
      domain: 'example.test',
      path: '/',
    },
  ]);

  await expect(BrowserHelper.hasAuthenticationCookies(context)).resolves.toBe(false);
});
