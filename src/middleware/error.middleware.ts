import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { JsonWebTokenError } from 'jsonwebtoken';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err } as { message: string; statusCode?: number; code?: number; keyValue?: Record<string, unknown> };
  error.message = err.message;

  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack || err.message);
  }

  if (err instanceof ZodError) {
    const message = 'Validation failed';
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message,
      errors,
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (error.code === 11000 && error.keyValue) {
    const field = Object.keys(error.keyValue || {})[0];
    res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Something went wrong'
      : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
