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

  // Serve Dashboard UI statically with no-cache headers to prevent stale UI bundles
  app.use(
    express.static(path.join(__dirname, '../public'), {
      etag: false,
      lastModified: false,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      },
    }),
  );

  // Error Handling Middleware (must be registered last)
  app.use(errorHandler);

  return app;
}
