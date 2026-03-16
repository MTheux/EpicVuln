# Bloco 1: SLA com Escalação + Email/Notificações Reais

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar o sistema de notificações de mock para produção real — com envio de emails via nodemailer, SLA com escalação automática (responsável → gestor → C-level), scheduler para automação, e frontend integrado ao backend real.

**Architecture:** O backend ganha um serviço de email real (nodemailer), um scheduler (node-cron) que roda jobs periódicos para checar SLAs e disparar alertas, e endpoints CRUD para regras/logs de notificação. O frontend deixa de usar mock-data e passa a consumir a API real. Emails são enviados com templates HTML profissionais.

**Tech Stack:** nodemailer (já instalado), node-cron (novo), Express.js, Prisma, React/Next.js

---

## Task 1: Instalar node-cron e criar serviço de email real

**Files:**
- Modify: `backend/package.json` (add node-cron)
- Create: `backend/src/services/email.service.ts`
- Create: `backend/src/services/email-templates.ts`

**Step 1: Instalar node-cron**

```bash
cd "C:/Users/teteu/Downloads/Project dash/backend" && npm install node-cron && npm install -D @types/node-cron
```

**Step 2: Criar o serviço de email real com nodemailer**

Create `backend/src/services/email.service.ts`:

```typescript
import nodemailer from 'nodemailer';
import { env } from '../config/env';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    // Em dev sem SMTP configurado, apenas loga
    if (!env.SMTP_HOST || env.SMTP_HOST === 'smtp.example.com') {
      console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
      console.log(`[EMAIL-DEV] Body preview: ${html.substring(0, 200)}...`);
      return { success: true };
    }

    try {
      await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (error: any) {
      console.error(`[EMAIL-ERROR] Failed to send to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!env.SMTP_HOST || env.SMTP_HOST === 'smtp.example.com') {
      return false;
    }
    try {
      await this.getTransporter().verify();
      return true;
    } catch {
      return false;
    }
  }
}

