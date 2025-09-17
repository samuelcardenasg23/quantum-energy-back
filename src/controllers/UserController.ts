import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';

export class UserController {
  static async getUsers(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, role } = req.query;
      const userRepository = AppDataSource.getRepository(User);

      const where: any = { deleted_at: IsNull() };
      if (role) where.user_role = role;

      const [users, total] = await userRepository.findAndCount({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: ['id', 'name', 'email', 'location', 'user_role', 'created_at'], // Sin password
      });

      res.json({
        data: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getUserById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
        select: ['id', 'name', 'email', 'location', 'user_role', 'created_at'],
      });

      if (!user) return res.status(404).json({ message: 'User not found' });

      // Permiso: solo el propio user
      if (req.user!.id !== Number(id)) return res.status(403).json({ message: 'Forbidden' });

      res.json({ data: user });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userRepository = AppDataSource.getRepository(User);

      // Permiso: solo el propio user
      if (req.user!.id !== Number(id)) return res.status(403).json({ message: 'Forbidden' });

      const user = await userRepository.findOneBy({ id: Number(id), deleted_at: IsNull() });
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Validar email único si se actualiza
      if (updates.email && updates.email !== user.email) {
        const existing = await userRepository.findOneBy({ email: updates.email });
        if (existing) return res.status(400).json({ message: 'Email already exists' });
      }

      await userRepository.update(id, updates);
      const updatedUser = await userRepository.findOne({
        where: { id: Number(id) },
        select: ['id', 'name', 'email', 'location', 'user_role', 'created_at'],
      });

      res.json({ data: updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      // Permiso: solo el propio user
      if (req.user!.id !== Number(id)) return res.status(403).json({ message: 'Forbidden' });

      const user = await userRepository.findOneBy({ id: Number(id), deleted_at: IsNull() });
      if (!user) return res.status(404).json({ message: 'User not found' });

      await userRepository.update(id, { deleted_at: new Date() });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}
