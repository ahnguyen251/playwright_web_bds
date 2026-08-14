import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

interface PackageManifest {
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
}

const packageManifest = (): PackageManifest =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as PackageManifest;

const authoritativeAuthenticationStatuses = Object.freeze({
  'TC-AUTH-REGISTER-001': 'Partial',
  'TC-AUTH-REGISTER-002': 'BLOCKED',
  'TC-AUTH-REGISTER-003': 'BLOCKED',
  'TC-AUTH-REGISTER-004': 'BLOCKED',
  'TC-AUTH-REGISTER-005': 'BLOCKED',
  'TC-AUTH-REGISTER-006': 'BLOCKED',
  'TC-AUTH-REGISTER-007': 'Partial',
  'TC-AUTH-REGISTER-008': 'Automated',
  'TC-AUTH-LOGIN-001': 'Automated',
  'TC-AUTH-LOGIN-002': 'BLOCKED',
  'TC-AUTH-LOGIN-003': 'BLOCKED',
  'TC-AUTH-LOGIN-004': 'Partial',
  'TC-AUTH-LOGIN-005': 'EXCLUDED',
  'TC-AUTH-FORGOT-001': 'Automated',
  'TC-AUTH-FORGOT-002': 'BLOCKED',
  'TC-AUTH-FORGOT-003': 'Partial',
} as const);

test('scopes safe authentication execution to non-external AUTH tests', () => {
  expect(packageManifest().scripts?.['test:auth']).toBe(
    'playwright test tests/authentication --grep-invert "@external|@mutating" --workers=2',
  );
});

test('runs approved external or mutating authentication serially', () => {
  expect(packageManifest().scripts?.['test:auth:external']).toBe(
    'playwright test tests/authentication --grep "@external|@mutating" --workers=1',
  );
});

test('documents one authoritative status row for every unified authentication case', () => {
  const traceability = readFileSync(
    resolve(process.cwd(), 'docs/traceability/requirements-to-tests.md'),
    'utf8',
  );

  for (const [id, status] of Object.entries(authoritativeAuthenticationStatuses)) {
    const matchingRows = traceability
      .split(/\r?\n/)
      .map((line) => line.split('|').map((cell) => cell.trim()))
      .filter((cells) => cells[1] === `\`${id}\``);

    expect(matchingRows, id).toHaveLength(1);
    expect(matchingRows[0]?.[2], id).toBe(status);
  }
});

test('pins the Google APIs client to the reviewed release', () => {
  expect(packageManifest().devDependencies?.googleapis).toBe('174.0.0');
});
