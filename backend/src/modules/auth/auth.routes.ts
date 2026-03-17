import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../rate-limiters';

const router = Router();
const authController = new AuthController();

router.post('/login', authLimiter, authController.login.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
