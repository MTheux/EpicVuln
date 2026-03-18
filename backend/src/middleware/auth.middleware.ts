import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { env } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token missing or invalid' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const secret = env.JWT_SECRET;

        const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };

        // Validar se o usuário ainda existe e está ativo
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user || (!user.active)) {
            res.status(401).json({ error: 'User is disabled or not found' });
            return;
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error: any) {
        console.error('Authentication error:', error.message);
        res.status(401).json({ error: `Invalid token: ${error.message}` });
        return;
    }
};

export const requireRoles = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }

        next();
    };
};
