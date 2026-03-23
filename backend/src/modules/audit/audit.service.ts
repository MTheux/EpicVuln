import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditEntry {
  action: AuditAction;
  entity?: string;
  entityId?: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
  metadata?: any;
}

export class AuditService {
  static async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          description: entry.description,
          previousValue: entry.previousValue ? JSON.stringify(entry.previousValue) : null,
          newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
          userId: entry.userId,
          userEmail: entry.userEmail,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          organizationId: entry.organizationId,
          metadata: entry.metadata,
        },
      });
    } catch (err) {
      console.error('[AuditLog] Failed to write audit entry:', err);
    }
  }

  static async getAll(filters: {
    action?: AuditAction;
    entity?: string;
    userId?: string;
    organizationId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.userId) where.userId = filters.userId;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static fromRequest(req: any): Pick<AuditEntry, 'userId' | 'userEmail' | 'ipAddress' | 'userAgent' | 'organizationId'> {
    return {
      userId: req.userId,
      userEmail: req.userEmail || req.user?.email,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      organizationId: req.organizationId,
    };
  }
}
