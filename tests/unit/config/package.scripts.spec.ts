import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

interface PackageManifest {
  readonly scripts?: Readonly<Record<string, string>>;
}

test('caps safe multi-browser authentication execution at two parallel workers', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as PackageManifest;

  expect(manifest.scripts?.['test:auth']).toContain('--workers=2');
});
