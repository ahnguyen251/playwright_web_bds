import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const checkIgnore = (candidate: string) =>
  spawnSync('git', ['check-ignore', '--no-index', '--', candidate], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

for (const candidate of [
  'data/new-runtime.db',
  'data/new-runtime.db-wal',
  'data/new-runtime.db-shm',
  '.temp-worker.db',
  '.temp-worker.db-wal',
  '.temp-worker.db-shm',
]) {
  test(`ignores ${candidate}`, () => {
    const result = checkIgnore(candidate);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });
}

test('does not hide a deliberate database source file', () => {
  const result = checkIgnore('database/schema.ts');
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
});

test('declares one non-secret persistent evidence root in the environment example', () => {
  const environmentExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');
  const evidenceLines = environmentExample
    .split(/\r?\n/u)
    .filter((line) => line.startsWith('EVIDENCE_ROOT='));

  expect(evidenceLines).toEqual(['EVIDENCE_ROOT=evidence']);
});

test('ignores only the repository-root evidence archive', () => {
  const rootArchive = checkIgnore('evidence/RUN-20260827000000-abcd/run-result.json');
  const nestedEvidence = checkIgnore('examples/evidence/keep.md');
  const serviceSource = checkIgnore('services/evidence/EvidenceArchiveService.ts');

  expect(rootArchive.error).toBeUndefined();
  expect(rootArchive.status).toBe(0);
  expect(nestedEvidence.status).toBe(1);
  expect(serviceSource.status).toBe(1);
});
