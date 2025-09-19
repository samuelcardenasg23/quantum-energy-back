import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnergyPricePerHour } from '../entities/EnergyPricePerHour';
import { EnergyOffer } from '../entities/EnergyOffer';
import { Order } from '../entities/Order';
import { EnergyProductionConsumption } from '../entities/EnergyProductionConsumption';
import { User } from '../entities/User';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';

export class MarketController {
  static async simulatePurchase(req: AuthRequest, res: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener precio más reciente del proveedor
      const priceRepository = queryRunner.manager.getRepository(EnergyPricePerHour);
      const latestPrice = await priceRepository.findOne({
        where: {},
        order: { price_time: 'DESC' },
      });
      if (!latestPrice) {
        return res.status(400).json({ message: 'No provider prices available' });
      }

      // 2. Obtener user especial del proveedor
      const userRepository = queryRunner.manager.getRepository(User);
      const systemUser = await userRepository.findOneBy({ email: 'system@provider.com' });
      if (!systemUser) {
        return res.status(400).json({ message: 'System user not found' });
      }

      // 3. Obtener ofertas disponibles
      const offerRepository = queryRunner.manager.getRepository(EnergyOffer);
      const availableOffers = await offerRepository.find({
        where: { offer_status: 'available', deleted_at: IsNull() },
        relations: ['user'],
      });

      if (availableOffers.length === 0) {
        return res.status(200).json({ message: 'No available offers to purchase' });
      }

      // 4. Procesar cada oferta
      const orderRepository = queryRunner.manager.getRepository(Order);
      const productionRepository = queryRunner.manager.getRepository(EnergyProductionConsumption);
      let totalPurchased = 0;
      let totalCost = 0;

      for (const offer of availableOffers) {
        const quantity = offer.current_amount_kwh;
        const price = latestPrice.price_kwh;
        const cost = quantity * price;

        // Crear orden simulada
        const order = orderRepository.create({
          user: systemUser,
          offer,
          quantity_kwh: quantity,
          total_price: cost,
        });
        await orderRepository.save(order);

        // Actualizar oferta a unavailable
        offer.current_amount_kwh = 0;
        offer.offer_status = 'unavailable';
        await offerRepository.save(offer);

        // Actualizar producción del vendedor
        const productions = await productionRepository.find({
          where: { user: { id: offer.user.id }, deleted_at: IsNull() },
        });
        let remaining = quantity;
        for (const prod of productions) {
          if (remaining > 0 && parseFloat(prod.used_kwh.toString()) > 0) {
            const toDecrease = Math.min(remaining, parseFloat(prod.used_kwh.toString()));
            prod.used_kwh = parseFloat(prod.used_kwh.toString()) - toDecrease;
            prod.consumed_kwh = parseFloat(prod.consumed_kwh.toString()) + toDecrease;
            remaining -= toDecrease;
          }
          if (remaining <= 0) break;
        }
        await productionRepository.save(productions);

        totalPurchased += quantity;
        totalCost += cost;
      }

      await queryRunner.commitTransaction();
      res.json({
        message: 'Simulated purchase completed',
        summary: {
          offers_processed: availableOffers.length,
          total_energy_purchased_kwh: totalPurchased,
          total_cost: totalCost,
          provider_price_used: latestPrice.price_kwh,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in simulatePurchase:', error);
      res.status(500).json({ message: 'Server error during simulation' });
    } finally {
      await queryRunner.release();
    }
  }
}
