import { Router } from 'express';
import { MarketController } from '../controllers/MarketController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/simulate-purchase', authenticateToken, MarketController.simulatePurchase);

export default router;
