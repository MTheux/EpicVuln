import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../app';
import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware that validates JWT and checks user active status in DB.
 * Reads token from HttpOnly cookie first, then falls back to Authorization header.
 *
 * NOTE: Prefer using auth.middleware.ts (authenticate) for all routes.
 * This file is kept for backward compatibility only.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Read token from HttpOnly cookie first, then fall back to Authorization header
  let token: string | undefined;

  if (req.cookies && req.cookies.vulncontrol_token) {
    token = req.cookies.vulncontrol_token;
  } else {
    const authHeader = req.headers.authorization;
    token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  }

  if (!token) {
    res.status(401).json({ message: 'Token de autenticacao nao fornecido.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Validate user is still active in database
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.active) {
      res.status(401).json({ message: 'Usuario desabilitado ou nao encontrado.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expirado.' });
      return;
    }
    res.status(401).json({ message: 'Token invalido.' });
    return;
  }
}
