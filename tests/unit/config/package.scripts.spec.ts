import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

interface PackageManifest {
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
}

const packageManifest = (): PackageManifest =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as PackageManifest;

test('caps safe multi-browser authentication execution at two parallel workers', () => {
  const manifest = packageManifest();
  const authenticationCommand = manifest.scripts?.['test:auth'];
  const workerOptions = authenticationCommand
    ?.trim()
    .split(/\s+/)
    .filter((token) => token.startsWith('--workers'));

  expect(workerOptions).toEqual(['--workers=2']);
});

test('pins the Google APIs client to the reviewed release', () => {
  expect(packageManifest().devDependencies?.googleapis).toBe('174.0.0');
});
