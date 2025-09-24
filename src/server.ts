import "dotenv/config";
import "reflect-metadata"; // Required for TypeORM
import { createLogger } from "./config/logger";
import { AppDataSource } from "./config/database";
// Si tienes un factory: import { createApp } from "./app";
import app from "./app"; // O usa createApp() si tu app es una función

const logger = createLogger('Server');
const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || "0.0.0.0";

// Si prefieres una función factory para tu Express app, descomenta:
// const app = createApp();

async function main() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected successfully', {
      type: 'database_connection',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST
    });

    app.listen(port, () => {
      logger.info('Server started successfully', {
        type: 'server_start',
        port: port,
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          api: `http://${baseUrl}:${port}`,
          docs: `http://${baseUrl}:${port}/docs`,
          spec: `http://${baseUrl}:${port}/openapi.json`,
          health: `http://${baseUrl}:${port}/health`
        }
      });
    });
  } catch (error: any) {
    logger.error('Database connection failed', {
      type: 'database_error',
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

main();