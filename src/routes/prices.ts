import { Router } from 'express';
import { PriceController } from '../controllers/PriceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas para lectura
/**
 * @openapi
 * /prices:
 *   get:
 *     tags: [Prices]
 *     summary: List provider prices (paginated)
 *     description: Public read. Returns non-deleted prices ordered by price_time ASC.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         required: false
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         required: false
 *     responses:
 *       200:
 *         description: Paginated prices
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedPrices' }
 *       500:
 *         description: Server error
 */
router.get('/', PriceController.getPrices);

/**
 * @openapi
 * /prices/{id}:
 *   get:
 *     tags: [Prices]
 *     summary: Get a price by ID
 *     description: Public read.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Price found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Price' }
 *       404:
 *         description: Price not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.get('/:id', PriceController.getPriceById);

// Rutas protegidas para admin (crear, editar, eliminar
/**
 * @openapi
 * /prices:
 *   post:
 *     tags: [Prices]
 *     summary: Create a price (admin)
 *     description: Protected. Creates a new provider price record.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreatePriceDTO' }
 *           examples:
 *             sample:
 *               value: { provider_name: "MainProvider", price_kwh: 0.21, price_time: "2025-09-20T10:00:00Z" }
 *     responses:
 *       201:
 *         description: Price created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Price' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken, PriceController.createPrice);

/**
 * @openapi
 * /prices/{id}:
 *   put:
 *     tags: [Prices]
 *     summary: Update a price (admin)
 *     description: Protected. Updates fields of a price record.
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
 *           schema: { $ref: '#/components/schemas/UpdatePriceDTO' }
 *           examples:
 *             sample:
 *               value: { price_kwh: 0.23 }
 *     responses:
 *       200:
 *         description: Price updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Price' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Price not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateToken, PriceController.updatePrice);

/**
 * @openapi
 * /prices/{id}:
 *   delete:
 *     tags: [Prices]
 *     summary: Delete a price (admin)
 *     description: Protected. Soft-deletes by setting deleted_at.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Price deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Price deleted successfully" }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Price not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateToken, PriceController.deletePrice);

export default router;