export const emailService = new EmailService();
```

**Step 3: Criar templates de email HTML**

Create `backend/src/services/email-templates.ts`:

```typescript
const baseLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; }
    .header p { color: #c4b5fd; margin: 4px 0 0; font-size: 13px; }
    .body { background: #171717; padding: 24px; border-radius: 0 0 12px 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-extrema { background: #7f1d1d; color: #fca5a5; }
    .badge-critica { background: #78350f; color: #fcd34d; }
    .badge-alta { background: #7c2d12; color: #fdba74; }
    .badge-media { background: #1e3a5f; color: #93c5fd; }
    .vuln-card { background: #262626; border: 1px solid #404040; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .vuln-title { font-weight: 600; color: #f5f5f5; margin-bottom: 8px; }
    .vuln-meta { font-size: 12px; color: #a3a3a3; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #737373; }
    .cta { display: inline-block; background: #7c3aed; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .escalation-banner { background: #7f1d1d; border: 1px solid #991b1b; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center; }
    .escalation-banner h2 { color: #fca5a5; margin: 0 0 4px; font-size: 16px; }
    .escalation-banner p { color: #fecaca; margin: 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #262626; color: #a3a3a3; padding: 8px 12px; text-align: left; font-size: 12px; border-bottom: 1px solid #404040; }
    td { padding: 8px 12px; border-bottom: 1px solid #333; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CredSystem VulnControl</h1>
      <p>Equipe de Application Security</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      Este é um e-mail automático do CredSystem VulnControl. Não responda diretamente.<br>
      Em caso de dúvidas, entre em contato com a equipe de AppSec.
    </div>
  </div>
</body>
</html>`;

interface VulnSummary {
  titulo: string;
  codigoInterno: string;
  criticidade: string;
  sla?: string | null;
  diasEmAberto: number;
  squad: string;
  jiraKey?: string | null;
}

const badgeClass = (crit: string) => {
  const map: Record<string, string> = {
    EXTREMA: 'badge-extrema', CRITICA: 'badge-critica',
    ALTA: 'badge-alta', MEDIA: 'badge-media',
  };
  return map[crit] || 'badge-media';
};

const critLabel = (crit: string) => {
  const map: Record<string, string> = {
    EXTREMA: 'Extrema', CRITICA: 'Crítica', ALTA: 'Alta',
    MEDIA: 'Média', BAIXA: 'Baixa', INFORMATIVA: 'Informativa',
  };
  return map[crit] || crit;
};

const vulnTable = (vulns: VulnSummary[]) => `
<table>
  <tr><th>Código</th><th>Vulnerabilidade</th><th>Criticidade</th><th>Dias Aberto</th><th>Jira</th></tr>
  ${vulns.map(v => `
  <tr>
    <td>${v.codigoInterno}</td>
    <td>${v.titulo}</td>
    <td><span class="badge ${badgeClass(v.criticidade)}">${critLabel(v.criticidade)}</span></td>
    <td>${v.diasEmAberto}d</td>
    <td>${v.jiraKey || '—'}</td>
  </tr>`).join('')}
</table>`;

// ─── Templates ──────────────────────────────────────────

export function slaWarningEmail(squad: string, vulns: VulnSummary[]) {
  return {
    subject: `[VulnControl] ⚠️ ${vulns.length} vulnerabilidade(s) com SLA próximo do vencimento — Squad ${squad}`,
    html: baseLayout(`
      <h2 style="color:#fbbf24;margin-top:0;">⚠️ SLA Próximo do Vencimento</h2>
      <p>Olá PO da squad <strong>${squad}</strong>,</p>
      <p>As seguintes vulnerabilidades vencem nos próximos <strong>3 dias</strong>. Ação imediata é necessária:</p>
      ${vulnTable(vulns)}
      <p>Por favor, priorizem a correção na sprint atual.</p>
      <p style="color:#a3a3a3;font-size:12px;">Este alerta é enviado automaticamente quando o SLA está próximo do vencimento.</p>
    `),
  };
}

export function slaExpiredEmail(squad: string, vulns: VulnSummary[]) {
  return {
    subject: `[VulnControl] 🔴 ${vulns.length} vulnerabilidade(s) com SLA VENCIDO — Squad ${squad}`,
    html: baseLayout(`
      <div class="escalation-banner">
        <h2>🔴 SLA Vencido</h2>
        <p>${vulns.length} vulnerabilidade(s) ultrapassaram o prazo de correção</p>
      </div>
      <p>Olá PO da squad <strong>${squad}</strong>,</p>
      <p>As seguintes vulnerabilidades <strong>já estouraram o SLA</strong> e exigem ação imediata:</p>
      ${vulnTable(vulns)}
      <p><strong>Próximo passo:</strong> Se não houver ação em 7 dias, o gestor responsável será notificado automaticamente.</p>
    `),
  };
}

export function escalationToManagerEmail(gestor: string, squad: string, vulns: VulnSummary[]) {
  return {
    subject: `[VulnControl] 🚨 ESCALAÇÃO — Squad ${squad} com ${vulns.length} vuln(s) sem correção após SLA`,
    html: baseLayout(`
      <div class="escalation-banner">
        <h2>🚨 Escalação para Gestão</h2>
        <p>Squad ${squad} não corrigiu vulnerabilidades dentro do SLA + período de tolerância</p>
      </div>
      <p>Olá <strong>${gestor}</strong>,</p>
      <p>A squad <strong>${squad}</strong> possui vulnerabilidades com SLA vencido há mais de <strong>7 dias</strong> sem ação de correção.</p>
      ${vulnTable(vulns)}
      <p>Solicitamos intervenção para priorizar a remediação junto à squad.</p>
      <p><strong>Próximo passo:</strong> Se não houver ação em 14 dias, a diretoria será notificada.</p>
    `),
  };
}

export function escalationToCLevelEmail(vulns: VulnSummary[], squadSummary: { squad: string; count: number }[]) {
  return {
    subject: `[VulnControl] 🔥 ESCALAÇÃO C-LEVEL — ${vulns.length} vulnerabilidades críticas sem correção`,
    html: baseLayout(`
      <div class="escalation-banner">
        <h2>🔥 Escalação Executiva (C-Level)</h2>
        <p>Vulnerabilidades com SLA vencido há mais de 14 dias sem ação</p>
      </div>
      <p>Prezada Diretoria,</p>
      <p>O sistema de gestão de vulnerabilidades identificou <strong>${vulns.length} vulnerabilidade(s)</strong> com SLA vencido há mais de 14 dias, representando risco significativo.</p>
      <h3 style="color:#fca5a5;">Resumo por Squad</h3>
      <table>
        <tr><th>Squad</th><th>Qtd. Vencidas</th></tr>
        ${squadSummary.map(s => `<tr><td>${s.squad}</td><td style="color:#fca5a5;font-weight:600;">${s.count}</td></tr>`).join('')}
      </table>
      <h3 style="color:#fca5a5;">Detalhamento</h3>
      ${vulnTable(vulns)}
      <p>Solicitamos revisão da priorização de segurança com as lideranças responsáveis.</p>
    `),
  };
}

export function manualNotificationEmail(squad: string, motivo: string, body: string) {
  return {
    subject: `[VulnControl] Notificação de Segurança — Squad ${squad}`,
    html: baseLayout(`
      <h2 style="color:#a78bfa;margin-top:0;">Notificação Manual — ${motivo}</h2>
      <p>Olá PO da squad <strong>${squad}</strong>,</p>
      <div class="vuln-card">
        <pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${body}</pre>
      </div>
      <p style="color:#a3a3a3;font-size:12px;">Esta notificação foi enviada manualmente pela equipe de AppSec.</p>
    `),
  };
}

export function weeklyDigestEmail(
  stats: { totalOpen: number; critical: number; expired: number; fixedThisWeek: number },
  topSquads: { squad: string; open: number; expired: number }[]
) {
  return {
    subject: `[VulnControl] 📊 Resumo Semanal — ${stats.totalOpen} abertas, ${stats.expired} vencidas`,
    html: baseLayout(`
      <h2 style="color:#a78bfa;margin-top:0;">📊 Resumo Semanal de Vulnerabilidades</h2>
      <table>
        <tr><td>Total Abertas</td><td style="font-weight:600;">${stats.totalOpen}</td></tr>
        <tr><td>Críticas/Extremas</td><td style="color:#fca5a5;font-weight:600;">${stats.critical}</td></tr>
        <tr><td>SLA Vencido</td><td style="color:#fbbf24;font-weight:600;">${stats.expired}</td></tr>
        <tr><td>Corrigidas esta semana</td><td style="color:#4ade80;font-weight:600;">${stats.fixedThisWeek}</td></tr>
      </table>
      <h3 style="color:#e5e5e5;">Ranking de Squads</h3>
      <table>
        <tr><th>Squad</th><th>Abertas</th><th>SLA Vencido</th></tr>
        ${topSquads.map(s => `
        <tr>
          <td>${s.squad}</td>
          <td>${s.open}</td>
          <td style="color:${s.expired > 0 ? '#fca5a5' : '#4ade80'};">${s.expired}</td>
        </tr>`).join('')}
      </table>
    `),
  };
}
```

**Step 4: Commit**

```bash
git add backend/src/services/email.service.ts backend/src/services/email-templates.ts backend/package.json backend/package-lock.json
git commit -m "feat: add real email service with nodemailer and HTML templates for SLA notifications"
```

---

## Task 2: Criar o SLA Scheduler Service

**Files:**
- Create: `backend/src/services/sla-scheduler.service.ts`
- Modify: `backend/src/index.ts` (start scheduler on boot)

**Step 1: Criar o scheduler de SLA com escalação**

Create `backend/src/services/sla-scheduler.service.ts`:

```typescript
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { emailService } from './email.service';
import {
  slaWarningEmail,
  slaExpiredEmail,
  escalationToManagerEmail,
  escalationToCLevelEmail,
  weeklyDigestEmail,
} from './email-templates';

const prisma = new PrismaClient();

// Status que significam "não resolvido"
const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'];

async function getOpenVulnsWithSla() {
  return prisma.vulnerability.findMany({
    where: {
      status: { in: OPEN_STATUSES },
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
    const list = map.get(item.squad) || [];
    list.push(item);
    map.set(item.squad, list);
  }
  return map;
}

async function logNotification(
  channel: 'EMAIL',
  recipient: string,
  subject: string,
  body: string,
  status: string,
  error?: string
) {
  await prisma.notificationLog.create({
    data: { channel, recipient, subject, body, status, error },
  });
}

// ─── Job 1: SLA Warning (vence em <= 3 dias) ──────────
// Roda todo dia às 08:00
async function checkSlaWarnings() {
  console.log('[SCHEDULER] Checking SLA warnings...');
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const warning = vulns.filter(v => {
    const sla = new Date(v.sla!);
    return sla > now && sla <= threeDaysFromNow;
  });

  if (warning.length === 0) return;

  const bySquad = groupBySquad(warning);
  for (const [squad, squadVulns] of bySquad) {
    const email = slaWarningEmail(squad, squadVulns);
    const recipient = `po-${squad.toLowerCase().replace(/ /g, '')}@credsystem.com`;
    const result = await emailService.sendEmail(recipient, email.subject, email.html);
    await logNotification('EMAIL', recipient, email.subject, email.html, result.success ? 'sent' : 'failed', result.error);

    // Registrar no histórico de cada vuln
    for (const v of squadVulns) {
      await prisma.vulnerabilityHistory.create({
        data: {
          vulnerabilityId: v.id,
          eventType: 'NOTIFICACAO_ENVIADA',
          description: `Alerta de SLA próximo enviado para ${recipient}`,
        },
      });
    }
  }
  console.log(`[SCHEDULER] SLA warnings sent for ${warning.length} vulns`);
}

// ─── Job 2: SLA Expired (venceu, mas < 7 dias) ──────────
// Roda todo dia às 08:30
async function checkSlaExpired() {
  console.log('[SCHEDULER] Checking expired SLAs...');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const expired = vulns.filter(v => {
    const sla = new Date(v.sla!);
    return sla < now && sla >= sevenDaysAgo;
  });

  if (expired.length === 0) return;

  const bySquad = groupBySquad(expired);
  for (const [squad, squadVulns] of bySquad) {
    const email = slaExpiredEmail(squad, squadVulns);
    const recipient = `po-${squad.toLowerCase().replace(/ /g, '')}@credsystem.com`;
    const result = await emailService.sendEmail(recipient, email.subject, email.html);
    await logNotification('EMAIL', recipient, email.subject, email.html, result.success ? 'sent' : 'failed', result.error);
  }
  console.log(`[SCHEDULER] SLA expired notifications sent for ${expired.length} vulns`);
}

// ─── Job 3: Escalação para Gestor (vencido > 7 dias) ──────────
// Roda todo dia às 09:00
async function checkEscalationToManager() {
  console.log('[SCHEDULER] Checking manager escalations...');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const escalate = vulns.filter(v => {
    const sla = new Date(v.sla!);
    return sla < sevenDaysAgo && sla >= fourteenDaysAgo;
  });

  if (escalate.length === 0) return;

  const bySquad = groupBySquad(escalate);
  for (const [squad, squadVulns] of bySquad) {
    const gestor = squadVulns[0]?.gestor || 'Gestor';
    const email = escalationToManagerEmail(gestor, squad, squadVulns);
    // Envia para o gestor da squad
    const recipient = `gestor-${squad.toLowerCase().replace(/ /g, '')}@credsystem.com`;
    const result = await emailService.sendEmail(recipient, email.subject, email.html);
    await logNotification('EMAIL', recipient, email.subject, email.html, result.success ? 'sent' : 'failed', result.error);

    for (const v of squadVulns) {
      await prisma.vulnerabilityHistory.create({
        data: {
          vulnerabilityId: v.id,
          eventType: 'NOTIFICACAO_ENVIADA',
          description: `Escalação enviada para gestor: ${gestor}`,
        },
      });
    }
  }
  console.log(`[SCHEDULER] Manager escalations sent for ${escalate.length} vulns`);
}

// ─── Job 4: Escalação C-Level (vencido > 14 dias) ──────────
// Roda toda segunda-feira às 09:30
async function checkEscalationToCLevel() {
  console.log('[SCHEDULER] Checking C-Level escalations...');
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const vulns = await getOpenVulnsWithSla();
  const critical = vulns.filter(v => {
    const sla = new Date(v.sla!);
    return sla < fourteenDaysAgo;
  });

  if (critical.length === 0) return;

  const bySquad = groupBySquad(critical);
  const squadSummary = Array.from(bySquad.entries()).map(([squad, v]) => ({ squad, count: v.length }));

  const email = escalationToCLevelEmail(critical, squadSummary);
  const recipient = 'diretoria-seguranca@credsystem.com';
  const result = await emailService.sendEmail(recipient, email.subject, email.html);
  await logNotification('EMAIL', recipient, email.subject, email.html, result.success ? 'sent' : 'failed', result.error);
  console.log(`[SCHEDULER] C-Level escalation sent for ${critical.length} vulns`);
}

// ─── Job 5: Digest Semanal (toda segunda 07:00) ──────────
async function sendWeeklyDigest() {
  console.log('[SCHEDULER] Sending weekly digest...');

  const totalOpen = await prisma.vulnerability.count({
    where: { status: { in: OPEN_STATUSES } },
  });

  const criticalCount = await prisma.vulnerability.count({
    where: { status: { in: OPEN_STATUSES }, criticidade: { in: ['EXTREMA', 'CRITICA'] } },
  });

  const now = new Date();
  const allOpenWithSla = await prisma.vulnerability.findMany({
    where: { status: { in: OPEN_STATUSES }, sla: { not: null } },
    select: { sla: true },
  });
  const expired = allOpenWithSla.filter(v => new Date(v.sla!) < now).length;

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fixedThisWeek = await prisma.vulnerability.count({
    where: {
      status: { in: ['CONCLUIDO', 'MITIGADO', 'FECHADO'] },
      ultimaAtualizacao: { gte: oneWeekAgo },
    },
  });

  // Top squads
  const squadData = await prisma.vulnerability.groupBy({
    by: ['squad'],
    where: { status: { in: OPEN_STATUSES } },
    _count: true,
  });

  const topSquads = await Promise.all(
    squadData.map(async (s) => {
      const squadExpired = await prisma.vulnerability.count({
        where: {
          squad: s.squad,
          status: { in: OPEN_STATUSES },
          sla: { lt: now },
        },
      });
      return { squad: s.squad, open: s._count, expired: squadExpired };
    })
  );
  topSquads.sort((a, b) => b.expired - a.expired);

  const email = weeklyDigestEmail(
    { totalOpen, critical: criticalCount, expired, fixedThisWeek },
    topSquads
  );

  // Enviar para gestores e C-level
  const recipients = ['gestores@credsystem.com', 'diretoria-seguranca@credsystem.com'];
  for (const recipient of recipients) {
    const result = await emailService.sendEmail(recipient, email.subject, email.html);
    await logNotification('EMAIL', recipient, email.subject, email.html, result.success ? 'sent' : 'failed', result.error);
  }
  console.log('[SCHEDULER] Weekly digest sent');
}

// ─── Start all crons ──────────────────────────────────

export function startScheduler() {
  console.log('[SCHEDULER] Starting SLA notification scheduler...');

  // Diário: 08:00 — SLA warning (vence em 3 dias)
  cron.schedule('0 8 * * *', () => { checkSlaWarnings().catch(console.error); });

  // Diário: 08:30 — SLA expirado (venceu < 7 dias)
  cron.schedule('30 8 * * *', () => { checkSlaExpired().catch(console.error); });

  // Diário: 09:00 — Escalação gestor (vencido > 7 dias)
  cron.schedule('0 9 * * *', () => { checkEscalationToManager().catch(console.error); });

  // Segunda-feira: 09:30 — Escalação C-Level (vencido > 14 dias)
  cron.schedule('30 9 * * 1', () => { checkEscalationToCLevel().catch(console.error); });

  // Segunda-feira: 07:00 — Digest semanal
  cron.schedule('0 7 * * 1', () => { sendWeeklyDigest().catch(console.error); });

  console.log('[SCHEDULER] All cron jobs registered:');
  console.log('  - 08:00 daily: SLA warning (3 days)');
  console.log('  - 08:30 daily: SLA expired notification');
  console.log('  - 09:00 daily: Manager escalation (>7 days)');
  console.log('  - 09:30 Monday: C-Level escalation (>14 days)');
  console.log('  - 07:00 Monday: Weekly digest');
}

// Exportar para poder disparar manualmente via API
export {
  checkSlaWarnings,
  checkSlaExpired,
  checkEscalationToManager,
  checkEscalationToCLevel,
  sendWeeklyDigest,
};
```

**Step 2: Integrar o scheduler no boot do servidor**

Modify `backend/src/index.ts` — add import and call `startScheduler()` after server starts listening:

```typescript
import { startScheduler } from './services/sla-scheduler.service';

// After app.listen():
startScheduler();
```

**Step 3: Commit**

```bash
git add backend/src/services/sla-scheduler.service.ts backend/src/index.ts
git commit -m "feat: add SLA scheduler with escalation chain (squad → gestor → C-level)"
```

---

## Task 3: Expandir o backend de Notificações (CRUD + manual send + trigger manual)

**Files:**
- Rewrite: `backend/src/modules/notifications/notifications.service.ts`
- Rewrite: `backend/src/modules/notifications/notifications.routes.ts`

**Step 1: Reescrever notifications.service.ts com funcionalidades reais**

Replace `backend/src/modules/notifications/notifications.service.ts`:

```typescript
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

export class NotificationsService {

  // ─── Envio manual para PO da squad ──────────
  async sendManualNotification(data: {
    squad: string;
    motivo: string;
    body: string;
    userId: string;
  }) {
    const recipient = `po-${data.squad.toLowerCase().replace(/ /g, '')}@credsystem.com`;
    const email = manualNotificationEmail(data.squad, data.motivo, data.body);

    const result = await emailService.sendEmail(recipient, email.subject, email.html);

    const log = await prisma.notificationLog.create({
      data: {
        channel: 'EMAIL',
        recipient,
        subject: email.subject,
        body: data.body,
        status: result.success ? 'sent' : 'failed',
        error: result.error,
        sentById: data.userId,
      },
    });

    return log;
  }

  // ─── Trigger manual dos jobs de SLA ──────────
  async triggerJob(jobName: string) {
    switch (jobName) {
      case 'sla-warning': await checkSlaWarnings(); break;
      case 'sla-expired': await checkSlaExpired(); break;
      case 'escalation-manager': await checkEscalationToManager(); break;
      case 'escalation-clevel': await checkEscalationToCLevel(); break;
      case 'weekly-digest': await sendWeeklyDigest(); break;
      default: throw new Error(`Unknown job: ${jobName}`);
    }
    return { triggered: jobName };
  }

  // ─── CRUD de regras ──────────
  async getRules() {
    return prisma.notificationRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createRule(data: { name: string; condition: string; channel: string; recipients?: string[] }) {
    return prisma.notificationRule.create({
      data: {
        name: data.name,
        condition: data.condition,
        channel: (data.channel?.toUpperCase() || 'EMAIL') as any,
        recipients: data.recipients || [],
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

  // ─── Logs / Histórico ──────────
  async getLogs(limit = 50) {
    return prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sentBy: { select: { name: true } },
      },
    });
  }

  // ─── Stats ──────────
  async getStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [today, totalRules, activeRules, recentLogs] = await Promise.all([
      prisma.notificationLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.notificationRule.count(),
      prisma.notificationRule.count({ where: { active: true } }),
      prisma.notificationLog.findMany({
        where: { createdAt: { gte: startOfDay } },
        select: { recipient: true },
        distinct: ['recipient'],
      }),
    ]);

    // Vulns críticas sem notificação recente (últimos 7 dias)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const criticalNoNotif = await prisma.vulnerability.count({
      where: {
        criticidade: { in: ['EXTREMA', 'CRITICA'] },
        status: { in: ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'] },
        history: {
          none: {
            eventType: 'NOTIFICACAO_ENVIADA',
            createdAt: { gte: sevenDaysAgo },
          },
        },
      },
    });

    // SLAs próximos (3 dias)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingSla = await prisma.vulnerability.count({
      where: {
        status: { in: ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'] },
        sla: { gte: now, lte: threeDaysFromNow },
      },
    });

    return {
      notificacoesHoje: today,
      regrasAtivas: activeRules,
      totalRegras: totalRules,
      squadsNotificadas: recentLogs.length,
      criticasSemRetorno: criticalNoNotif,
      proximosSLAs: upcomingSla,
    };
  }

  // ─── Status do Email ──────────
  async getEmailStatus() {
    const connected = await emailService.verifyConnection();
    return { configured: connected, provider: 'SMTP' };
  }
}
```

**Step 2: Reescrever routes com todos os endpoints**

Replace `backend/src/modules/notifications/notifications.routes.ts`:

```typescript
import { Response, Router } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const service = new NotificationsService();

// GET /api/notifications/stats — estatísticas para os cards do frontend
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await service.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/logs — histórico de notificações enviadas
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await service.getLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/send — envio manual de email para PO
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const { squad, motivo, body } = req.body;
    if (!squad || !body) {
      return res.status(400).json({ error: 'squad and body are required' });
    }
    const userId = req.user?.id || 'system';
    const log = await service.sendManualNotification({ squad, motivo: motivo || 'Manual', body, userId });
    res.json({ success: true, data: log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/trigger/:jobName — disparar job manualmente
router.post('/trigger/:jobName', async (req: AuthRequest, res: Response) => {
  try {
    const result = await service.triggerJob(req.params.jobName);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── CRUD de Regras ──────────
// GET /api/notifications/rules
router.get('/rules', async (req: AuthRequest, res: Response) => {
  try {
    const rules = await service.getRules();
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/rules
router.post('/rules', async (req: AuthRequest, res: Response) => {
  try {
    const rule = await service.createRule(req.body);
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/rules/:id/toggle
router.patch('/rules/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const rule = await service.toggleRule(req.params.id);
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// DELETE /api/notifications/rules/:id
router.delete('/rules/:id', async (req: AuthRequest, res: Response) => {
  try {
    await service.deleteRule(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// GET /api/notifications/email-status
router.get('/email-status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await service.getEmailStatus();
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Step 3: Commit**

```bash
git add backend/src/modules/notifications/
git commit -m "feat: rewrite notifications module with real email sending, CRUD rules, manual triggers"
```

---

## Task 4: Atualizar o frontend para consumir a API real

**Files:**
- Modify: `app/(dashboard)/notificacoes/page.tsx`

**Step 1: Reescrever a página de notificações para usar API real**

Replace the full `app/(dashboard)/notificacoes/page.tsx` to:
- Remove all mock data imports (`notificacoes`, `regrasNotificacao`)
- Add `useEffect` hooks to fetch from:
  - `GET /api/notifications/stats` → stat cards
  - `GET /api/notifications/rules` → regras
  - `GET /api/notifications/logs` → histórico
- Change `handleEnviarEmailPO` to call `POST /api/notifications/send`
- Change rule CRUD to call API endpoints
- Add a "Disparar Agora" button section for manual SLA job triggers
- Use `NEXT_PUBLIC_API_URL` env var instead of hardcoded localhost

Key changes:
- Replace `const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'`
- Stats: fetch from `/api/notifications/stats` on mount
- Rules: fetch from `/api/notifications/rules`, POST/PATCH/DELETE via API
- Logs: fetch from `/api/notifications/logs`
- Manual send: POST `/api/notifications/send` with `{ squad, motivo, body }`
- Add "Ações Manuais" card with buttons to trigger each SLA job

**Step 2: Commit**

```bash
git add app/(dashboard)/notificacoes/page.tsx
git commit -m "feat: connect notifications page to real backend API, remove mock data"
```

---

## Task 5: Adicionar variável de ambiente no frontend

**Files:**
- Create or modify: `.env.local` (frontend)
- Modify: `lib/vuln-store.ts` (use env var)

**Step 1: Criar `.env.local` no root do projeto**

```
NEXT_PUBLIC_API_URL=http://localhost:9001
```

**Step 2: Atualizar vuln-store.ts para usar a env var**

Replace the hardcoded URL in `lib/vuln-store.ts:21`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/vulnerabilities`
  : 'http://localhost:9001/api/vulnerabilities';
```

Also update any other hardcoded `localhost:9001` references in this file.

**Step 3: Commit**

```bash
git add .env.local lib/vuln-store.ts
git commit -m "feat: use NEXT_PUBLIC_API_URL env var instead of hardcoded localhost"
```

---

## Task 6: Testar o fluxo completo

**Step 1: Restart o backend e verificar que o scheduler inicia**

```bash
cd backend && npm run dev
```

Expected output should include:
```
[SCHEDULER] Starting SLA notification scheduler...
[SCHEDULER] All cron jobs registered:
  - 08:00 daily: SLA warning (3 days)
  ...
```

**Step 2: Testar o endpoint manual de trigger**

```bash
curl -X POST http://localhost:9001/api/notifications/trigger/sla-warning
```

Expected: `{ "success": true, "data": { "triggered": "sla-warning" } }`

**Step 3: Testar o envio manual via API**

```bash
curl -X POST http://localhost:9001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"squad":"Backend","motivo":"Teste","body":"Teste de envio manual"}'
```

Expected: `{ "success": true, "data": { "id": "...", "status": "sent", ... } }`

**Step 4: Verificar o frontend**

Open `http://localhost:9000/notificacoes` and verify:
- Stat cards show real data from DB
- Rules load from API
- Creating/toggling/deleting rules works
- Manual email send calls the API
- Notification history shows real logs

**Step 5: Commit final**

```bash
git add -A
git commit -m "feat: complete Bloco 1 - SLA escalation + real email notifications"
```

---

## Cadeia de Escalação (Resumo Visual)

```
SLA vence em 3 dias → Email para PO da squad (diário 08:00)
        ↓
SLA venceu (0-7 dias) → Email de alerta para PO (diário 08:30)
        ↓
SLA vencido > 7 dias → Escalação para GESTOR (diário 09:00)
        ↓
SLA vencido > 14 dias → Escalação para C-LEVEL (segunda 09:30)

+ Digest semanal toda segunda 07:00 para gestores + diretoria
+ Envio manual pelo frontend a qualquer momento
```
