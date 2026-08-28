import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

export interface TestArtifactWorkspace {
  readonly root: string;
  readonly evidenceRoot: string;
  readonly transientRoot: string;
  readonly outsideEvidenceRoot: string;
  cleanup(): Promise<void>;
}

export const createTestArtifactWorkspace = async (
  prefix: string,
): Promise<TestArtifactWorkspace> => {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const evidenceRoot = join(root, 'evidence');
  const transientRoot = join(root, 'test-results');
  const outsideEvidenceRoot = join(root, 'outside-evidence');
  await Promise.all([
    mkdir(evidenceRoot, { recursive: true }),
    mkdir(transientRoot, { recursive: true }),
    mkdir(outsideEvidenceRoot, { recursive: true }),
  ]);

  return {
    root,
    evidenceRoot,
    transientRoot,
    outsideEvidenceRoot,
    cleanup: async () => {
      const resolvedRoot = resolve(root);
      const resolvedTemporaryRoot = resolve(tmpdir());
      const relativeTarget = relative(resolvedTemporaryRoot, resolvedRoot);
      if (
        !relativeTarget ||
        relativeTarget === '..' ||
        relativeTarget.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
        isAbsolute(relativeTarget)
      ) {
        throw new Error('Refusing to remove a test workspace outside the temporary directory.');
      }
      await rm(resolvedRoot, { recursive: true, force: true });
    },
  };
};
