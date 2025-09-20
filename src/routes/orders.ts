import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación
router.use(authenticateToken);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders (paginated, current user)
 *     description: Returns non-deleted orders for the authenticated user.
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
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedOrders' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/', OrderController.getOrders);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order by ID (current user)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Order' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               notFound:
 *                 value: { message: "Order not found" }
 *       500:
 *         description: Server error
 */
router.get('/:id', OrderController.getOrderById);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create an order
 *     description: >
 *       Creates an order for the authenticated user from an available offer.
 *       Updates offer stock and producer energy accounting within a transaction.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateOrderDTO' }
 *           examples:
 *             sample:
 *               value: { offer_id: 1, quantity_kwh: 50 }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Business rule violation
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               ownOffer:
 *                 value: { message: "Cannot purchase your own offer" }
 *               notAvailable:
 *                 value: { message: "Offer not available" }
 *               insufficient:
 *                 value: { message: "Insufficient quantity available" }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Offer not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               notFound:
 *                 value: { message: "Offer not found" }
 *       500:
 *         description: Server error
 */
router.post('/', OrderController.createOrder);

/**
 * @openapi
 * /orders/{id}:
 *   put:
 *     tags: [Orders]
 *     summary: Update an order (current user)
 *     description: Updates order fields. Controller returns the updated order populated with offer and offer.user.
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
 *           schema: { $ref: '#/components/schemas/UpdateOrderDTO' }
 *           examples:
 *             updateQty:
 *               value: { quantity_kwh: 60 }
 *             updateStatus:
 *               value: { status: "cancelled" }
 *     responses:
 *       200:
 *         description: Order updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Order' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.put('/:id', OrderController.updateOrder);

/**
 * @openapi
 * /orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: Soft-delete an order (current user)
 *     description: Sets deleted_at and returns a confirmation message.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Order deleted successfully" }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.delete('/:id', OrderController.deleteOrder);

export default router;
