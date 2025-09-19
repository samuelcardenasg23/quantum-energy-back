import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnergyProductionConsumption } from '../entities/EnergyProductionConsumption';
import { EnergyOffer } from '../entities/EnergyOffer';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';

export class ProductionController {
  static async getProductions(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);
      const offerRepository = AppDataSource.getRepository(EnergyOffer);

      const [productions, total] = await productionRepository.findAndCount({
        where: { user: { id: req.user!.id }, deleted_at: IsNull() },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      // Calcular excedente total
      const totalProduced = productions.reduce((sum, p) => sum + parseFloat(p.energy_produced_kwh.toString()), 0);
      const totalConsumed = productions.reduce((sum, p) => sum + parseFloat(p.energy_consumed_kwh.toString()), 0);
      const netProduction = totalProduced - totalConsumed;

      // Calcular excedente usado en ofertas activas y consumido en ventas
      const usedExcedente = productions.reduce((sum, p) => sum + parseFloat(p.used_kwh.toString()), 0);
      const consumedExcedente = productions.reduce((sum, p) => sum + parseFloat(p.consumed_kwh.toString()), 0);
      const availableExcedente = netProduction - usedExcedente - consumedExcedente;

      // Agregar excedente a cada producción
      const productionsWithExcedente = productions.map(p => ({
        ...p,
        net_production_kwh: parseFloat(p.energy_produced_kwh.toString()) - parseFloat(p.energy_consumed_kwh.toString()),
        available_excedente_kwh: (parseFloat(p.energy_produced_kwh.toString()) - parseFloat(p.energy_consumed_kwh.toString())) - parseFloat(p.used_kwh.toString()) - parseFloat(p.consumed_kwh.toString()),
      }));

      res.json({
        data: productionsWithExcedente,
        summary: {
          total_produced: totalProduced,
          total_consumed: totalConsumed,
          net_production: netProduction,
          used_excedente: usedExcedente,
          consumed_excedente: consumedExcedente,
          available_excedente: availableExcedente,
        },
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

  static async getProductionById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);

      const production = await productionRepository.findOne({
        where: { id: Number(id), user: { id: req.user!.id }, deleted_at: IsNull() },
      });

      if (!production) return res.status(404).json({ message: 'Production record not found' });

      const excedente = parseFloat(production.energy_produced_kwh.toString()) - parseFloat(production.energy_consumed_kwh.toString());
      const available = excedente - parseFloat(production.used_kwh.toString()) - parseFloat(production.consumed_kwh.toString());
      res.json({ data: { ...production, excedente_kwh: excedente, available_excedente_kwh: available } });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createProduction(req: AuthRequest, res: Response) {
    try {
      const { energy_produced_kwh, energy_consumed_kwh } = req.body;
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);

      const production = productionRepository.create({
        user: req.user,
        energy_produced_kwh,
        energy_consumed_kwh,
      });

      await productionRepository.save(production);
      res.status(201).json({ data: production });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateProduction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);

      const production = await productionRepository.findOne({
        where: { id: Number(id), user: { id: req.user!.id }, deleted_at: IsNull() },
      });

      if (!production) return res.status(404).json({ message: 'Production record not found' });

      await productionRepository.update(id, updates);
      const updatedProduction = await productionRepository.findOne({
        where: { id: Number(id) },
      });

      res.json({ data: updatedProduction });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteProduction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const productionRepository = AppDataSource.getRepository(EnergyProductionConsumption);

      const production = await productionRepository.findOne({
        where: { id: Number(id), user: { id: req.user!.id }, deleted_at: IsNull() },
      });

      if (!production) return res.status(404).json({ message: 'Production record not found' });

      await productionRepository.update(id, { deleted_at: new Date() });
      res.json({ message: 'Production record deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}
