import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { createLogger } from './logger';

dotenv.config();

const logger = createLogger('Database');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false, // se maneja con scripts
  logging: process.env.NODE_ENV === 'development', // Logs solo en dev
  entities: ['src/entities/*.ts'], // para queries
  
  // Add custom logger for database operations
  logger: {
    logQuery: (query: string, parameters?: any[]) => {
      const startTime = Date.now();
      
      // Log query for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Database query executed', {
          type: 'db_query',
          query: query.replace(/\s+/g, ' ').trim(),
          parameters: parameters?.slice(0, 5) // Limit parameters logged
        });
      }
      
      // We'll track timing in the actual query execution
      return startTime;
    },
    
    logQueryError: (error: string, query: string, parameters?: any[]) => {
      logger.error('Database query error', {
        type: 'db_error',
        error,
        query: query.replace(/\s+/g, ' ').trim(),
        parameters: parameters?.slice(0, 5)
      });
    },
    
    logQuerySlow: (time: number, query: string, parameters?: any[]) => {
      logger.warn('Slow database query detected', {
        type: 'db_slow_query',
        duration_ms: time,
        query: query.replace(/\s+/g, ' ').trim(),
        parameters: parameters?.slice(0, 5)
      });
    },
    
    logSchemaBuild: (message: string) => {
      logger.info('Database schema operation', {
        type: 'db_schema',
        message
      });
    },
    
    logMigration: (message: string) => {
      logger.info('Database migration', {
        type: 'db_migration',
        message
      });
    },
    
    log: (level: 'log' | 'info' | 'warn', message: any) => {
      const logLevel = level === 'log' ? 'info' : level;
      logger[logLevel]('Database operation', {
        type: 'db_operation',
        message
      });
    }
  }
});