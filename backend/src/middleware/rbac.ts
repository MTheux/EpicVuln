import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Nao autenticado.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Acesso negado. Permissao insuficiente.',
      });
      return;
    }

    next();
  };
}
