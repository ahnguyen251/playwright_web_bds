import { expect, test } from '@playwright/test';

test('persistent expected no-page framework failure', ({ browserName }, testInfo) => {
  testInfo.fail(true, 'Expected framework failure without requesting a browser page.');

  expect(browserName).toBe('intentionally invalid browser name');
});
