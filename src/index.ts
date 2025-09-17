import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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