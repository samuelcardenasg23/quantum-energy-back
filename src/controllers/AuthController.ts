import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthRequest } from '../middleware/auth';
import { createLogger } from '../config/logger';
import { getCorrelationId } from '../middleware/correlationId';

export class AuthController {
  static async register(req: Request, res: Response) {
    const logger = createLogger('AuthController');
    const correlationId = getCorrelationId(req);
    
    try {
      const { name, email, password, location, user_role } = req.body;
      
      logger.info('User registration attempt', {
        correlationId,
        email,
        user_role
      });
      
      const userRepository = AppDataSource.getRepository(User);

      const existingUser = await userRepository.findOneBy({ email });
      if (existingUser) {
        logger.warn('Registration failed - email already exists', {
          correlationId,
          email
        });
        return res.status(400).json({ message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = userRepository.create({
        name,
        email,
        password: hashedPassword,
        location,
        user_role,
      });

      await userRepository.save(user);
      
      logger.info('User registered successfully', {
        correlationId,
        userId: user.id,
        email,
        user_role
      });
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error: any) {
      logger.error('Registration error', {
        correlationId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async login(req: Request, res: Response) {
    const logger = createLogger('AuthController');
    const correlationId = getCorrelationId(req);
    
    try {
      const { email, password } = req.body;
      
      logger.info('Login attempt', {
        correlationId,
        email
      });
      
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOneBy({ email });
      if (!user) {
        logger.warn('Login failed - user not found', {
          correlationId,
          email
        });
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn('Login failed - invalid password', {
          correlationId,
          email,
          userId: user.id
        });
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      
      logger.info('Login successful', {
        correlationId,
        userId: user.id,
        email,
        user_role: user.user_role
      });
      
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, user_role: user.user_role } });
    } catch (error: any) {
      logger.error('Login error', {
        correlationId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    res.json({ user: req.user });
  }
}
