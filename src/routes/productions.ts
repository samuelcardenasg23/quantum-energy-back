import { Router } from 'express';
import { ProductionController } from '../controllers/ProductionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación
router.use(authenticateToken);

/**
 * @openapi
 * /productions:
 *   get:
 *     tags: [Productions]
 *     summary: List productions (current user)
 *     description: Returns non-deleted production/consumption records for the authenticated user, plus a summary of totals and pagination.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated productions with summary
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ProductionsListResponse' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/', ProductionController.getProductions);
/**
 * @openapi
 * /productions/{id}:
 *   get:
 *     tags: [Productions]
 *     summary: Get a production record by ID (current user)
 *     description: Returns one production record plus computed excedente/available_excedente fields.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Production found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/ProductionWithComputed' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Production record not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               notFound:
 *                 value: { message: "Production record not found" }
 *       500:
 *         description: Server error
 */
router.get('/:id', ProductionController.getProductionById);
/**
 * @openapi
 * /productions:
 *   post:
 *     tags: [Productions]
 *     summary: Create a production record
 *     description: Creates an energy production/consumption record for the current user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateProductionDTO' }
 *           examples:
 *             sample:
 *               value: { energy_produced_kwh: 200, energy_consumed_kwh: 50 }
 *     responses:
 *       201:
 *         description: Production created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Production' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.post('/', ProductionController.createProduction);
/**
 * @openapi
 * /productions/{id}:
 *   put:
 *     tags: [Productions]
 *     summary: Update a production record
 *     description: Updates fields; returns the updated record.
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
 *           schema: { $ref: '#/components/schemas/UpdateProductionDTO' }
 *           examples:
 *             sample:
 *               value: { energy_produced_kwh: 250 }
 *     responses:
 *       200:
 *         description: Production updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Production' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Production record not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.put('/:id', ProductionController.updateProduction);
/**
 * @openapi
 * /productions/{id}:
 *   delete:
 *     tags: [Productions]
 *     summary: Delete a production record (soft-delete)
 *     description: Marks the record as deleted and returns a confirmation message.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Production deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Production record deleted successfully" }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Production record not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Server error
 */
router.delete('/:id', ProductionController.deleteProduction);

export default router;
