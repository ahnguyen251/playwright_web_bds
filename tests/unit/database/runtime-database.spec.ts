import path from 'node:path';
import { expect, test } from '@playwright/test';

import { resolveRuntimeDatabasePath } from '../../../database/runtime-database';

test('uses the backward-compatible local reporting database path', () => {
  expect(resolveRuntimeDatabasePath(undefined, 'D:\\workspace')).toBe(
    path.resolve('D:\\workspace', 'data', 'autotest.db'),
  );
});

test('resolves an explicit relative database path from the supplied cwd', () => {
  expect(resolveRuntimeDatabasePath('runtime/reporting.db', 'D:\\workspace')).toBe(
    path.resolve('D:\\workspace', 'runtime', 'reporting.db'),
  );
});
