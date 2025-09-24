import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import marketRouter from "./routes/market";
import offersRouter from "./routes/offers";
import ordersRouter from "./routes/orders";
import pricesRouter from "./routes/prices";
import productionsRouter from "./routes/productions";

// Import our new logging and error handling middleware
import { correlationIdMiddleware } from "./middleware/correlationId";
import { requestLoggerMiddleware, slowRequestMiddleware } from "./middleware/requestLogger";
import { errorHandlerMiddleware, notFoundHandler, setupProcessErrorHandlers } from "./middleware/errorLogger";
import { createLogger } from "./config/logger";
import { metrics } from "./utils/metrics";

// Setup process-level error handlers
setupProcessErrorHandlers();

const app = express();
const logger = createLogger('App');

// Middleware setup (ORDER MATTERS!)
// 1. Correlation ID first (needed for all other logging)
app.use(correlationIdMiddleware);

// 2. Request logging (log all incoming requests)
app.use(requestLoggerMiddleware);

// 3. Slow request monitoring (log requests that take too long)
app.use(slowRequestMiddleware(1000)); // 1 second threshold

// 4. CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 5. Body parsing
app.use(express.json());

// JSON parse error → 400
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      correlationId: req.headers['x-correlation-id'] || undefined
    });
  }
  next(err);
});

app.use(express.json({
  strict: true,    
  limit: '1mb',
  type: ['application/json', 'application/*+json']
}));

// Documentación y especificación 
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

// Enhanced health check endpoint with metrics and logging
app.get("/health", (req, res) => {
  const allMetrics = metrics.getAllMetrics();

  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
    uptime: {
      seconds: process.uptime(),
      human: formatUptime(process.uptime())
    },
    environment: process.env.NODE_ENV || 'development',

    // Application metrics
    metrics: {
      requests: {
        total: allMetrics.http_requests_total,
        per_minute: Math.round((allMetrics.http_requests_total / process.uptime()) * 60 * 100) / 100,
        avg_response_time_ms: Math.round(allMetrics.http_request_duration_avg || 0),
        error_rate_percent: allMetrics.http_errors_total > 0 ?
          Math.round((allMetrics.http_errors_total / allMetrics.http_requests_total) * 10000) / 100 : 0
      },

      auth: {
        login_attempts: allMetrics.auth_login_attempts,
        login_success_rate: allMetrics.auth_login_attempts > 0 ?
          Math.round((allMetrics.auth_login_success / allMetrics.auth_login_attempts) * 10000) / 100 : 0,
        registrations: allMetrics.auth_registrations
      },

      business: {
        offers: {
          created: allMetrics.offers_created,
          accepted: allMetrics.offers_accepted,
          failed: allMetrics.offers_creation_failed,
          avg_energy_kwh: allMetrics.offer_energy_amount_kwh_count > 0 ?
            Math.round((allMetrics.offer_energy_amount_kwh_total / allMetrics.offer_energy_amount_kwh_count) * 100) / 100 : 0,
          avg_price_per_kwh: allMetrics.offer_price_per_kwh_count > 0 ?
            Math.round((allMetrics.offer_price_per_kwh_total / allMetrics.offer_price_per_kwh_count) * 100) / 100 : 0
        },

        orders: {
          created: allMetrics.orders_created,
          failed: allMetrics.orders_creation_failed,
          success_rate: (allMetrics.orders_created + allMetrics.orders_creation_failed) > 0 ?
            Math.round((allMetrics.orders_created / (allMetrics.orders_created + allMetrics.orders_creation_failed)) * 10000) / 100 : 0,
          avg_energy_kwh: allMetrics.order_energy_quantity_kwh_count > 0 ?
            Math.round((allMetrics.order_energy_quantity_kwh_total / allMetrics.order_energy_quantity_kwh_count) * 100) / 100 : 0,
          avg_total_price: allMetrics.order_total_price_count > 0 ?
            Math.round((allMetrics.order_total_price_total / allMetrics.order_total_price_count) * 100) / 100 : 0
        }
      },

      system: {
        memory_usage_mb: Math.round(allMetrics.memory_heap_used_bytes / 1024 / 1024),
        memory_total_mb: Math.round(allMetrics.memory_heap_total_bytes / 1024 / 1024),
        memory_usage_percent: Math.round((allMetrics.memory_heap_used_bytes / allMetrics.memory_heap_total_bytes) * 100)
      }
    }
  };

  logger.info('Health check requested', {
    type: 'health_check',
    correlationId: req.correlationId,
    metrics_snapshot: {
      requests_total: allMetrics.http_requests_total,
      memory_mb: Math.round(allMetrics.memory_heap_used_bytes / 1024 / 1024)
    }
  });

  res.json(healthInfo);
});

// Dedicated metrics endpoint for monitoring tools
app.get("/metrics", (req, res) => {
  const allMetrics = metrics.getAllMetrics();

  logger.info('Metrics endpoint accessed', {
    type: 'metrics_access',
    correlationId: req.correlationId
  });

  res.json({
    timestamp: new Date().toISOString(),
    metrics: allMetrics
  });
});

// Helper function to format uptime in human readable format
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

// API Routes
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/markets", marketRouter);
app.use("/offers", offersRouter);
app.use("/orders", ordersRouter);
app.use("/prices", pricesRouter);
app.use("/productions", productionsRouter);

// Handle 404 errors (route not found)
app.use(notFoundHandler);

// Global error handling middleware (MUST BE LAST!)
app.use(errorHandlerMiddleware);

export default app;

// --- Archivo separado para arrancar el servidor (ej: server.ts) ---
// import app from "./app";
// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`API:   http://localhost:${port}`);
//   console.log(`Docs:  http://localhost:${port}/docs`);
//   console.log(`Spec:  http://localhost:${port}/openapi.json`);
// });