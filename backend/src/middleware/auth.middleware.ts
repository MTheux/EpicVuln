import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { env } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Read token from HttpOnly cookie first, then fall back to Authorization header
        let token: string | undefined;

        if (req.cookies && req.cookies.vulncontrol_token) {
            token = req.cookies.vulncontrol_token;
        } else {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            res.status(401).json({ error: 'Token ausente ou invalido' });
            return;
        }

        const secret = env.JWT_SECRET;

        const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string; organizationId?: string };

        // Validar se o usuario ainda existe e esta ativo
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user || (!user.active)) {
            res.status(401).json({ error: 'Usuario desabilitado ou nao encontrado' });
            return;
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        };
        req.organizationId = user.organizationId || decoded.organizationId;

        next();
    } catch (error: any) {
        console.error('Authentication error:', error.message);
        // H3: Don't leak internal error details
        res.status(401).json({ error: 'Token invalido' });
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
