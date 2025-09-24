import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { createLogger } from './logger';

dotenv.config();

const logger = createLogger('Database');

// Prefer a single DATABASE_URL for simpler and more secure deployments.
const url = process.env.DATABASE_URL;
if (!url) {
  logger.error('DATABASE_URL is not set');
  throw new Error('DATABASE_URL is not set');
}

// SSL helper: enable when DB_SSL=true. You can control rejectUnauthorized via DB_SSL_REJECT.
const useSsl = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT === 'false' ? false : true;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  // If you want to force TLS you can enable it via env var. TypeORM accepts `extra` for driver options.
  ...(useSsl ? { extra: { ssl: { rejectUnauthorized } } } : {}),
  synchronize: false, // managed via migrations
  logging: process.env.NODE_ENV === 'development',
  // Use compiled JS paths in production, TS paths in development (useful for ts-node)
  entities: process.env.NODE_ENV === 'production' ? ['dist/**/*.entity.js'] : ['src/entities/*.ts'],
  migrations: process.env.NODE_ENV === 'production' ? ['dist/migrations/*.js'] : ['src/migrations/*.ts']
});