import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request to include organizationId
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // req.user is set by auth middleware (has id, email, role)
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(); // No user = no tenant filtering (handled by auth middleware)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (user?.organizationId) {
      req.organizationId = user.organizationId;
    }

    next();
  } catch (error) {
    next(); // Don't block on tenant resolution errors
  }
}
