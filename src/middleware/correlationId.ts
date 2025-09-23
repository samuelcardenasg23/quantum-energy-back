import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware to add correlation ID to each request
 * This helps track a specific request through all logs and processes
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if client provided a correlation ID in headers
  // This allows external systems to pass their own correlation IDs
  const correlationId = req.headers['x-correlation-id'] as string || 
                       req.headers['x-request-id'] as string || 
                       uuidv4(); // Generate new UUID if none provided

  // Add correlation ID to request object for use in controllers
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers so client can see it
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Continue to next middleware
  next();
};

/**
 * Helper function to get correlation ID from request
 * Use this in controllers and services to include correlation ID in logs
 */
export const getCorrelationId = (req: Request): string => {
  return req.correlationId || 'unknown';
};
