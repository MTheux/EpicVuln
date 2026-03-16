// ---------------------------------------------------------------------------
// Email HTML templates — CredSystem VulnControl
// Dark theme with purple accent (#7c3aed)
// ---------------------------------------------------------------------------

export interface VulnSummary {
  titulo: string;
  codigoInterno: string;
  criticidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA' | string;
  sla: string;
  diasEmAberto: number;
  squad: string;
  jiraKey?: string;
}

export interface SquadSummary {
  squad: string;
  total: number;
  criticas: number;
  altas: number;
  expiradas: number;
}

export interface WeeklyStats {
  totalAberta: number;
  totalFechada: number;
  totalNova: number;
  totalExpirada: number;
  mediaResolucao: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS: Record<string, { bg: string; text: string }> = {
  CRITICA: { bg: '#dc2626', text: '#ffffff' },
  ALTA:    { bg: '#f97316', text: '#ffffff' },
  MEDIA:   { bg: '#eab308', text: '#1a1a2e' },
  BAIXA:   { bg: '#22c55e', text: '#1a1a2e' },
};

function severityBadge(criticidade: string): string {
  const c = COLORS[criticidade] ?? { bg: '#6b7280', text: '#ffffff' };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:700;background:${c.bg};color:${c.text};">${criticidade}</span>`;
}

function vulnTable(vulns: VulnSummary[]): string {
  const rows = vulns
    .map(
      (v) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;">${v.codigoInterno}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;">${v.titulo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${severityBadge(v.criticidade)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${v.sla}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${v.diasEmAberto}d</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;">${v.squad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;">${v.jiraKey ?? '-'}</td>
      </tr>`,
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#1e1e36;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead>
        <tr style="background:#2a2a48;">
          <th style="padding:10px 12px;text-align:left;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Codigo</th>
          <th style="padding:10px 12px;text-align:left;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Titulo</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Severidade</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">SLA</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Dias Aberto</th>
          <th style="padding:10px 12px;text-align:left;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Squad</th>
          <th style="padding:10px 12px;text-align:left;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Jira</th>
        </tr>
      </thead>
      <tbody style="color:#e2e8f0;font-size:13px;">
        ${rows}
      </tbody>
    </table>`;
}

function urgentBanner(text: string): string {
  return `
    <div style="background:#7f1d1d;border-left:4px solid #dc2626;padding:12px 16px;border-radius:6px;margin:16px 0;color:#fecaca;font-weight:600;">
      ${text}
    </div>`;
}

// ---------------------------------------------------------------------------
// Base layout
// ---------------------------------------------------------------------------

export function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f23;padding:24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#16162a;border-radius:12px;overflow:hidden;border:1px solid #2d2d44;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">CredSystem VulnControl</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#e2e8f0;font-size:14px;line-height:1.6;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#12122480;border-top:1px solid #2d2d44;text-align:center;color:#6b7280;font-size:11px;">
            Este e-mail foi enviado automaticamente pelo CredSystem VulnControl. Nao responda a esta mensagem.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function slaWarningEmail(squad: string, vulns: VulnSummary[]): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#fbbf24;font-size:18px;">Aviso de SLA — Expira em 3 dias</h2>
    <p>A squad <strong style="color:#a5b4fc;">${squad}</strong> possui <strong>${vulns.length}</strong> vulnerabilidade(s) com SLA expirando em ate 3 dias.</p>
    ${urgentBanner('Acao necessaria: resolva ou atualize o status dessas vulnerabilidades antes do vencimento do SLA.')}
    ${vulnTable(vulns)}
    <p style="margin-top:16px;">Acesse o painel para mais detalhes e atualizacao de status.</p>`;
  return baseLayout(content);
}

export function slaExpiredEmail(squad: string, vulns: VulnSummary[]): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#ef4444;font-size:18px;">SLA Expirado</h2>
    <p>A squad <strong style="color:#a5b4fc;">${squad}</strong> possui <strong>${vulns.length}</strong> vulnerabilidade(s) com SLA <span style="color:#ef4444;font-weight:700;">ja expirado</span>.</p>
    ${urgentBanner('URGENTE: O prazo de correcao dessas vulnerabilidades ja passou. Providencie a correcao imediata.')}
    ${vulnTable(vulns)}`;
  return baseLayout(content);
}

export function escalationToManagerEmail(
  gestor: string,
  squad: string,
  vulns: VulnSummary[],
): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#f97316;font-size:18px;">Escalacao — 7 dias sem resolucao</h2>
    <p>Prezado(a) <strong style="color:#a5b4fc;">${gestor}</strong>,</p>
    <p>As vulnerabilidades abaixo da squad <strong style="color:#a5b4fc;">${squad}</strong> estao ha mais de <strong>7 dias</strong> sem resolucao apos o vencimento do SLA.</p>
    ${urgentBanner('Esta e uma notificacao de escalacao. Sua intervencao e necessaria para garantir a correcao.')}
    ${vulnTable(vulns)}
    <p style="margin-top:16px;">Solicitamos que tome as providencias necessarias junto a squad para a resolucao imediata.</p>`;
  return baseLayout(content);
}

export function escalationToCLevelEmail(
  vulns: VulnSummary[],
  squadSummary: SquadSummary[],
): string {
  const summaryRows = squadSummary
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;">${s.squad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${s.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${severityBadge('CRITICA')} ${s.criticas}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${severityBadge('ALTA')} ${s.altas}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;color:#ef4444;font-weight:700;">${s.expiradas}</td>
      </tr>`,
    )
    .join('');

  const content = `
    <h2 style="margin:0 0 8px;color:#dc2626;font-size:18px;">Escalacao Executiva — 14 dias sem resolucao</h2>
    ${urgentBanner('CRITICO: Vulnerabilidades criticas permanecem sem correcao ha mais de 14 dias apos o vencimento do SLA. Risco elevado para a organizacao.')}

    <h3 style="color:#a5b4fc;margin:24px 0 8px;">Resumo por Squad</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#1e1e36;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead>
        <tr style="background:#2a2a48;">
          <th style="padding:10px 12px;text-align:left;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Squad</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Total</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Criticas</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Altas</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Expiradas</th>
        </tr>
      </thead>
      <tbody style="color:#e2e8f0;font-size:13px;">
        ${summaryRows}
      </tbody>
    </table>

    <h3 style="color:#a5b4fc;margin:24px 0 8px;">Detalhamento das Vulnerabilidades</h3>
    ${vulnTable(vulns)}`;
  return baseLayout(content);
}

export function manualNotificationEmail(
  squad: string,
  motivo: string,
  body: string,
): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#a5b4fc;font-size:18px;">Notificacao — ${motivo}</h2>
    <p>Squad: <strong style="color:#a5b4fc;">${squad}</strong></p>
    <div style="background:#1e1e36;border-radius:8px;padding:16px;margin:16px 0;color:#e2e8f0;line-height:1.7;">
      ${body}
    </div>`;
  return baseLayout(content);
}

export function weeklyDigestEmail(
  stats: WeeklyStats,
  topSquads: SquadSummary[],
): string {
  const squadRows = topSquads
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;">${s.squad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${s.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${s.criticas}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;">${s.altas}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2d2d44;text-align:center;color:#ef4444;">${s.expiradas}</td>
      </tr>`,
    )
    .join('');

  const content = `
    <h2 style="margin:0 0 8px;color:#a5b4fc;font-size:18px;">Resumo Semanal de Vulnerabilidades</h2>

    <!-- Stats cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td width="25%" style="padding:4px;">
          <div style="background:#1e1e36;border-radius:8px;padding:16px;text-align:center;">
            <div style="color:#6b7280;font-size:11px;text-transform:uppercase;">Abertas</div>
            <div style="color:#eab308;font-size:28px;font-weight:700;">${stats.totalAberta}</div>
          </div>
        </td>
        <td width="25%" style="padding:4px;">
          <div style="background:#1e1e36;border-radius:8px;padding:16px;text-align:center;">
            <div style="color:#6b7280;font-size:11px;text-transform:uppercase;">Fechadas</div>
            <div style="color:#22c55e;font-size:28px;font-weight:700;">${stats.totalFechada}</div>
          </div>
        </td>
        <td width="25%" style="padding:4px;">
          <div style="background:#1e1e36;border-radius:8px;padding:16px;text-align:center;">
            <div style="color:#6b7280;font-size:11px;text-transform:uppercase;">Novas</div>
            <div style="color:#3b82f6;font-size:28px;font-weight:700;">${stats.totalNova}</div>
          </div>
        </td>
        <td width="25%" style="padding:4px;">
          <div style="background:#1e1e36;border-radius:8px;padding:16px;text-align:center;">
            <div style="color:#6b7280;font-size:11px;text-transform:uppercase;">SLA Expirado</div>
            <div style="color:#ef4444;font-size:28px;font-weight:700;">${stats.totalExpirada}</div>
          </div>
        </td>
      </tr>
    </table>

    <p>Tempo medio de resolucao: <strong style="color:#a5b4fc;">${stats.mediaResolucao} dias</strong></p>

    <h3 style="color:#a5b4fc;margin:24px 0 8px;">Squads com Mais Vulnerabilidades Abertas</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#1e1e36;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead>
        <tr style="background:#2a2a48;">
          <th style="padding:10px 12px;text-align:left;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Squad</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Total</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Criticas</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Altas</th>
          <th style="padding:10px 12px;text-align:center;color:#a5b4fc;font-size:12px;text-transform:uppercase;">Expiradas</th>
        </tr>
      </thead>
      <tbody style="color:#e2e8f0;font-size:13px;">
        ${squadRows}
      </tbody>
    </table>`;
  return baseLayout(content);
}
