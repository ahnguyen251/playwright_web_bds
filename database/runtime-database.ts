import path from 'node:path';

export const resolveRuntimeDatabasePath = (
  configuredPath: string | undefined,
  cwd: string = process.cwd(),
): string => path.resolve(cwd, configuredPath ?? path.join('data', 'autotest.db'));
