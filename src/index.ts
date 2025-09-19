import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import offerRoutes from './routes/offers';
import orderRoutes from './routes/orders';
import productionRoutes from './routes/productions';
import priceRoutes from './routes/prices';
import marketRoutes from './routes/market';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/offers', offerRoutes);
app.use('/orders', orderRoutes);
app.use('/productions', productionRoutes);
app.use('/prices', priceRoutes);
app.use('/market', marketRoutes);

// Database connection
AppDataSource.initialize().then(() => {
  console.log('Connected to the database');
}).catch(error => console.log('Database connection error:', error));

// Sample route
app.get('/', (req, res) => {
  res.send('Welcome to the Quantum Energy API');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});