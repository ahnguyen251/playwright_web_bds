import crypto from 'node:crypto';
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { allTestCases } from '../test-cases';
import type { TestCaseDefinition } from '../types/test-case.types';
import { TestCaseRegistry } from '../utils/TestCaseRegistry';
import {
  buildBusinessPlaywrightArgs,
  createBusinessCatalogSelection,
} from '../utils/business-test-selection';

type SpawnBusinessProcess = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => ChildProcess;

export interface BusinessRunnerOptions {
  readonly args?: readonly string[];
  readonly testCases?: readonly TestCaseDefinition[];
  readonly now?: () => Date;
  readonly randomSuffix?: () => string;
  readonly playwrightCli?: string;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly spawnProcess?: SpawnBusinessProcess;
  readonly log?: (message: string) => void;
  readonly error?: (message: string) => void;
  readonly setExitCode?: (code: number) => void;
}

export const runBusinessTests = (options: BusinessRunnerOptions = {}): ChildProcess => {
  const now = options.now?.() ?? new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const randomSuffix = options.randomSuffix?.() ?? crypto.randomBytes(2).toString('hex');
  const runId = `BUSINESS-RUN-${timestamp}-${randomSuffix}`;
  const testCases = options.testCases ?? allTestCases;
  const forwardedArgs = options.args ?? process.argv.slice(2);
  const playwrightCli = options.playwrightCli ?? require.resolve('@playwright/test/cli');
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const spawnProcess: SpawnBusinessProcess =
    options.spawnProcess ??
    ((command, args, spawnOptions) => spawn(command, [...args], spawnOptions));
  const log = options.log ?? ((message: string) => console.log(message));
  const error = options.error ?? ((message: string) => console.error(message));
  const setExitCode =
    options.setExitCode ??
    ((code: number) => {
      process.exitCode = code;
    });

  new TestCaseRegistry().validate(testCases);
  const selection = createBusinessCatalogSelection(testCases);
  const playwrightArgs = buildBusinessPlaywrightArgs(selection, forwardedArgs);

  log('\n=== Đường cơ sở độ bao phủ nghiệp vụ ===');
  log(`Số ID trong catalog: ${String(selection.CatalogTotal)}`);
  log(`Số ID đã tự động hóa: ${String(selection.AutomatedIds.length)}`);
  log(`Số ID chưa tự động hóa: ${String(selection.NotAutomatedIds.length)}`);
  log(`Danh sách ID chưa tự động hóa: ${selection.NotAutomatedIds.join(', ')}`);

  const child = spawnProcess(process.execPath, [playwrightCli, ...playwrightArgs], {
    cwd,
    env: {
      ...env,
      BUSINESS_TEST_RUN: 'true',
      BUSINESS_RUN_ID: runId,
    },
    shell: false,
    stdio: 'inherit',
  });

  child.on('error', (spawnError) => {
    error(`Không thể khởi động lần chạy kiểm thử nghiệp vụ bằng Playwright: ${spawnError.message}`);
    setExitCode(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      error(`Playwright business run interrupted by signal ${signal}.`);
      setExitCode(1);
      return;
    }
    setExitCode(code ?? 1);
  });

  return child;
};

if (require.main === module) {
  runBusinessTests();
}
