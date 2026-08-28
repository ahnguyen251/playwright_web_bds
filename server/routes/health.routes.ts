import { Router } from 'express';
import type { DatabaseConnection } from '../../database/sqlite';

export default function healthRoutes(db: DatabaseConnection) {
  const router = Router();
  router.get('/', (req, res, next) => {
    try {
      db.db.prepare('SELECT 1').get();
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  });
  return router;
}
