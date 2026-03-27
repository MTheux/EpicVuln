import { Router, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../rate-limiters';

const router = Router();
const authController = new AuthController();

router.post('/login', authLimiter, authController.login.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

// Logout endpoint to clear both cookies
router.post('/logout', (req: Request, res: Response) => {
  const clearOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };

  res.cookie('epicvuln_token', '', { ...clearOptions, httpOnly: true });
  res.cookie('epicvuln_session', '', { ...clearOptions, httpOnly: false });
  res.json({ success: true });
});

export default router;
