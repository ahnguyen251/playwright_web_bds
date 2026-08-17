import { Router } from 'express';
import fs from 'fs';
import { EvidenceService, UnsupportedEvidenceTypeError, InvalidEvidencePathError } from '../services/EvidenceService';
import { DatabaseConnection } from '../../database/sqlite';
import { AppError } from '../utils/errors';

export default function evidenceRoutes(db?: DatabaseConnection, evidenceRoot?: string) {
  const router = Router();
  const service = new EvidenceService(db, evidenceRoot);

  router.get('/:evidenceId/content', (req, res, next) => {
    try {
      const evidenceId = req.params.evidenceId as string;
      const descriptor = service.getEvidenceStreamDescriptor(evidenceId);

      // Map disposition based on type
      let disposition = 'inline';
      if (descriptor.type === 'TRACE') {
        disposition = 'attachment';
      }
      
      res.setHeader('Content-Type', descriptor.mimeType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${descriptor.safeFilename}"`);

      const stream = fs.createReadStream(descriptor.filePath);

      stream.on('error', (err: any) => {
        if (!res.headersSent) {
          next(new AppError(500, 'STREAM_ERROR', 'Failed to read evidence file'));
        } else {
          // If headers are sent, just end the response to prevent hang
          res.end();
        }
      });

      stream.pipe(res);
    } catch (err) {
      if (err instanceof UnsupportedEvidenceTypeError) {
        next(new AppError(400, 'UNSUPPORTED_EVIDENCE_TYPE', err.message));
      } else if (err instanceof InvalidEvidencePathError) {
        next(new AppError(403, 'INVALID_EVIDENCE_PATH', err.message));
      } else {
        next(err);
      }
    }
  });

  return router;
}
