import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email, example: "test@mail.com" }
 *               password: { type: string, minLength: 8, example: "MyPass123" }
 *               name: { type: string, example: "Gabriel" }
 *             required: [email, password, name]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Invalid input
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "test@mail.com" }
 *               password: { type: string, example: "MyPass123" }
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Login successful (returns JWT)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string, example: "eyJhbGciOi..." }
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized (missing or invalid token)
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router;
