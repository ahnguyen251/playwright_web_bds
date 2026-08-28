import path from 'node:path';

export interface EvidenceConfiguration {
  readonly root: string;
}

const isSamePath = (left: string, right: string): boolean => {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
};

const isContainedBy = (parent: string, candidate: string): boolean => {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
};

export const resolveEvidenceConfiguration = (
  source: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): EvidenceConfiguration => {
  const workspaceRoot = path.resolve(cwd);
  const configuredValue = source.EVIDENCE_ROOT?.trim();
  const configuredRoot =
    configuredValue && configuredValue.length > 0 ? configuredValue : 'evidence';
  const evidenceRoot = path.resolve(workspaceRoot, configuredRoot);
  const filesystemRoot = path.parse(evidenceRoot).root;
  const transientRoot = path.resolve(workspaceRoot, 'test-results');

  if (
    isSamePath(evidenceRoot, filesystemRoot) ||
    isSamePath(evidenceRoot, workspaceRoot) ||
    isContainedBy(transientRoot, evidenceRoot)
  ) {
    throw new Error(
      'EVIDENCE_ROOT phải là thư mục lưu trữ riêng, không phải workspace, filesystem root hoặc test-results.',
    );
  }

  return Object.freeze({ root: evidenceRoot });
};
