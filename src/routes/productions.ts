import { Router } from 'express';
import { ProductionController } from '../controllers/ProductionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación
router.use(authenticateToken);

router.get('/', ProductionController.getProductions);
router.get('/:id', ProductionController.getProductionById);
router.post('/', ProductionController.createProduction);
router.put('/:id', ProductionController.updateProduction);
router.delete('/:id', ProductionController.deleteProduction);

export default router;
