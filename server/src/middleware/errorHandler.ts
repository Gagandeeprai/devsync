import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Always log errors in dev/testing
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // 1. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 2. Prisma Database Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          success: false,
          message: `Unique constraint failed: A record with this ${target} already exists.`,
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          message: 'Requested record was not found or has been deleted.',
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          success: false,
          message: 'Foreign key constraint failed: Referenced project or user does not exist.',
        });
        return;
      }
      case 'P2023': {
        res.status(400).json({
          success: false,
          message: 'Invalid ID format provided.',
        });
        return;
      }
      default:
        res.status(400).json({
          success: false,
          message: `Database operation error (${err.code})`,
        });
        return;
    }
  }

  // 3. JWT Specific Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid authentication token signature',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Authentication token has expired',
    });
    return;
  }

  // 4. Fallback General Server Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
