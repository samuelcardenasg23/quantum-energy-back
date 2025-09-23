import winston from 'winston';

// Define log levels with colors for console output
const logLevels = {
  error: 0,
  warn: 1, 
  info: 2,
  debug: 3
};

// Custom format for development (human-readable)
const developmentFormat = winston.format.combine(
  winston.format.colorize(), // Add colors to console output
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Human readable timestamp
  winston.format.errors({ stack: true }), // Include error stack traces
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Custom format: [timestamp] LEVEL: message {metadata}
    let log = `[${timestamp}] ${level}: ${message}`;
    
    // Add metadata if present (excluding empty objects)
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Production format (JSON for CloudWatch)
const productionFormat = winston.format.combine(
  winston.format.timestamp(), // ISO timestamp for production
  winston.format.errors({ stack: true }), // Include error stack traces  
  winston.format.json() // JSON format for log aggregation
);

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Use different formats based on environment
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  
  // Default metadata to include in all logs
  defaultMeta: {
    service: 'quantum-energy-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  
  transports: [
    // Console transport (always enabled for now)
    new winston.transports.Console({
      handleExceptions: true, // Handle uncaught exceptions
      handleRejections: true  // Handle unhandled promise rejections
    })
  ],
  
  // Exit on handled exceptions (let the process manager restart the app)
  exitOnError: false
});

// Production-specific transports
if (process.env.NODE_ENV === 'production') {
  // File transport for errors (for backup/debugging)
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }));
  
  // File transport for all logs  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }));
}

// Helper functions for structured logging
export const createLogger = (context: string) => {
  return {
    error: (message: string, meta?: any) => 
      logger.error(message, { context, ...meta }),
    
    warn: (message: string, meta?: any) => 
      logger.warn(message, { context, ...meta }),
    
    info: (message: string, meta?: any) => 
      logger.info(message, { context, ...meta }),
    
    debug: (message: string, meta?: any) => 
      logger.debug(message, { context, ...meta })
  };
};

export default logger;
