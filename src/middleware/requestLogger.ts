import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../config/logger';
import { getCorrelationId } from './correlationId';
import { metrics } from '../utils/metrics';

const logger = createLogger('RequestLogger');

/**
 * Middleware to log HTTP requests and responses
 * Tracks: method, URL, status code, response time, user info, etc.
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now(); // Record when request started
  
  // Get correlation ID for this request
  const correlationId = getCorrelationId(req);
  
  // Extract useful request information
  const requestInfo = {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    // Only log body for non-sensitive endpoints and non-GET requests
    body: shouldLogBody(req) ? req.body : '[hidden]'
  };

  // Log incoming request
  logger.info('Incoming request', {
    type: 'request',
    ...requestInfo
  });

  // Increment request counter immediately
  metrics.incrementCounter('http_requests_total');
  metrics.incrementCounter('http_requests_total', 1, { method: req.method });

  // Override res.end to capture response information
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Record metrics
    metrics.recordHistogram('http_request_duration', responseTime);
    metrics.incrementCounter('http_requests_total', 1, { status: statusCode.toString() });
    
    // Track errors
    if (statusCode >= 400) {
      metrics.incrementCounter('http_errors_total');
    }
    
    // Determine log level based on status code
    const logLevel = getLogLevelForStatus(statusCode);
    
    // Log response information
    logger[logLevel]('Request completed', {
      type: 'response',
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0,
      // Add user info if authenticated
      userId: (req as any).user?.id || null
    });

    // Call original end method
    originalEnd.call(res, chunk, encoding);
  };

  next();
};

/**
 * Determine if request body should be logged
 * Exclude sensitive endpoints and large payloads
 */
function shouldLogBody(req: Request): boolean {
  // Don't log body for sensitive endpoints
  const sensitiveEndpoints = ['/auth/login', '/auth/register', '/users'];
  if (sensitiveEndpoints.some(endpoint => req.originalUrl.includes(endpoint))) {
    return false;
  }
  
  // Don't log GET requests (no body)
  if (req.method === 'GET') {
    return false;
  }
  
  // Don't log if body is too large
  const contentLength = parseInt(req.get('Content-Length') || '0');
  if (contentLength > 1024) { // 1KB limit
    return false;
  }
  
  return true;
}

/**
 * Get appropriate log level based on HTTP status code
 */
function getLogLevelForStatus(statusCode: number): 'error' | 'warn' | 'info' {
  if (statusCode >= 500) {
    return 'error'; // Server errors
  } else if (statusCode >= 400) {
    return 'warn';  // Client errors  
  } else {
    return 'info';  // Success responses
  }
}

/**
 * Middleware to log slow requests (performance monitoring)
 */
export const slowRequestMiddleware = (thresholdMs: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Override res.end to check response time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const responseTime = Date.now() - startTime;
      
      // Log if request took longer than threshold
      if (responseTime > thresholdMs) {
        logger.warn('Slow request detected', {
          type: 'performance',
          correlationId: getCorrelationId(req),
          method: req.method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          threshold: `${thresholdMs}ms`,
          statusCode: res.statusCode
        });
      }
      
      // Call original end method
      originalEnd.call(res, chunk, encoding);
    };
    
    next();
  };
};
