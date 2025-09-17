import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, location, user_role } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      const existingUser = await userRepository.findOneBy({ email });
      if (existingUser) return res.status(400).json({ message: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = userRepository.create({
        name,
        email,
        password: hashedPassword,
        location,
        user_role,
      });

      await userRepository.save(user);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOneBy({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, user_role: user.user_role } });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    res.json({ user: req.user });
  }
}
