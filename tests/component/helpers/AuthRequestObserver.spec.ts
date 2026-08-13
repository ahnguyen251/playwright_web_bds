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

test('removes its response listener after returning a snapshot', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
  const observer = new AuthRequestObserver(page);

  await observer.waitForResponse('login', async () => {
    await page.evaluate(async (url) => {
      await fetch(url).catch(() => undefined);
    }, loginUrl);
  });

  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});

test('removes its response listener and preserves an action failure', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'not-json' });
  });
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
  const observer = new AuthRequestObserver(page);
  const actionError = new Error('Expected action failure');
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    unhandledRejections.push(reason);
  };

  process.on('unhandledRejection', onUnhandledRejection);
  try {
    await expect(
      observer.waitForResponse('login', async () => {
        await page.evaluate(async (url) => {
          await fetch(url).catch(() => undefined);
        }, loginUrl);
        throw actionError;
      }),
    ).rejects.toBe(actionError);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }

  expect(unhandledRejections).toEqual([]);
  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});

test('times out with only the operation path when no response occurs', async ({ page }) => {
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
  const observer = new AuthRequestObserver(page, 5);
  const testGuard = 'test timeout guard';

  const result = await Promise.race([
    observer.waitForResponse('login', async () => undefined).catch((error: unknown) => error),
    new Promise<string>((resolve) => {
      setTimeout(() => resolve(testGuard), 50);
    }),
  ]);

  expect(result).toBeInstanceOf(Error);
  if (!(result instanceof Error)) {
    throw new Error('Expected the observer timeout to reject with an Error.');
  }
  expect(result.message).toBe('Timed out waiting for login response at /api/v1/auth/login.');
  expect(result.message).not.toContain('example.test');
  expect(result.message).not.toContain('?');
  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});

test('rejects invalid JSON without exposing the response body', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'not-json' });
  });
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
  const observer = new AuthRequestObserver(page);

  await expect(
    observer.waitForResponse('login', async () => {
      await page.evaluate(async (url) => {
        await fetch(url).catch(() => undefined);
      }, loginUrl);
    }),
  ).rejects.toThrow('Unable to parse authentication response for login.');

  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});
