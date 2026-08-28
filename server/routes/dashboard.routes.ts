import { Router } from 'express';
import { DashboardService } from '../services/DashboardService';
import type { DatabaseConnection } from '../../database/sqlite';

export default function dashboardRoutes(db: DatabaseConnection) {
  const router = Router();
  const dashboardService = new DashboardService(db);

  router.get('/summary', (req, res, next) => {
    try {
      const summary = dashboardService.getSummary();
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
