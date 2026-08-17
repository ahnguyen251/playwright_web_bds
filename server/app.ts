import express from 'express';
import path from 'path';
import createRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { DatabaseConnection } from '../database/sqlite';

export function createApp(db?: DatabaseConnection, evidenceRoot?: string) {
  const app = express();
  app.use(express.json());

  // API Routes must be authoritative
  app.use('/api', createRoutes(db, evidenceRoot));

  // Serve Dashboard UI statically
  app.use(express.static(path.join(__dirname, '../public')));

  // Error Handling Middleware (must be registered last)
  app.use(errorHandler);

  return app;
}

// Fallback default app export for backward compatibility
export default createApp();
