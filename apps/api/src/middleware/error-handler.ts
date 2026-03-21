import type { ErrorHandler } from 'hono';
import { z } from 'zod';
import { logger } from './logger.js';

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

/**
 * Custom error class for known API errors.
 * Throw this from route handlers or services to return a specific error response.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Pre-defined error factories for common cases.
 */
export const Errors = {
  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 'NOT_FOUND', 404),

  badRequest: (message: string) =>
    new AppError(message, 'BAD_REQUEST', 400),

  unauthorized: (message = 'Unauthorized') =>
    new AppError(message, 'UNAUTHORIZED', 401),

  forbidden: (message = 'Forbidden') =>
    new AppError(message, 'FORBIDDEN', 403),

  conflict: (message: string) =>
    new AppError(message, 'CONFLICT', 409),

  internal: (message = 'Internal server error') =>
    new AppError(message, 'INTERNAL_ERROR', 500),
} as const;

/**
 * Global error handler for the Hono app.
 * Converts all errors into a consistent { error, code, status } JSON response.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    const messages = err.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`,
    );
    return c.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: messages,
      },
      400,
    );
  }

  // Handle known AppErrors
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, code: err.code, status: err.status },
      err.status as 400 | 401 | 403 | 404 | 409 | 500,
    );
  }

  // Unknown errors — log and return generic 500
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  return c.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR', status: 500 },
    500,
  );
};
