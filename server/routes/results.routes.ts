import { Router } from 'express';
import { ReportingService } from '../services/ReportingService';
import { EvidenceService } from '../services/EvidenceService';
import type { DatabaseConnection } from '../../database/sqlite';

export default function resultRoutes(db: DatabaseConnection, evidenceRoot: string) {
  const router = Router();
  const reportingService = new ReportingService(db);
  const evidenceService = new EvidenceService(db, evidenceRoot);

  router.get('/:resultId', (req, res, next) => {
    try {
      const resultId = req.params.resultId as string;
      const result = reportingService.getResultById(resultId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:resultId/evidence', (req, res, next) => {
    try {
      const resultId = req.params.resultId as string;
      // Just check existence of result to fail if not found
      reportingService.getResultById(resultId);

      const metadata = evidenceService.getEvidenceMetadataByResultId(resultId);
      res.json(metadata);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
