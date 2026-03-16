// ---------------------------------------------------------------------------
// SLA Scheduler — periodic jobs for vulnerability SLA checks & escalation
// ---------------------------------------------------------------------------

import cron from 'node-cron';
import { prisma } from '../app';
import { emailService } from './email.service';
import {
  VulnSummary,
  SquadSummary,
  slaWarningEmail,
  slaExpiredEmail,
  escalationToManagerEmail,
  escalationToCLevelEmail,
  weeklyDigestEmail,
} from './email-templates';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOpenVulnsWithSla() {
  return prisma.vulnerability.findMany({
    where: {
      status: { in: [...OPEN_STATUSES] },
      sla: { not: null },
    },
    select: {
      id: true,
      titulo: true,
      codigoInterno: true,
      criticidade: true,
      sla: true,
      diasEmAberto: true,
      squad: true,
      gestor: true,
      jiraKey: true,
      responsavel: true,
    },
  });
}

function groupBySquad<T extends { squad: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.squad;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function toVulnSummary(v: {
  titulo: string;
  codigoInterno: string;
  criticidade: string;
  sla: Date | null;
  diasEmAberto: number;
  squad: string;
  jiraKey: string | null;
}): VulnSummary {
  return {
    titulo: v.titulo,
    codigoInterno: v.codigoInterno,
    criticidade: v.criticidade,
    sla: v.sla ? v.sla.toISOString().slice(0, 10) : '-',
    diasEmAberto: v.diasEmAberto,
    squad: v.squad,
    jiraKey: v.jiraKey ?? undefined,
  };
}

async function logNotification(
  channel: 'EMAIL' | 'SLACK' | 'TEAMS',
  recipient: string,
  subject: string,
  body: string,
  status: string,
  error?: string,
) {
  await prisma.notificationLog.create({
    data: { channel, recipient, subject, body, status, error },
  });
}

// ---------------------------------------------------------------------------
// Job 1 — SLA Warning (expires within 3 days)
// Daily 08:00
// ---------------------------------------------------------------------------

export async function checkSlaWarnings() {
  console.log('[SLA-SCHEDULER] Running checkSlaWarnings...');
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const filtered = vulns.filter((v) => v.sla! >= now && v.sla! <= threeDaysFromNow);

  if (filtered.length === 0) {
    console.log('[SLA-SCHEDULER] No SLA warnings found.');
    return;
  }

  const grouped = groupBySquad(filtered);

  for (const [squad, items] of grouped) {
    const summaries = items.map(toVulnSummary);
    const subject = `[VulnControl] Aviso de SLA — ${squad} (${items.length} vuln(s) expirando)`;
    const html = slaWarningEmail(squad, summaries);
    const recipient = `po-${squad}@credsystem.com`;

    try {
      await emailService.sendEmail(recipient, subject, html);
      await logNotification('EMAIL', recipient, subject, html, 'sent');
    } catch (err: any) {
      await logNotification('EMAIL', recipient, subject, html, 'failed', err?.message);
    }

    // Log to VulnerabilityHistory
    for (const v of items) {
      await prisma.vulnerabilityHistory.create({
        data: {
          vulnerabilityId: v.id,
          eventType: 'NOTIFICACAO_ENVIADA',
          description: `Aviso de SLA: expira em ate 3 dias. Notificacao enviada para ${recipient}.`,
        },
      });
    }
  }

  console.log(`[SLA-SCHEDULER] checkSlaWarnings done — ${filtered.length} vuln(s) notified.`);
}

// ---------------------------------------------------------------------------
// Job 2 — SLA Expired (expired within last 7 days)
// Daily 08:30
// ---------------------------------------------------------------------------

export async function checkSlaExpired() {
  console.log('[SLA-SCHEDULER] Running checkSlaExpired...');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const filtered = vulns.filter((v) => v.sla! < now && v.sla! >= sevenDaysAgo);

  if (filtered.length === 0) {
    console.log('[SLA-SCHEDULER] No expired SLAs found.');
    return;
  }

  const grouped = groupBySquad(filtered);

  for (const [squad, items] of grouped) {
    const summaries = items.map(toVulnSummary);
    const subject = `[VulnControl] SLA Expirado — ${squad} (${items.length} vuln(s))`;
    const html = slaExpiredEmail(squad, summaries);
    const recipient = `po-${squad}@credsystem.com`;

    try {
      await emailService.sendEmail(recipient, subject, html);
      await logNotification('EMAIL', recipient, subject, html, 'sent');
    } catch (err: any) {
      await logNotification('EMAIL', recipient, subject, html, 'failed', err?.message);
    }
  }

  console.log(`[SLA-SCHEDULER] checkSlaExpired done — ${filtered.length} vuln(s) notified.`);
}

// ---------------------------------------------------------------------------
// Job 3 — Escalation to Manager (expired > 7 days, <= 14 days)
// Daily 09:00
// ---------------------------------------------------------------------------

export async function checkEscalationToManager() {
  console.log('[SLA-SCHEDULER] Running checkEscalationToManager...');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const filtered = vulns.filter((v) => v.sla! < sevenDaysAgo && v.sla! >= fourteenDaysAgo);

  if (filtered.length === 0) {
    console.log('[SLA-SCHEDULER] No manager escalations found.');
    return;
  }

  const grouped = groupBySquad(filtered);

  for (const [squad, items] of grouped) {
    const summaries = items.map(toVulnSummary);
    const gestor = items[0].gestor ?? squad;
    const subject = `[VulnControl] Escalacao ao Gestor — ${squad} (${items.length} vuln(s) sem resolucao)`;
    const html = escalationToManagerEmail(gestor, squad, summaries);
    const recipient = `gestor-${squad}@credsystem.com`;

    try {
      await emailService.sendEmail(recipient, subject, html);
      await logNotification('EMAIL', recipient, subject, html, 'sent');
    } catch (err: any) {
      await logNotification('EMAIL', recipient, subject, html, 'failed', err?.message);
    }

    // Log to VulnerabilityHistory
    for (const v of items) {
      await prisma.vulnerabilityHistory.create({
        data: {
          vulnerabilityId: v.id,
          eventType: 'NOTIFICACAO_ENVIADA',
          description: `Escalacao ao gestor: SLA expirado ha mais de 7 dias. Notificacao enviada para ${recipient}.`,
        },
      });
    }
  }

  console.log(`[SLA-SCHEDULER] checkEscalationToManager done — ${filtered.length} vuln(s) escalated.`);
}

// ---------------------------------------------------------------------------
// Job 4 — Escalation to C-Level (expired > 14 days)
// Monday 09:30
// ---------------------------------------------------------------------------

export async function checkEscalationToCLevel() {
  console.log('[SLA-SCHEDULER] Running checkEscalationToCLevel...');
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const filtered = vulns.filter((v) => v.sla! < fourteenDaysAgo);

  if (filtered.length === 0) {
    console.log('[SLA-SCHEDULER] No C-Level escalations found.');
    return;
  }

  const summaries = filtered.map(toVulnSummary);

  // Build squad summary
  const grouped = groupBySquad(filtered);
  const squadSummary: SquadSummary[] = [];
  for (const [squad, items] of grouped) {
    squadSummary.push({
      squad,
      total: items.length,
      criticas: items.filter((v) => v.criticidade === 'CRITICA').length,
      altas: items.filter((v) => v.criticidade === 'ALTA').length,
      expiradas: items.length, // all are expired by definition
    });
  }

  const subject = `[VulnControl] Escalacao Executiva — ${filtered.length} vuln(s) sem resolucao ha 14+ dias`;
  const html = escalationToCLevelEmail(summaries, squadSummary);
  const recipient = 'diretoria-seguranca@credsystem.com';

  try {
    await emailService.sendEmail(recipient, subject, html);
    await logNotification('EMAIL', recipient, subject, html, 'sent');
  } catch (err: any) {
    await logNotification('EMAIL', recipient, subject, html, 'failed', err?.message);
  }

  console.log(`[SLA-SCHEDULER] checkEscalationToCLevel done — ${filtered.length} vuln(s) escalated.`);
}

// ---------------------------------------------------------------------------
// Job 5 — Weekly Digest
// Monday 07:00
// ---------------------------------------------------------------------------

export async function sendWeeklyDigest() {
  console.log('[SLA-SCHEDULER] Running sendWeeklyDigest...');
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Total open
  const totalOpen = await prisma.vulnerability.count({
    where: { status: { in: [...OPEN_STATUSES] } },
  });

  // Critical count
  const criticalCount = await prisma.vulnerability.count({
    where: {
      status: { in: [...OPEN_STATUSES] },
      criticidade: 'CRITICA',
    },
  });

  // Expired SLA
  const expired = await prisma.vulnerability.count({
    where: {
      status: { in: [...OPEN_STATUSES] },
      sla: { lt: now },
    },
  });

  // Fixed this week
  const fixedThisWeek = await prisma.vulnerability.count({
    where: {
      status: { in: ['CONCLUIDO', 'FECHADO'] },
      ultimaAtualizacao: { gte: oneWeekAgo },
    },
  });

  // New this week
  const newThisWeek = await prisma.vulnerability.count({
    where: {
      dataCriacao: { gte: oneWeekAgo },
    },
  });

  // Squad ranking — open vulns grouped by squad
  const openVulns = await prisma.vulnerability.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    select: {
      squad: true,
      criticidade: true,
      sla: true,
    },
  });

  const squadMap = new Map<string, { total: number; criticas: number; altas: number; expiradas: number }>();
  for (const v of openVulns) {
    if (!squadMap.has(v.squad)) {
      squadMap.set(v.squad, { total: 0, criticas: 0, altas: 0, expiradas: 0 });
    }
    const entry = squadMap.get(v.squad)!;
    entry.total++;
    if (v.criticidade === 'CRITICA') entry.criticas++;
    if (v.criticidade === 'ALTA') entry.altas++;
    if (v.sla && v.sla < now) entry.expiradas++;
  }

  const topSquads: SquadSummary[] = Array.from(squadMap.entries())
    .map(([squad, data]) => ({ squad, ...data }))
    .sort((a, b) => b.total - a.total);

  const stats = {
    totalAberta: totalOpen,
    totalFechada: fixedThisWeek,
    totalNova: newThisWeek,
    totalExpirada: expired,
    mediaResolucao: 0, // calculated below
  };

  // Average resolution time for vulns closed this week
  const closedVulns = await prisma.vulnerability.findMany({
    where: {
      status: { in: ['CONCLUIDO', 'FECHADO'] },
      ultimaAtualizacao: { gte: oneWeekAgo },
    },
    select: {
      dataCriacao: true,
      ultimaAtualizacao: true,
    },
  });

  if (closedVulns.length > 0) {
    const totalDays = closedVulns.reduce((sum, v) => {
      const diff = v.ultimaAtualizacao.getTime() - v.dataCriacao.getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    stats.mediaResolucao = Math.round(totalDays / closedVulns.length);
  }

  const subject = `[VulnControl] Resumo Semanal — ${totalOpen} abertas, ${expired} expiradas`;
  const html = weeklyDigestEmail(stats, topSquads);

  const recipients = [
    'gestores@credsystem.com',
    'diretoria-seguranca@credsystem.com',
  ];

  for (const recipient of recipients) {
    try {
      await emailService.sendEmail(recipient, subject, html);
      await logNotification('EMAIL', recipient, subject, html, 'sent');
    } catch (err: any) {
      await logNotification('EMAIL', recipient, subject, html, 'failed', err?.message);
    }
  }

  console.log(`[SLA-SCHEDULER] sendWeeklyDigest done — ${totalOpen} open, ${expired} expired.`);
}

// ---------------------------------------------------------------------------
// Start all cron jobs
// ---------------------------------------------------------------------------

export function startScheduler() {
  console.log('[SLA-SCHEDULER] Registering cron jobs...');

  // Daily 08:00 — SLA warnings (3 days before expiry)
  cron.schedule('0 8 * * *', () => {
    checkSlaWarnings().catch((err) => console.error('[SLA-SCHEDULER] checkSlaWarnings error:', err));
  });
  console.log('[SLA-SCHEDULER]   - checkSlaWarnings        -> daily 08:00');

  // Daily 08:30 — SLA expired (within last 7 days)
  cron.schedule('30 8 * * *', () => {
    checkSlaExpired().catch((err) => console.error('[SLA-SCHEDULER] checkSlaExpired error:', err));
  });
  console.log('[SLA-SCHEDULER]   - checkSlaExpired         -> daily 08:30');

  // Daily 09:00 — Escalation to manager (7-14 days past SLA)
  cron.schedule('0 9 * * *', () => {
    checkEscalationToManager().catch((err) => console.error('[SLA-SCHEDULER] checkEscalationToManager error:', err));
  });
  console.log('[SLA-SCHEDULER]   - checkEscalationToManager -> daily 09:00');

  // Monday 09:30 — Escalation to C-Level (14+ days past SLA)
  cron.schedule('30 9 * * 1', () => {
    checkEscalationToCLevel().catch((err) => console.error('[SLA-SCHEDULER] checkEscalationToCLevel error:', err));
  });
  console.log('[SLA-SCHEDULER]   - checkEscalationToCLevel  -> Monday 09:30');

  // Monday 07:00 — Weekly digest
  cron.schedule('0 7 * * 1', () => {
    sendWeeklyDigest().catch((err) => console.error('[SLA-SCHEDULER] sendWeeklyDigest error:', err));
  });
  console.log('[SLA-SCHEDULER]   - sendWeeklyDigest         -> Monday 07:00');

  console.log('[SLA-SCHEDULER] All cron jobs registered.');
}
