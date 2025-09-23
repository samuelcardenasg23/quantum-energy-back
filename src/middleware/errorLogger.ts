import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../config/logger';
import { getCorrelationId } from './correlationId';

const logger = createLogger('ErrorHandler');

/**
 * Custom error class for application errors
 * Extends built-in Error with additional context
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public context?: any;

  constructor(
    message: string, 
    statusCode: number = 500, 
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    
    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Logs errors with context and sends appropriate response
 */
export const errorHandlerMiddleware = (
  err: Error | AppError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const correlationId = getCorrelationId(req);
  
  // Default error properties
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  
  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  
  // Enhanced error context
  const errorContext = {
    correlationId,
    type: 'error',
    errorName: err.name,
    message: err.message,
    statusCode,
    isOperational,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: (req as any).user?.id || null,
    stack: err.stack,
    // Include additional context if it's an AppError
    ...(err instanceof AppError && err.context ? { context: err.context } : {})
  };

  // Log based on error severity
  if (statusCode >= 500) {
    // Server errors - these need immediate attention
    logger.error('Server error occurred', errorContext);
  } else if (statusCode >= 400) {
    // Client errors - log as warning for monitoring
    logger.warn('Client error occurred', errorContext);
  } else {
    // Other errors
    logger.info('Error occurred', errorContext);
  }

  // Send response to client
  const response: any = {
    error: {
      message: message,
      correlationId: correlationId,
      timestamp: new Date().toISOString()
    }
  };

  // Include additional details in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
    response.error.details = errorContext;
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware to handle async errors
 * Wraps async route handlers to catch rejected promises
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper function to create and throw application errors
 */
export const createError = (
  message: string, 
  statusCode: number = 500, 
  context?: any
): never => {
  throw new AppError(message, statusCode, true, context);
};

/**
 * Middleware to handle 404 errors (route not found)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, true, {
    method: req.method,
    url: req.originalUrl
  });
  
  next(error);
};

/**
 * Process-level error handlers
 * Handle uncaught exceptions and unhandled promise rejections
 */
export const setupProcessErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception - shutting down', {
      type: 'uncaughtException',
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    // Exit process - let process manager restart the app
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection - shutting down', {
      type: 'unhandledRejection',
      reason: reason,
      promise: promise
    });
    
    // Exit process - let process manager restart the app
    process.exit(1);
  });

  // Handle SIGTERM (graceful shutdown)
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received - shutting down gracefully', {
      type: 'shutdown',
      signal: 'SIGTERM'
    });
    
    // Perform graceful shutdown
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logger.info('SIGINT received - shutting down gracefully', {
      type: 'shutdown',
      signal: 'SIGINT'
    });
    
    process.exit(0);
  });
};
