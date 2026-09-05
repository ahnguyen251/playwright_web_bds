# Assertions and Asynchronous Waits in Playwright

Guide to writing reliable assertions in `tests/`:

## 1. Web-First Auto-Retrying Assertions

Always prefer web-first assertions from `@playwright/test`. They automatically retry until timeout or success:

```typescript
// GOOD - auto-retries up to TIMEOUTS.assertion
await expect(page.getByRole('heading', { name: 'Danh sách tin đăng' })).toBeVisible();
await expect(loginPage.submitButton).toBeEnabled();
await expect(loginPage.errorMessage).toHaveText('Email hoặc mật khẩu không chính xác');
```

**Anti-Pattern**:
```typescript
// BAD - instant snapshot evaluation, causes race conditions
const isVisible = await page.getByRole('heading').isVisible();
expect(isVisible).toBe(true);
```

## 2. Polling for Dynamic State (`expect.poll`)

When an assertion depends on background network requests, server processing, or asynchronous DB changes:

```typescript
// GOOD - polls every 100ms up to timeout
await expect.poll(async () => loginPage.serverMessage()).not.toBe('');
await expect.poll(async () => listingPage.getCardCount()).toBeGreaterThan(0);
```

## 3. Request Observation

When asserting that an action does NOT trigger an unintended network request:

```typescript
const requestCount = await authRequestObserver.countDuring('login', () =>
  loginPage.submitFromPasswordField(),
);
expect(requestCount).toBe(0);
```

## 4. Prohibited Patterns

- Never use `await page.waitForTimeout(...)`.
- Never insert manual sleeps with `setTimeout`.
- If an element animation takes time, wait for specific state:
  `await locator.waitFor({ state: 'visible', timeout: TIMEOUTS.action })`.
