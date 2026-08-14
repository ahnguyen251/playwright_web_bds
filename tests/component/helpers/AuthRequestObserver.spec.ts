import { expect, test } from '@playwright/test';

import { AuthRequestObserver } from '../../../helpers/network/AuthRequestObserver';
import { requireAcceptedRegistrationTransport } from '../../../helpers/network/RegistrationResponseContract';

const loginUrl = 'http://example.test/api/v1/auth/login';
const registrationUrl = 'http://example.test/api/v1/auth/register';

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

  const count = await observer.countDuring('forgotPassword', () => Promise.resolve(undefined));

  expect(count).toBe(0);
});

test('removes its request listener after counting', async ({ page }) => {
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'request');
  const observer = new AuthRequestObserver(page);

  await observer.countDuring('login', () => Promise.resolve(undefined));

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

test('counts only POST when GET and OPTIONS target the exact authentication path', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({ status: 204 });
  });
  const observer = new AuthRequestObserver(page);

  const count = await observer.countDuring('login', async () => {
    await page.evaluate(async (url) => {
      await fetch(url, { method: 'GET' }).catch(() => undefined);
      await fetch(url, { method: 'OPTIONS' }).catch(() => undefined);
      await fetch(url, { method: 'POST' }).catch(() => undefined);
    }, loginUrl);
  });

  expect(count).toBe(1);
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
      await fetch(url, { method: 'POST' }).catch(() => undefined);
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
          await fetch(url, { method: 'POST' }).catch(() => undefined);
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
    observer
      .waitForResponse('login', () => Promise.resolve(undefined))
      .catch((error: unknown) => error),
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
        await fetch(url, { method: 'POST' }).catch(() => undefined);
      }, loginUrl);
    }),
  ).rejects.toThrow('Unable to parse authentication response for login.');

  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});

test('observes only the POST response when GET and OPTIONS use the exact authentication path', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    const status = route.request().method() === 'POST' ? 401 : 204;
    await route.fulfill({ status });
  });
  const observer = new AuthRequestObserver(page);

  const response = await observer.waitForStatus('login', async () => {
    await page.evaluate(async (url) => {
      await fetch(url, { method: 'GET' }).catch(() => undefined);
      await fetch(url, { method: 'OPTIONS' }).catch(() => undefined);
      await fetch(url, { method: 'POST' }).catch(() => undefined);
    }, loginUrl);
  });

  expect(response).toEqual({ status: 401 });
});

test('accepts empty and non-JSON registration responses through the status-only contract', async ({
  page,
}) => {
  for (const responseCase of [
    { name: 'empty response', status: 202, body: '' },
    { name: 'non-JSON response', status: 201, body: 'accepted' },
  ] as const) {
    await test.step(responseCase.name, async () => {
      await page.route('**/api/v1/auth/register', async (route) => {
        await route.fulfill({
          status: responseCase.status,
          contentType: 'text/plain',
          body: responseCase.body,
        });
      });
      const eventEmitterPage = page as unknown as ListenerCountPage;
      const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
      const observer = new AuthRequestObserver(page);

      const status = await observer.waitForStatus('registration', async () => {
        await page.evaluate(async (url) => {
          await fetch(url, { method: 'POST' }).catch(() => undefined);
        }, registrationUrl);
      });

      expect(status).toEqual({ status: responseCase.status });
      expect(Object.keys(status)).toEqual(['status']);
      expect(
        requireAcceptedRegistrationTransport(status, {
          disabledObserved: true,
          loadingTextObserved: true,
        }),
      ).toEqual({ status: responseCase.status, submitTransitionObserved: true });
      expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
      await page.unroute('**/api/v1/auth/register');
    });
  }
});

test('status-only observation preserves action failures and removes its listener', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/register', async (route) => {
    await route.fulfill({ status: 202, contentType: 'text/plain', body: '' });
  });
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
  const observer = new AuthRequestObserver(page);
  const actionError = new Error('Expected status action failure');

  await expect(
    observer.waitForStatus('registration', async () => {
      await page.evaluate(async (url) => {
        await fetch(url, { method: 'POST' }).catch(() => undefined);
      }, registrationUrl);
      throw actionError;
    }),
  ).rejects.toBe(actionError);

  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});

test('status-only observation times out safely and removes its listener', async ({ page }) => {
  const eventEmitterPage = page as unknown as ListenerCountPage;
  const listenerCountBefore = listenerCount(eventEmitterPage, 'response');
  const observer = new AuthRequestObserver(page, 5);

  await expect(
    observer.waitForStatus('registration', () => Promise.resolve(undefined)),
  ).rejects.toThrow('Timed out waiting for registration response at /api/v1/auth/register.');

  expect(listenerCount(eventEmitterPage, 'response')).toBe(listenerCountBefore);
});
