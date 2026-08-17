import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import Database from 'better-sqlite3';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  if (err instanceof Database.SqliteError) {
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Unable to read reporting data.'
      }
    });
  }

  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred.'
    }
  });
};
