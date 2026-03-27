import { prisma } from '../../app';
import { emailService } from '../../services/email.service';
import { manualNotificationEmail } from '../../services/email-templates';
import {
  checkSlaWarnings,
  checkSlaExpired,
  checkEscalationToManager,
  checkEscalationToCLevel,
  sendWeeklyDigest,
} from '../../services/sla-scheduler.service';

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'] as const;

export class NotificationsService {
  async sendManualNotification({
    squad,
    motivo,
    body,
    userId,
  }: {
    squad: string;
    motivo: string;
    body: string;
    userId: string;
  }) {
    const recipient = `po-${squad.toLowerCase().replace(/\s+/g, '')}@unisys.com`;
    const email = manualNotificationEmail(squad, motivo, body);
    const subject = `[EpicVuln] Notificacao — ${motivo}`;

    let status = 'sent';
    let error: string | undefined;

    try {
      await emailService.sendEmail(recipient, subject, email);
    } catch (err: any) {
      status = 'failed';
      error = err?.message;
    }

    const log = await prisma.notificationLog.create({
      data: {
        channel: 'EMAIL',
        recipient,
        subject,
        body,
        status,
        error,
        sentById: userId,
      },
    });

    return log;
  }

  async triggerJob(jobName: string) {
    switch (jobName) {
      case 'sla-warning':
        await checkSlaWarnings();
        break;
      case 'sla-expired':
        await checkSlaExpired();
        break;
      case 'escalation-manager':
        await checkEscalationToManager();
        break;
      case 'escalation-clevel':
        await checkEscalationToCLevel();
        break;
      case 'weekly-digest':
        await sendWeeklyDigest();
        break;
      default:
        throw new Error(`Unknown job name: ${jobName}`);
    }
  }

  async getRules() {
    return prisma.notificationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule({
    name,
    condition,
    channel,
    recipients,
  }: {
    name: string;
    condition: string;
    channel?: string;
    recipients?: string[];
  }) {
    return prisma.notificationRule.create({
      data: {
        name,
        condition,
        channel: (channel?.toUpperCase() as any) || 'EMAIL',
        recipients: recipients ?? [],
      },
    });
  }

  async toggleRule(id: string) {
    const rule = await prisma.notificationRule.findUnique({ where: { id } });
    if (!rule) throw new Error('Rule not found');

    return prisma.notificationRule.update({
      where: { id },
      data: { active: !rule.active },
    });
  }

  async deleteRule(id: string) {
    return prisma.notificationRule.delete({ where: { id } });
  }

  async getLogs(limit = 50) {
    return prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sentBy: {
          select: { name: true },
        },
      },
    });
  }

  async getStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      notificacoesHoje,
      regrasAtivas,
      totalRegras,
      todayLogs,
      criticasSemRetorno,
      proximosSLAs,
    ] = await Promise.all([
      // notificacoesHoje
      prisma.notificationLog.count({
        where: { createdAt: { gte: startOfDay } },
      }),

      // regrasAtivas
      prisma.notificationRule.count({
        where: { active: true },
      }),

      // totalRegras
      prisma.notificationRule.count(),

      // todayLogs for squadsNotificadas (distinct recipients)
      prisma.notificationLog.findMany({
        where: { createdAt: { gte: startOfDay } },
        select: { recipient: true },
        distinct: ['recipient'],
      }),

      // criticasSemRetorno: vulns with CRITICA in open statuses
      // that have NO VulnerabilityHistory with eventType NOTIFICACAO_ENVIADA in last 7 days
      prisma.vulnerability.count({
        where: {
          criticidade: { in: ['CRITICA'] },
          status: { in: [...OPEN_STATUSES] },
          NOT: {
            history: {
              some: {
                eventType: 'NOTIFICACAO_ENVIADA',
                createdAt: { gte: sevenDaysAgo },
              },
            },
          },
        },
      }),

      // proximosSLAs: vulns with SLA between now and now+3days in open statuses
      prisma.vulnerability.count({
        where: {
          status: { in: [...OPEN_STATUSES] },
          sla: { gte: now, lte: threeDaysFromNow },
        },
      }),
    ]);

    return {
      notificacoesHoje,
      regrasAtivas,
      totalRegras,
      squadsNotificadas: todayLogs.length,
      criticasSemRetorno,
      proximosSLAs,
    };
  }

  async getEmailStatus() {
    const configured = await emailService.verifyConnection();
    return { configured, provider: 'SMTP' };
  }
}
