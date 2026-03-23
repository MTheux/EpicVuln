import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await this.authService.login(email, password);

      const cookieOptions = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/',
      };

      // HttpOnly cookie with the JWT token (not accessible from JS)
      res.cookie('vulncontrol_token', result.token, {
        ...cookieOptions,
        httpOnly: true,
      });

      // Non-HttpOnly session flag (for middleware/JS to check auth state)
      res.cookie('vulncontrol_session', '1', {
        ...cookieOptions,
        httpOnly: false,
      });

      // Return user data but NOT the token in the response body
      res.json({ user: result.user });
    } catch (error: any) {
      if (error.message === 'Invalid credentials' || error.message === 'User is disable') {
        res.status(401).json({ error: error.message });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.authService.getMe(userId);
      res.json(user);
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
