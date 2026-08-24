import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { expect, test } from '@playwright/test';
import { runBusinessTests } from '../../../scripts/run-business-tests';
import type { TestCaseDefinition } from '../../../types/test-case.types';

const catalog: readonly TestCaseDefinition[] = [
  {
    id: 'TC-A-001',
    title: 'Catalog case',
    module: 'Test',
    priority: 'medium',
    tags: [],
    preconditions: [],
    expectedResult: 'deterministic result',
    automation: {
      status: 'AUTOMATED',
      scriptPath: 'tests/unit/scripts/run-business-tests.spec.ts',
    },
  },
];

test('forwards a nonzero Playwright child exit code without launching the live suite', () => {
  const child = new EventEmitter() as unknown as ChildProcess;
  const exitCodes: number[] = [];
  let spawnedArgs: readonly string[] = [];
  let spawnedOptions: SpawnOptions | undefined;

  runBusinessTests({
    args: ['--list'],
    testCases: catalog,
    now: () => new Date('2026-08-24T01:02:03.000Z'),
    randomSuffix: () => 'beef',
    playwrightCli: 'playwright-cli.js',
    cwd: 'controlled-working-directory',
    env: { EXISTING_ENV: 'preserved' },
    spawnProcess: (_command, args, options) => {
      spawnedArgs = args;
      spawnedOptions = options;
      return child;
    },
    log: () => undefined,
    error: () => undefined,
    setExitCode: (code) => exitCodes.push(code),
  });

  expect(spawnedArgs).toContain('--list');
  expect(spawnedOptions).toMatchObject({
    cwd: 'controlled-working-directory',
    shell: false,
    stdio: 'inherit',
    env: {
      EXISTING_ENV: 'preserved',
      BUSINESS_TEST_RUN: 'true',
      BUSINESS_RUN_ID: 'BUSINESS-RUN-20260824010203-beef',
    },
  });

  child.emit('exit', 7, null);

  expect(exitCodes).toEqual([7]);
});

test('turns a signaled Playwright child exit into a deterministic failure', () => {
  const child = new EventEmitter() as unknown as ChildProcess;
  const exitCodes: number[] = [];
  const errors: string[] = [];

  runBusinessTests({
    args: ['--list'],
    testCases: catalog,
    now: () => new Date('2026-08-24T01:02:03.000Z'),
    randomSuffix: () => 'beef',
    playwrightCli: 'playwright-cli.js',
    spawnProcess: () => child,
    log: () => undefined,
    error: (message) => errors.push(message),
    setExitCode: (code) => exitCodes.push(code),
  });

  child.emit('exit', null, 'SIGTERM');

  expect(errors).toEqual(['Playwright business run interrupted by signal SIGTERM.']);
  expect(exitCodes).toEqual([1]);
});
