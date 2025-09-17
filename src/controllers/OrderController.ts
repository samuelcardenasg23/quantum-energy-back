import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { EnergyOffer } from '../entities/EnergyOffer';
import { AuthRequest } from '../middleware/auth';
import { IsNull } from 'typeorm';

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
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { offer_id, quantity_kwh } = req.body;
      const orderRepository = queryRunner.manager.getRepository(Order);
      const offerRepository = queryRunner.manager.getRepository(EnergyOffer);

      const offer = await offerRepository.findOne({
        where: { id: offer_id, deleted_at: IsNull() },
        relations: ['user'],
      });

      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.user.id === req.user!.id) return res.status(400).json({ message: 'Cannot purchase your own offer' });
      if (offer.offer_status !== 'available') return res.status(400).json({ message: 'Offer not available' });
      if (offer.current_amount_kwh < quantity_kwh) return res.status(400).json({ message: 'Insufficient quantity available' });

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

      await queryRunner.commitTransaction();
      res.status(201).json({ data: order });
    } catch (error) {
      await queryRunner.rollbackTransaction();
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
