import express, { Request, Response, NextFunction } from "express";
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

// 4. Body parsing
app.use(express.json());

// Documentación y especificación 
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

// Enhanced health check endpoint with logging
app.get("/health", (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  logger.info('Health check requested', { 
    type: 'health_check',
    correlationId: req.correlationId 
  });
  
  res.json(healthInfo);
});

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