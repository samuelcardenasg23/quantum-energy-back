import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación
router.use(authenticateToken);

router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.post('/', OrderController.createOrder);
router.put('/:id', OrderController.updateOrder);
router.delete('/:id', OrderController.deleteOrder);

export default router;
