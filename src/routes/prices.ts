import { Router } from 'express';
import { PriceController } from '../controllers/PriceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas para lectura
router.get('/', PriceController.getPrices);
router.get('/:id', PriceController.getPriceById);

// Rutas protegidas para admin (crear, editar, eliminar)
router.post('/', authenticateToken, PriceController.createPrice);
router.put('/:id', authenticateToken, PriceController.updatePrice);
router.delete('/:id', authenticateToken, PriceController.deletePrice);

export default router;
