import { Router } from 'express';
import { ReportingService } from '../services/ReportingService';
import { validateQuery } from '../middlewares/validate';
import { TestCaseFilterSchema, ResultFilterSchema } from '../schemas';
import type { DatabaseConnection } from '../../database/sqlite';

export default function testCaseRoutes(db: DatabaseConnection) {
  const router = Router();
  const reportingService = new ReportingService(db);

  router.get('/', validateQuery(TestCaseFilterSchema), (req, res, next) => {
    try {
      const { page, pageSize, ...filters } = req.query as any;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const result = reportingService.getTestCases(filters, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:testCaseId', (req, res, next) => {
    try {
      const testCaseId = req.params.testCaseId as string;
      const result = reportingService.getTestCaseById(testCaseId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:testCaseId/analytics', (req, res, next) => {
    try {
      const testCaseId = req.params.testCaseId as string;
      const result = reportingService.getTestCaseAnalytics(testCaseId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:testCaseId/results', validateQuery(ResultFilterSchema), (req, res, next) => {
    try {
      const testCaseId = req.params.testCaseId as string;
      const { page, pageSize, ...filters } = req.query as any;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const result = reportingService.getTestCaseResults(testCaseId, filters, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
