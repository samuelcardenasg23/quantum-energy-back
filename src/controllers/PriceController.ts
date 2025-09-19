import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnergyPricePerHour } from '../entities/EnergyPricePerHour';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';

export class PriceController {
  static async getPrices(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const priceRepository = AppDataSource.getRepository(EnergyPricePerHour);

      const [prices, total] = await priceRepository.findAndCount({
        where: { deleted_at: IsNull() },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        order: { price_time: 'ASC' },
      });

      res.json({
        data: prices,
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

  static async getPriceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const priceRepository = AppDataSource.getRepository(EnergyPricePerHour);

      const price = await priceRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
      });

      if (!price) return res.status(404).json({ message: 'Price not found' });

      res.json({ data: price });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createPrice(req: AuthRequest, res: Response) {
    try {
      // Asumir que solo admin puede crear (o usuario autenticado)
      // Agregar check de role si es necesario
      const { provider_name, price_kwh, price_time } = req.body;
      const priceRepository = AppDataSource.getRepository(EnergyPricePerHour);

      const price = priceRepository.create({
        provider_name,
        price_kwh,
        price_time,
      });

      await priceRepository.save(price);
      res.status(201).json({ data: price });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updatePrice(req: AuthRequest, res: Response) {
    try {
      // Solo admin
      const { id } = req.params;
      const updates = req.body;
      const priceRepository = AppDataSource.getRepository(EnergyPricePerHour);

      const price = await priceRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
      });

      if (!price) return res.status(404).json({ message: 'Price not found' });

      await priceRepository.update(id, updates);
      const updatedPrice = await priceRepository.findOne({
        where: { id: Number(id) },
      });

      res.json({ data: updatedPrice });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deletePrice(req: AuthRequest, res: Response) {
    try {
      // Solo admin
      const { id } = req.params;
      const priceRepository = AppDataSource.getRepository(EnergyPricePerHour);

      const price = await priceRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
      });

      if (!price) return res.status(404).json({ message: 'Price not found' });

      await priceRepository.update(id, { deleted_at: new Date() });
      res.json({ message: 'Price deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}
