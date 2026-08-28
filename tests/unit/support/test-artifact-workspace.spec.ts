import { expect, test } from '@playwright/test';
import { access, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTestArtifactWorkspace } from '../../support/test-artifact-workspace';

test.describe('test artifact workspace', () => {
  test('creates unique sibling roots under one owned OS-temp parent', async () => {
    const first = await createTestArtifactWorkspace('propify-artifacts-');
    const second = await createTestArtifactWorkspace('propify-artifacts-');

    try {
      expect(first.root).not.toBe(second.root);
      expect(dirname(first.evidenceRoot)).toBe(first.root);
      expect(dirname(first.outsideEvidenceRoot)).toBe(first.root);
      expect(first.root.startsWith(tmpdir())).toBe(true);
    } finally {
      await Promise.all([first.cleanup(), second.cleanup()]);
    }
  });

  test('cleanup removes only the exact owned parent', async () => {
    const workspace = await createTestArtifactWorkspace('propify-artifacts-');
    const sibling = await createTestArtifactWorkspace('propify-artifacts-sibling-');
    await writeFile(join(workspace.evidenceRoot, 'owned.txt'), 'owned', 'utf8');
    await writeFile(join(sibling.evidenceRoot, 'sibling.txt'), 'sibling', 'utf8');

    try {
      await workspace.cleanup();
      await expect(access(workspace.root)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(access(join(sibling.evidenceRoot, 'sibling.txt'))).resolves.toBeUndefined();
    } finally {
      await sibling.cleanup();
    }
  });
});
