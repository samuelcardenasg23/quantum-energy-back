import { Router } from 'express';
import { MarketController } from '../controllers/MarketController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /markets/simulate-purchase:
 *   post:
 *     tags: [Markets]
 *     summary: Simulate a marketplace purchase (uses latest provider price)
 *     description: >
 *       Processes all *available* offers and creates **orders** using the latest provider price per kWh.
 *       **Note:** Although named "simulate", this endpoint **persists changes**:
 *       - Creates Order records.
 *       - Sets offers to `unavailable` with `current_amount_kwh = 0`.
 *       - Updates producer `EnergyProductionConsumption` (moves kWh from `used_kwh` to `consumed_kwh`).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Simulation processed (or no offers available)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SimulationResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: No available offers to purchase
 *       400:
 *         description: Missing provider data (latest price) or system user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               noPrice:
 *                 value: { message: "No provider prices available" }
 *               noUser:
 *                 value: { message: "System user not found" }
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       500:
 *         description: Internal server error during simulation
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               serverErr:
 *                 value: { message: "Server error during simulation" }
 */
router.post('/simulate-purchase', authenticateToken, MarketController.simulatePurchase);

export default router;
