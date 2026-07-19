import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Internal server error' : error.message,
  });
}
