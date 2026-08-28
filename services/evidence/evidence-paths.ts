import crypto from 'node:crypto';
import path from 'node:path';

import type { ExecutionIdentity } from './evidence-contracts';

const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;
const WINDOWS_RESERVED_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;

const isSafeSegment = (value: string): boolean =>
  SAFE_SEGMENT_PATTERN.test(value) &&
  value !== '.' &&
  value !== '..' &&
  !value.endsWith('.') &&
  !value.endsWith(' ') &&
  !WINDOWS_RESERVED_PATTERN.test(value);

const hashText = (value: string): string =>
  crypto.createHash('sha256').update(value, 'utf8').digest('hex');

export const createExecutionKey = (identity: ExecutionIdentity): string => {
  const canonicalIdentity = JSON.stringify({
    version: 1,
    projectName: (identity.projectName ?? 'NO_PROJECT').normalize('NFC'),
    playwrightTestId: identity.playwrightTestId.normalize('NFC'),
    repeatEachIndex: identity.repeatEachIndex,
    retry: identity.retry,
  });

  return hashText(canonicalIdentity);
};

export const toSafeEvidenceSegment = (value: string | undefined, fallback: string): string => {
  const original = (value ?? fallback).normalize('NFC');
  if (isSafeSegment(original)) return original;

  let prefix = original
    .replace(/[^A-Za-z0-9._-]+/gu, '_')
    .replace(/^[^A-Za-z0-9]+/u, '')
    .replace(/[. ]+$/u, '');

  if (!prefix || WINDOWS_RESERVED_PATTERN.test(prefix)) {
    prefix = fallback
      .normalize('NFC')
      .replace(/[^A-Za-z0-9._-]+/gu, '_')
      .replace(/^[^A-Za-z0-9]+/u, '')
      .replace(/[. ]+$/u, '');
  }
  if (!prefix || WINDOWS_RESERVED_PATTERN.test(prefix)) prefix = 'SEGMENT';

  const suffix = hashText(original).slice(0, 12);
  return `${prefix.slice(0, 66)}--${suffix}`;
};

const assertRelativeSegments = (value: string): readonly string[] => {
  if (
    !value ||
    value.includes('\0') ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value)
  ) {
    throw new Error('Evidence path must be a non-empty POSIX relative path.');
  }

  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Evidence path contains an invalid segment.');
  }

  return segments;
};

export const assertPersistentRelativePath = (value: string, runId: string): void => {
  const segments = assertRelativeSegments(value);
  if (segments.length < 2 || segments[0] !== runId) {
    throw new Error('Evidence path must start with the finalized run ID.');
  }
};

export const resolveContainedPath = (root: string, relativePath: string): string => {
  assertRelativeSegments(relativePath);

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relativeToRoot = path.relative(resolvedRoot, resolvedPath);
  const outsideRoot =
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot);

  if (outsideRoot) throw new Error('Evidence path resolves outside EVIDENCE_ROOT.');
  return resolvedPath;
};
