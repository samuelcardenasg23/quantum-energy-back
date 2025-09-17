import { Router } from 'express';
import { OfferController } from '../controllers/OfferController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación
router.use(authenticateToken);

router.get('/', OfferController.getOffers);
router.get('/:id', OfferController.getOfferById);
router.post('/', authorizeRoles('prosumidor', 'generador'), OfferController.createOffer);
router.put('/:id', OfferController.updateOffer);
router.delete('/:id', OfferController.deleteOffer);

export default router;
