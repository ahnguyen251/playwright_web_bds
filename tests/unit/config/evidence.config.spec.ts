import path from 'node:path';
import { expect, test } from '@playwright/test';

import { resolveEvidenceConfiguration } from '../../../config/evidence.config';

test('defaults persistent evidence to a dedicated evidence directory', () => {
  const workspace = path.resolve('D:/isolated/workspace');

  expect(resolveEvidenceConfiguration({}, workspace)).toEqual({
    root: path.join(workspace, 'evidence'),
  });
});

test('resolves a configured relative evidence root from the workspace', () => {
  const workspace = path.resolve('D:/isolated/workspace');

  expect(
    resolveEvidenceConfiguration({ EVIDENCE_ROOT: 'runtime/persistent-evidence' }, workspace),
  ).toEqual({
    root: path.join(workspace, 'runtime', 'persistent-evidence'),
  });
});

test('preserves a configured absolute evidence root', () => {
  const workspace = path.resolve('D:/isolated/workspace');
  const archive = path.resolve('D:/isolated/archive');

  expect(resolveEvidenceConfiguration({ EVIDENCE_ROOT: archive }, workspace)).toEqual({
    root: archive,
  });
});

test('rejects broad and transient evidence roots', () => {
  const workspace = path.resolve('D:/isolated/workspace');
  const filesystemRoot = path.parse(workspace).root;

  for (const evidenceRoot of [
    filesystemRoot,
    workspace,
    path.join(workspace, 'test-results'),
    path.join(workspace, 'test-results', 'archive'),
  ]) {
    expect(() => resolveEvidenceConfiguration({ EVIDENCE_ROOT: evidenceRoot }, workspace)).toThrow(
      /EVIDENCE_ROOT/u,
    );
  }
});
