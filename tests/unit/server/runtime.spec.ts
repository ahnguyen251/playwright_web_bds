import type { Server } from 'node:http';
import type { Express } from 'express';
import { expect, test } from '@playwright/test';

import type { DatabaseConnection } from '../../../database/sqlite';
import {
  registerShutdownSignals,
  startReportingServer,
  type ReportingRuntimeFactories,
  type ReportingRuntimeHandle,
  type ShutdownSignalSource,
} from '../../../server/runtime';

const options = {
  databasePath: 'owned-reporting.db',
  evidenceRoot: 'owned-evidence',
  port: 0,
} as const;

type FailurePoint = 'initialize' | 'create' | 'listen';

const createFactories = (
  events: string[],
  failurePoint?: FailurePoint,
): ReportingRuntimeFactories => {
  const connection: DatabaseConnection = {
    db: {} as DatabaseConnection['db'],
    close: () => {
      events.push('db:close');
    },
  };
  let listening = true;
  const server = {
    get listening() {
      return listening;
    },
    close: (callback: (error?: Error) => void) => {
      events.push('http:close');
      listening = false;
      callback();
      return server;
    },
  } as unknown as Server;

  return {
    openDatabase: (databasePath) => {
      events.push(`db:open:${databasePath}`);
      return connection;
    },
    initializeSchema: () => {
      events.push('schema:init');
      if (failurePoint === 'initialize') throw new Error('initialize failed');
    },
    createApp: () => {
      events.push('app:create');
      if (failurePoint === 'create') throw new Error('create failed');
      return {} as Express;
    },
    listen: () => {
      events.push('http:listen');
      if (failurePoint === 'listen') throw new Error('listen failed');
      return Promise.resolve(server);
    },
  };
};

test('opens and initializes once, then closes HTTP before SQLite', async () => {
  const events: string[] = [];
  const runtime = await startReportingServer(options, createFactories(events));

  await runtime.close();

  expect(events).toEqual([
    'db:open:owned-reporting.db',
    'schema:init',
    'app:create',
    'http:listen',
    'http:close',
    'db:close',
  ]);
});

test('duplicate close shares one shutdown', async () => {
  const events: string[] = [];
  const runtime = await startReportingServer(options, createFactories(events));

  await Promise.all([runtime.close(), runtime.close()]);

  expect(events.filter((event) => event === 'http:close')).toHaveLength(1);
  expect(events.filter((event) => event === 'db:close')).toHaveLength(1);
});

for (const failurePoint of ['initialize', 'create', 'listen'] as const) {
  test(`${failurePoint} failure closes the acquired database`, async () => {
    const events: string[] = [];

    await expect(
      startReportingServer(options, createFactories(events, failurePoint)),
    ).rejects.toThrow(`${failurePoint} failed`);

    expect(events.filter((event) => event === 'db:close')).toHaveLength(1);
  });
}

test('SIGINT and SIGTERM register the same idempotent shutdown callback', () => {
  const listeners = new Map<string, () => void>();
  const errors: unknown[] = [];
  let closeCount = 0;
  const source: ShutdownSignalSource = {
    once: (signal, listener) => {
      listeners.set(signal, listener);
      return source;
    },
  };
  const runtime = {
    server: {} as Server,
    close: () => {
      closeCount += 1;
      return Promise.resolve();
    },
  } satisfies ReportingRuntimeHandle;

  registerShutdownSignals(runtime, source, (error) => {
    errors.push(error);
  });

  expect(listeners.get('SIGINT')).toBe(listeners.get('SIGTERM'));
  expect(closeCount).toBe(0);
  expect(errors).toEqual([]);
});
