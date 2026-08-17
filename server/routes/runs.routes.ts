import { Router } from 'express';
import { ReportingService } from '../services/ReportingService';
import { validateQuery } from '../middlewares/validate';
import { RunFilterSchema, ResultFilterSchema } from '../schemas';
import { DatabaseConnection } from '../../database/sqlite';

export default function runRoutes(db?: DatabaseConnection) {
  const router = Router();
  const reportingService = new ReportingService(db);

  router.get('/', validateQuery(RunFilterSchema), (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as any;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const result = reportingService.getRuns(filters, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:runId', (req, res, next) => {
    try {
      const runId = req.params.runId as string;
      const result = reportingService.getRunById(runId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:runId/results', validateQuery(ResultFilterSchema), (req, res, next) => {
    try {
      const runId = req.params.runId as string;
      const { page, pageSize, ...filters } = req.query as any;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const result = reportingService.getResultsByRunId(runId, filters, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });
  
  return router;
}
