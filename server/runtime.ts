import type { Server } from 'node:http';
import type { Express } from 'express';

import { openDatabase } from '../database/sqlite';
import { initializeSchema } from '../database/schema';
import { createApp } from './app';

export interface ReportingRuntimeOptions {
  readonly databasePath: string;
  readonly evidenceRoot: string;
  readonly port: number;
}

export interface ReportingRuntimeFactories {
  readonly openDatabase: typeof openDatabase;
  readonly initializeSchema: typeof initializeSchema;
  readonly createApp: typeof createApp;
  readonly listen: (app: Express, port: number) => Promise<Server>;
}

export interface ReportingRuntimeHandle {
  readonly server: Server;
  close(): Promise<void>;
}

export interface ShutdownSignalSource {
  once(signal: 'SIGINT' | 'SIGTERM', listener: () => void): unknown;
}

const listen = async (app: Express, port: number): Promise<Server> =>
  new Promise<Server>((resolve, reject) => {
    let server: Server;
    const onError = (error: Error) => {
      server.off('error', onError);
      reject(error);
    };

    try {
      server = app.listen(port, () => {
        server.off('error', onError);
        resolve(server);
      });
      server.once('error', onError);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });

const defaultFactories: ReportingRuntimeFactories = Object.freeze({
  openDatabase,
  initializeSchema,
  createApp,
  listen,
});

const closeHttpServer = async (server: Server): Promise<void> => {
  if (!server.listening) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

export const startReportingServer = async (
  options: ReportingRuntimeOptions,
  factories: ReportingRuntimeFactories = defaultFactories,
): Promise<ReportingRuntimeHandle> => {
  const database = factories.openDatabase(options.databasePath);

  try {
    factories.initializeSchema(database);
    const app = factories.createApp({ database, evidenceRoot: options.evidenceRoot });
    const server = await factories.listen(app, options.port);
    let shutdownPromise: Promise<void> | undefined;

    return {
      server,
      close: () => {
        shutdownPromise ??= (async () => {
          await closeHttpServer(server);
          database.close();
        })();
        return shutdownPromise;
      },
    };
  } catch (error) {
    database.close();
    throw error;
  }
};

export const registerShutdownSignals = (
  runtime: ReportingRuntimeHandle,
  signalSource: ShutdownSignalSource = process,
  onError: (error: unknown) => void = console.error,
): void => {
  const shutdown = () => {
    void runtime.close().catch(onError);
  };

  signalSource.once('SIGINT', shutdown);
  signalSource.once('SIGTERM', shutdown);
};
