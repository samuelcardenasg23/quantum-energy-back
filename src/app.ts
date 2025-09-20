import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import usersRouter from "./routes/users";
import marketRouter from "./routes/market";
import offersRouter from "./routes/offers";
import ordersRouter from "./routes/orders";
import pricesRouter from "./routes/prices";
import productionsRouter from "./routes/productions";

const app = express();

app.use(express.json());

// Documentación y especificación 
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

// Endpoints principales
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/users", usersRouter);
app.use("/markets", marketRouter);
app.use("/offers", offersRouter);
app.use("/orders", ordersRouter);
app.use("/prices", pricesRouter);
app.use("/productions", productionsRouter);

// Manejo centralizado de errores
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;

// --- Archivo separado para arrancar el servidor (ej: server.ts) ---
// import app from "./app";
// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`API:   http://localhost:${port}`);
//   console.log(`Docs:  http://localhost:${port}/docs`);
//   console.log(`Spec:  http://localhost:${port}/openapi.json`);
// });