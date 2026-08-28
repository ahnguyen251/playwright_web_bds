import { expect } from '@playwright/test';

import { evidenceTest as test } from '../../fixtures/evidence.fixture';

const markdownPayload =
  '# Error context\n\n<img src=x onerror=alert("persisted")>\n<script>window.evidencePwned=true</script>';

test('persistent expected browser failure', async ({ page }, testInfo) => {
  testInfo.fail(true, 'Expected failure probe for persistent screenshot evidence.');
  await page.setContent('<main><h1>actual expected-failure page</h1></main>');
  await testInfo.attach('error-context.md', {
    body: Buffer.from(markdownPayload, 'utf8'),
    contentType: 'text/markdown',
  });

  expect(await page.textContent('h1')).toBe('intentionally different text');
});

test('persistent unexpected browser failure', async ({ page }) => {
  await page.setContent('<main><h1>unexpected-failure page</h1></main>');

  expect(await page.textContent('h1')).toBe('intentionally different text');
});
