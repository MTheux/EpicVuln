import { Router, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../rate-limiters';

const router = Router();
const authController = new AuthController();

router.post('/login', authLimiter, authController.login.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

// Logout endpoint to clear HttpOnly cookie
router.post('/logout', (req: Request, res: Response) => {
  res.cookie('vulncontrol_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  res.json({ success: true });
});

export default router;
