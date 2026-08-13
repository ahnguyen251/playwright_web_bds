import { expect, test } from '@playwright/test';

import { AuthRequestObserver } from '../../../helpers/network/AuthRequestObserver';

const loginUrl = 'http://example.test/api/v1/auth/login';

interface ListenerCountPage {
  listenerCount(event: string): number;
}

const listenerCount = (page: ListenerCountPage, event: string): number => page.listenerCount(event);

test('counts one login request made during an action', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"message":"rejected"}',
    });
  });
  const observer = new AuthRequestObserver(page);

  const count = await observer.countDuring('login', async () => {
    await page.evaluate(async (url) => {
      await fetch(url, { method: 'POST' }).catch(() => undefined);
    }, loginUrl);
  });

  expect(count).toBe(1);
});

test('counts no matching request when an action makes none', async ({ page }) => {
  const observer = new AuthRequestObserver(page);

  const count = await observer.countDuring('forgotPassword', async () => undefined);

  expect(count).toBe(0);
});

test('removes its request listener after counting', async ({ page }) => {
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'request');
  const observer = new AuthRequestObserver(page);

  await observer.countDuring('login', async () => undefined);

  expect(listenerCount(eventEmitterPage, 'request')).toBe(listenerCountBefore);
});

test('does not count a path that only contains the login path', async ({ page }) => {
  await page.route('**/api/v1/auth/login-history', async (route) => {
    await route.fulfill({ status: 200, body: '{}' });
  });
  const observer = new AuthRequestObserver(page);

  const count = await observer.countDuring('login', async () => {
    await page.evaluate(async () => {
      await fetch('http://example.test/api/v1/auth/login-history').catch(() => undefined);
    });
  });

  expect(count).toBe(0);
});

test('returns only the status and parsed body for an authentication response', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"message":"rejected"}',
    });
  });
  const observer = new AuthRequestObserver(page);

  const response = await observer.waitForResponse('login', async () => {
    await page.evaluate(async (url) => {
      await fetch(url, { method: 'POST' }).catch(() => undefined);
    }, loginUrl);
  });

  expect(response).toEqual({ status: 401, body: { message: 'rejected' } });
  expect(Object.keys(response).sort()).toEqual(['body', 'status']);
});
