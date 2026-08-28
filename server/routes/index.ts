import { Router } from 'express';
import healthRoutes from './health.routes';
import testCaseRoutes from './test-cases.routes';
import runRoutes from './runs.routes';
import resultRoutes from './results.routes';
import dashboardRoutes from './dashboard.routes';
import evidenceRoutes from './evidence.routes';
import type { DatabaseConnection } from '../../database/sqlite';

export default function createRoutes(db: DatabaseConnection, evidenceRoot: string) {
  const router = Router();

  router.use('/health', healthRoutes(db));
  router.use('/test-cases', testCaseRoutes(db));
  router.use('/runs', runRoutes(db));
  router.use('/results', resultRoutes(db, evidenceRoot));
  router.use('/dashboard', dashboardRoutes(db));
  router.use('/evidence', evidenceRoutes(db, evidenceRoot));

  return router;
}
