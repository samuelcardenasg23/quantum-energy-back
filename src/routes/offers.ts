import { Router } from 'express';
import { OfferController } from '../controllers/OfferController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación
router.use(authenticateToken);

/**
 * @openapi
 * /offers:
 *   get:
 *     tags: [Offers]
 *     summary: List offers (paginated)
 *     description: Returns non-deleted offers. Supports filtering by status and user_id.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         required: false
 *         description: Page number (1-based).
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         required: false
 *         description: Page size.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [available, unavailable] }
 *         required: false
 *         description: Offer status filter.
 *       - in: query
 *         name: user_id
 *         schema: { type: integer }
 *         required: false
 *         description: Filter by owner user id.
 *     responses:
 *       200:
 *         description: Paginated list of offers
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedOffers' }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', OfferController.getOffers);

/**
 * @openapi
 * /offers/{id}:
 *   get:
 *     tags: [Offers]
 *     summary: Get a single offer by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Offer not found
 *       500:
 *         description: Server error
 */
router.get('/:id', OfferController.getOfferById);

/**
 * @openapi
 * /offers:
 *   post:
 *     tags: [Offers]
 *     summary: Create a new offer
 *     description: Requires roles **prosumidor** or **generador**. Validates available excedente and updates `used_kwh` proportionally.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateOfferDTO' }
 *           examples:
 *             sample:
 *               value: { total_amount_kwh: 120, current_amount_kwh: 120, price_kwh: 0.18 }
 *     responses:
 *       201:
 *         description: Offer created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       400:
 *         description: Business rule violation (e.g., insufficient excedente or allocation failure)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               insufficient:
 *                 value: { message: "Insufficient available excedente" }
 *               allocate:
 *                 value: { message: "Could not allocate all energy to productions" }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (role not allowed)
 *       500:
 *         description: Server error
 */
router.post('/', authorizeRoles('prosumidor', 'generador'), OfferController.createOffer);

/**
 * @openapi
 * /offers/{id}:
 *   put:
 *     tags: [Offers]
 *     summary: Update an offer (owner only)
 *     description: Adjusts producer `used_kwh` if `current_amount_kwh` changes.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateOfferDTO' }
 *           examples:
 *             updateAmount:
 *               value: { current_amount_kwh: 80, price_kwh: 0.19 }
 *     responses:
 *       200:
 *         description: Offer updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner)
 *       404:
 *         description: Offer not found
 *       500:
 *         description: Server error
 */
router.put('/:id', OfferController.updateOffer);

/**
 * @openapi
 * /offers/{id}:
 *   delete:
 *     tags: [Offers]
 *     summary: Soft-delete an offer (owner only)
 *     description: Decreases producer `used_kwh` accordingly and sets `deleted_at`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Offer deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Offer deleted successfully" }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner)
 *       404:
 *         description: Offer not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', OfferController.deleteOffer);

export default router;
