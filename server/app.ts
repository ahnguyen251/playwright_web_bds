import express from 'express';
import path from 'path';
import createRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import type { DatabaseConnection } from '../database/sqlite';

export interface AppDependencies {
  readonly database: DatabaseConnection;
  readonly evidenceRoot: string;
}

export function createApp({ database, evidenceRoot }: AppDependencies) {
  const app = express();
  app.use(express.json());

  // API Routes must be authoritative
  app.use('/api', createRoutes(database, evidenceRoot));

  // Serve Dashboard UI statically
  app.use(express.static(path.join(__dirname, '../public')));

  // Error Handling Middleware (must be registered last)
  app.use(errorHandler);

  return app;
}
