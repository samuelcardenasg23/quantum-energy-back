import "dotenv/config";
import "reflect-metadata"; // Required for TypeORM
import app from "./app";
import { createLogger } from "./config/logger";
import { AppDataSource } from "./config/database";

const logger = createLogger('Server');
const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || "localhost";

// Initialize database connection first
AppDataSource.initialize()
  .then(() => {
    logger.info('Database connected successfully', {
      type: 'database_connection',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST
    });
    
    // Start server only after database is connected
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
  })
  .catch(error => {
    logger.error('Database connection failed', {
      type: 'database_error',
      error: error.message,
      stack: error.stack
    });
    
    // Exit process if database connection fails
    process.exit(1);
  });