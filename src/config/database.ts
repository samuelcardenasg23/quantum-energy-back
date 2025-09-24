import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import dotenv from 'dotenv';
import { createLogger } from './logger';
import fs from 'fs'; //TODO: para debug

dotenv.config();

console.log('VALOR __dirname:', __dirname);
const logger = createLogger('Database');

const url = process.env.DATABASE_URL;
if (!url) {
  logger.error('DATABASE_URL is not set');
  throw new Error('DATABASE_URL is not set');
}

const isProd = process.env.NODE_ENV === 'production';
const useSsl = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT === 'false' ? false : true;

// Globs robustos para entities y migrations
const entitiesPath = isProd
  ? [
    path.join(__dirname, '**/*.entity.js'),
    path.join(__dirname, 'entities/*.js'),
    path.join(__dirname, '*.entity.js')
  ]
  : [
    path.join(__dirname, 'entities/*.ts'),
    path.join(__dirname, '**/*.entity.ts')
  ];

const migrationsPath = isProd
  ? [path.join(__dirname, 'migrations/*.js')]
  : [path.join(__dirname, 'migrations/*.ts')];

//TODO: para debug
try {
  console.log('Archivos en dist/entities:', fs.readdirSync('/app/dist/entities'));
} catch (e) {
  console.error('No se pudo leer /app/dist/entities:', e.message);
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  ...(useSsl ? { ssl: { rejectUnauthorized } } : {}),
  entities: entitiesPath,
  migrations: migrationsPath,
  synchronize: false, // usa migraciones
  logging: process.env.NODE_ENV === 'development',
});

logger.info('Database configuration', {
  type: 'db_config',
  databaseUrlPresent: !!url,
  sslEnabled: useSsl,
  sslRejectUnauthorized: useSsl ? rejectUnauthorized : undefined,
  entitiesPath,
  migrationsPath,
});