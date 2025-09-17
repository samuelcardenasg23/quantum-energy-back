import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnergyOffer } from '../entities/EnergyOffer';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';

export class OfferController {
  static async getOffers(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status, user_id } = req.query;
      const offerRepository = AppDataSource.getRepository(EnergyOffer);

      const where: any = { deleted_at: IsNull() };
      if (status) where.offer_status = status;
      if (user_id) where.user_id = Number(user_id);

      const [offers, total] = await offerRepository.findAndCount({
        where,
        relations: ['user'], // Incluye user para detalles
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      res.json({
        data: offers,
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

  static async getOfferById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const offerRepository = AppDataSource.getRepository(EnergyOffer);

      const offer = await offerRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
        relations: ['user'],
      });

      if (!offer) return res.status(404).json({ message: 'Offer not found' });

      res.json({ data: offer });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createOffer(req: AuthRequest, res: Response) {
    try {
      const { total_amount_kwh, current_amount_kwh, price_kwh } = req.body;
      const offerRepository = AppDataSource.getRepository(EnergyOffer);

      const offer = offerRepository.create({
        user: req.user,
        total_amount_kwh,
        current_amount_kwh,
        price_kwh,
      });

      await offerRepository.save(offer);
      res.status(201).json({ data: offer });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateOffer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const offerRepository = AppDataSource.getRepository(EnergyOffer);

      const offer = await offerRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
        relations: ['user'],
      });

      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.user.id !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });

      await offerRepository.update(id, updates);
      const updatedOffer = await offerRepository.findOne({
        where: { id: Number(id) },
        relations: ['user'],
      });

      res.json({ data: updatedOffer });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteOffer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const offerRepository = AppDataSource.getRepository(EnergyOffer);

      const offer = await offerRepository.findOne({
        where: { id: Number(id), deleted_at: IsNull() },
        relations: ['user'],
      });

      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.user.id !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });

      await offerRepository.update(id, { deleted_at: new Date() });
      res.json({ message: 'Offer deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}
