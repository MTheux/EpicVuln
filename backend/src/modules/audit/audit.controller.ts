import { Request, Response } from 'express';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';

export class AuditController {
  static async getLogs(req: Request, res: Response) {
    try {
      const { action, entity, userId, from, to, page, limit } = req.query;
      const result = await AuditService.getAll({
        action: action as AuditAction | undefined,
        entity: entity as string | undefined,
        userId: userId as string | undefined,
        organizationId: (req as any).organizationId,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
