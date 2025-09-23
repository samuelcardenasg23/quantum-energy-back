import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { EnergyOffer } from '../entities/EnergyOffer';
import { EnergyProductionConsumption } from '../entities/EnergyProductionConsumption';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';
import { createLogger } from '../config/logger';
import { getCorrelationId } from '../middleware/correlationId';
import { metrics } from '../utils/metrics';

export class OrderController {
  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const orderRepository = AppDataSource.getRepository(Order);

      const [orders, total] = await orderRepository.findAndCount({
        where: { user: { id: req.user!.id }, deleted_at: IsNull() },
        relations: ['offer', 'offer.user'],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      res.json({
        data: orders,
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

  static async getOrderById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const orderRepository = AppDataSource.getRepository(Order);

      const order = await orderRepository.findOne({
        where: { id: Number(id), user: { id: req.user!.id }, deleted_at: IsNull() },
        relations: ['offer', 'offer.user'],
      });

      if (!order) return res.status(404).json({ message: 'Order not found' });

      res.json({ data: order });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async createOrder(req: AuthRequest, res: Response) {
    const logger = createLogger('OrderController');
    const correlationId = getCorrelationId(req);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { offer_id, quantity_kwh } = req.body;
      
      logger.info('Order creation attempt', {
        correlationId,
        userId: req.user!.id,
        offer_id,
        quantity_kwh
      });
      
      const orderRepository = queryRunner.manager.getRepository(Order);
      const offerRepository = queryRunner.manager.getRepository(EnergyOffer);

      const offer = await offerRepository.findOne({
        where: { id: offer_id, deleted_at: IsNull() },
        relations: ['user'],
      });

      if (!offer) {
        await queryRunner.rollbackTransaction();
        metrics.incrementCounter('orders_creation_failed');
        metrics.incrementCounter('orders_creation_failed', 1, { reason: 'offer_not_found' });
        
        logger.warn('Order creation failed - offer not found', {
          correlationId,
          userId: req.user!.id,
          offer_id
        });
        
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      if (offer.user.id === req.user!.id) {
        await queryRunner.rollbackTransaction();
        metrics.incrementCounter('orders_creation_failed');
        metrics.incrementCounter('orders_creation_failed', 1, { reason: 'own_offer' });
        
        logger.warn('Order creation failed - user trying to buy own offer', {
          correlationId,
          userId: req.user!.id,
          offer_id
        });
        
        return res.status(400).json({ message: 'Cannot purchase your own offer' });
      }
      
      if (offer.offer_status !== 'available') {
        await queryRunner.rollbackTransaction();
        metrics.incrementCounter('orders_creation_failed');
        metrics.incrementCounter('orders_creation_failed', 1, { reason: 'offer_unavailable' });
        
        logger.warn('Order creation failed - offer not available', {
          correlationId,
          userId: req.user!.id,
          offer_id,
          offer_status: offer.offer_status
        });
        
        return res.status(400).json({ message: 'Offer not available' });
      }
      
      if (offer.current_amount_kwh < quantity_kwh) {
        await queryRunner.rollbackTransaction();
        metrics.incrementCounter('orders_creation_failed');
        metrics.incrementCounter('orders_creation_failed', 1, { reason: 'insufficient_quantity' });
        
        logger.warn('Order creation failed - insufficient quantity', {
          correlationId,
          userId: req.user!.id,
          offer_id,
          requested: quantity_kwh,
          available: offer.current_amount_kwh
        });
        
        return res.status(400).json({ message: 'Insufficient quantity available' });
      }

      const total_price = quantity_kwh * offer.price_kwh;

      const order = orderRepository.create({
        user: req.user,
        offer,
        quantity_kwh,
        total_price,
      });

      await orderRepository.save(order);

      // Update offer stock
      offer.current_amount_kwh -= quantity_kwh;
      if (offer.current_amount_kwh <= 0) {
        offer.offer_status = 'unavailable';
      }
      await offerRepository.save(offer);

      // Update production used and consumed
      const productionRepository = queryRunner.manager.getRepository(EnergyProductionConsumption);
      const productions = await productionRepository.find({
        where: { user: { id: offer.user.id }, deleted_at: IsNull() },
      });
      let remainingUsed = quantity_kwh;
      for (const prod of productions) {
        if (remainingUsed > 0 && parseFloat(prod.used_kwh.toString()) > 0) {
          const toDecrease = Math.min(remainingUsed, parseFloat(prod.used_kwh.toString()));
          prod.used_kwh = parseFloat(prod.used_kwh.toString()) - toDecrease;
          remainingUsed -= toDecrease;
        }
        if (remainingUsed <= 0) break;
      }
      // Increase consumed_kwh in the first production
      if (productions.length > 0) {
        productions[0].consumed_kwh = parseFloat(productions[0].consumed_kwh.toString()) + quantity_kwh;
      }
      await productionRepository.save(productions);

      await queryRunner.commitTransaction();
      
      // Record successful order creation with business metrics
      metrics.incrementCounter('orders_created');
      metrics.incrementCounter('orders_created', 1, { buyer_role: req.user!.user_role });
      metrics.incrementCounter('orders_created', 1, { seller_role: offer.user.user_role });
      metrics.recordHistogram('order_energy_quantity_kwh', quantity_kwh);
      metrics.recordHistogram('order_total_price', total_price);
      metrics.recordHistogram('order_price_per_kwh', offer.price_kwh);
      
      // Mark offer as sold/accepted for metrics
      metrics.incrementCounter('offers_accepted');
      metrics.incrementCounter('offers_accepted', 1, { seller_role: offer.user.user_role });
      
      logger.info('Order created successfully', {
        correlationId,
        orderId: order.id,
        buyerId: req.user!.id,
        sellerId: offer.user.id,
        offer_id,
        quantity_kwh,
        total_price,
        price_per_kwh: offer.price_kwh
      });
      
      res.status(201).json({ data: order });
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      
      // Record error metrics
      metrics.incrementCounter('orders_creation_failed');
      metrics.incrementCounter('orders_creation_failed', 1, { reason: 'server_error' });
      
      logger.error('Order creation error', {
        correlationId,
        userId: req.user?.id,
        offer_id: req.body.offer_id,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({ message: 'Server error' });
    } finally {
      await queryRunner.release();
    }
  }

  static async updateOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const orderRepository = AppDataSource.getRepository(Order);

      const order = await orderRepository.findOne({
        where: { id: Number(id), user: { id: req.user!.id }, deleted_at: IsNull() },
        relations: ['offer'],
      });

      if (!order) return res.status(404).json({ message: 'Order not found' });

      await orderRepository.update(id, updates);
      const updatedOrder = await orderRepository.findOne({
        where: { id: Number(id) },
        relations: ['offer', 'offer.user'],
      });

      res.json({ data: updatedOrder });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const orderRepository = AppDataSource.getRepository(Order);

      const order = await orderRepository.findOne({
        where: { id: Number(id), user: { id: req.user!.id }, deleted_at: IsNull() },
      });

      if (!order) return res.status(404).json({ message: 'Order not found' });

      await orderRepository.update(id, { deleted_at: new Date() });
      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
}
