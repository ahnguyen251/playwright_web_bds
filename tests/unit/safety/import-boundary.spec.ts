import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

interface ImportProbeResult {
  readonly databaseOpenCount: number;
  readonly sentinelLoaded: boolean;
  readonly addedPaths: readonly string[];
}

const probePath = path.resolve(process.cwd(), 'tests/support/import-boundary-probe.cjs');
const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');

const runImportProbe = async (target: string): Promise<ImportProbeResult> => {
  const ownedRoot = await mkdtemp(path.join(tmpdir(), 'propify-import-boundary-'));
  await writeFile(path.join(ownedRoot, '.env'), 'IMPORT_BOUNDARY_SENTINEL=loaded\n', 'utf8');

  try {
    const targetPath = path.resolve(process.cwd(), target);
    return await new Promise<ImportProbeResult>((resolve, reject) => {
      const child = spawn(process.execPath, [probePath, targetPath], {
        cwd: ownedRoot,
        env: { ...process.env, TS_NODE_PROJECT: tsconfigPath },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });

      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, 10_000);

      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('close', (code) => {
        clearTimeout(timeout);
        if (timedOut) {
          reject(new Error(`Import did not exit, indicating a live resource: ${target}`));
          return;
        }
        if (code !== 0) {
          reject(new Error(`Import probe failed for ${target}: ${stderr || stdout}`));
          return;
        }
        resolve(JSON.parse(stdout.trim()) as ImportProbeResult);
      });
    });
  } finally {
    await rm(ownedRoot, { recursive: true });
  }
};

for (const target of [
  'config/environment.config.ts',
  'config/process-environment.config.ts',
  'database/sqlite.ts',
  'server/app.ts',
  'server/runtime.ts',
]) {
  test(`importing ${target} has no resource side effect`, async () => {
    expect(await runImportProbe(target)).toEqual({
      databaseOpenCount: 0,
      sentinelLoaded: false,
      addedPaths: [],
    });
  });
}
