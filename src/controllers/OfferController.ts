import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnergyOffer } from '../entities/EnergyOffer';
import { EnergyProductionConsumption } from '../entities/EnergyProductionConsumption';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';
import { createLogger } from '../config/logger';
import { getCorrelationId } from '../middleware/correlationId';
import { metrics } from '../utils/metrics';

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
    const logger = createLogger('OfferController');
    const correlationId = getCorrelationId(req);
    
    try {
      const { total_amount_kwh, current_amount_kwh, price_kwh } = req.body;
      
      logger.info('Offer creation attempt', {
        correlationId,
        userId: req.user!.id,
        total_amount_kwh,
        price_kwh
      });
      
      const offerRepository = AppDataSource.getRepository(EnergyOffer);
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);

      // Calcular excedente disponible
      const productions = await productionRepository.find({
        where: { user: { id: req.user!.id }, deleted_at: IsNull() },
      });
      const totalProduced = productions.reduce((sum, p) => sum + parseFloat(p.energy_produced_kwh.toString()), 0);
      const totalConsumed = productions.reduce((sum, p) => sum + parseFloat(p.energy_consumed_kwh.toString()), 0);
      const netProduction = totalProduced - totalConsumed;
      const usedExcedente = productions.reduce((sum, p) => sum + parseFloat(p.used_kwh.toString()), 0);
      const consumedExcedente = productions.reduce((sum, p) => sum + parseFloat(p.consumed_kwh.toString()), 0);
      const availableExcedente = netProduction - usedExcedente - consumedExcedente;

      if (total_amount_kwh > availableExcedente) {
        // Record failed offer creation
        metrics.incrementCounter('offers_creation_failed');
        metrics.incrementCounter('offers_creation_failed', 1, { reason: 'insufficient_energy' });
        
        logger.warn('Offer creation failed - insufficient energy', {
          correlationId,
          userId: req.user!.id,
          requested: total_amount_kwh,
          available: availableExcedente
        });
        
        return res.status(400).json({ message: 'Insufficient available excedente' });
      }

      // Actualizar used_kwh en las producciones (distribuir proporcionalmente)
      let remaining = total_amount_kwh;
      for (const prod of productions) {
        const prodNet = parseFloat(prod.energy_produced_kwh.toString()) - parseFloat(prod.energy_consumed_kwh.toString());
        const prodAvailable = prodNet - parseFloat(prod.used_kwh.toString()) - parseFloat(prod.consumed_kwh.toString());
        if (prodAvailable > 0 && remaining > 0) {
          const toUse = Math.min(remaining, prodAvailable);
          prod.used_kwh = parseFloat(prod.used_kwh.toString()) + toUse;
          remaining -= toUse;
        }
        if (remaining <= 0) break;
      }
      if (remaining > 0) {
        // Record failed offer creation
        metrics.incrementCounter('offers_creation_failed');
        metrics.incrementCounter('offers_creation_failed', 1, { reason: 'allocation_error' });
        
        logger.error('Offer creation failed - allocation error', {
          correlationId,
          userId: req.user!.id,
          remaining_energy: remaining
        });
        
        return res.status(400).json({ message: 'Could not allocate all energy to productions' });
      }
      await productionRepository.save(productions);

      const offer = offerRepository.create({
        user: req.user,
        total_amount_kwh,
        current_amount_kwh,
        price_kwh,
      });

      await offerRepository.save(offer);
      
      // Record successful offer creation with business metrics
      metrics.incrementCounter('offers_created');
      metrics.incrementCounter('offers_created', 1, { user_role: req.user!.user_role });
      metrics.recordHistogram('offer_energy_amount_kwh', total_amount_kwh);
      metrics.recordHistogram('offer_price_per_kwh', price_kwh);
      
      logger.info('Offer created successfully', {
        correlationId,
        offerId: offer.id,
        userId: req.user!.id,
        total_amount_kwh,
        price_kwh,
        total_value: total_amount_kwh * price_kwh
      });
      
      res.status(201).json({ data: offer });
    } catch (error: any) {
      // Record error metrics
      metrics.incrementCounter('offers_creation_failed');
      metrics.incrementCounter('offers_creation_failed', 1, { reason: 'server_error' });
      
      logger.error('Offer creation error', {
        correlationId,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });
      
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

      const oldAmount = offer.current_amount_kwh;
      await offerRepository.update(id, updates);
      const updatedOffer = await offerRepository.findOne({
        where: { id: Number(id) },
        relations: ['user'],
      });

      // Ajustar used_kwh si cambió current_amount_kwh
      if (updates.current_amount_kwh !== undefined) {
        const difference = updates.current_amount_kwh - oldAmount;
        const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);
        const productions = await productionRepository.find({
          where: { user: { id: req.user!.id }, deleted_at: IsNull() },
        });
        let remaining = Math.abs(difference);
        for (const prod of productions) {
          if (difference > 0) {
            // Aumentar used_kwh
            const prodNet = parseFloat(prod.energy_produced_kwh.toString()) - parseFloat(prod.energy_consumed_kwh.toString());
            const prodAvailable = prodNet - parseFloat(prod.used_kwh.toString()) - parseFloat(prod.consumed_kwh.toString());
            const toUse = Math.min(remaining, prodAvailable);
            prod.used_kwh = parseFloat(prod.used_kwh.toString()) + toUse;
            remaining -= toUse;
            if (remaining <= 0) break;
          } else {
            // Disminuir used_kwh
            const toDecrease = Math.min(remaining, parseFloat(prod.used_kwh.toString()));
            prod.used_kwh = parseFloat(prod.used_kwh.toString()) - toDecrease;
            remaining -= toDecrease;
            if (remaining <= 0) break;
          }
        }
        await productionRepository.save(productions);
      }

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

      // Disminuir used_kwh en las producciones
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);
      const productions = await productionRepository.find({
        where: { user: { id: req.user!.id }, deleted_at: IsNull() },
      });
      let remaining = offer.current_amount_kwh;
      for (const prod of productions) {
        if (parseFloat(prod.used_kwh.toString()) > 0) {
          const toDecrease = Math.min(remaining, parseFloat(prod.used_kwh.toString()));
          prod.used_kwh = parseFloat(prod.used_kwh.toString()) - toDecrease;
          remaining -= toDecrease;
          if (remaining <= 0) break;
        }
      }
      await productionRepository.save(productions);

      await offerRepository.update(id, { deleted_at: new Date() });
      res.json({ message: 'Offer deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}
