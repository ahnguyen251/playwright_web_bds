import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      Object.defineProperty(req, 'query', { value: schema.parse(req.query), writable: true, configurable: true });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')));
      } else {
        next(error);
      }
    }
  };
};

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      Object.defineProperty(req, 'params', { value: schema.parse(req.params), writable: true, configurable: true });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')));
      } else {
        next(error);
      }
    }
  };
};

