import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gera laudo PDF gerencial por vulnerabilidade.
 * Conteúdo:
 *  - Capa (UnisysGuard branding + título + data)
 *  - Informações de Controle (ID, criado por, data, squad, ativo)
 *  - Sumário Executivo
 *  - Metodologias aplicadas
 *  - Detalhes Técnicos (tabela)
 *  - Gráfico de Criticidade (bar simples)
 *  - Matriz de Risco (Impacto × Probabilidade)
 *  - Descrição Técnica + Impacto + Recomendação
 *  - Footer com Compliance LGPD/BACEN
 */

const COLORS = {
  emerald: '#10b981',
  emeraldDark: '#059669',
  red: '#dc2626',
  amber: '#f59e0b',
  yellow: '#eab308',
  slate: '#64748b',
  slateDark: '#0f172a',
  slateLight: '#f1f5f9',
  text: '#0f172a',
  muted: '#475569',
};

const SEV_COLORS: Record<string, string> = {
  CRITICA: '#dc2626',
  ALTA: '#f59e0b',
  MEDIA: '#eab308',
  BAIXA: '#10b981',
  INFORMATIVA: '#64748b',
};

const SEV_SCORE: Record<string, number> = { CRITICA: 9.5, ALTA: 7.5, MEDIA: 5.0, BAIXA: 3.0, INFORMATIVA: 1.0 };

export async function generateVulnReport(vulnId: string, res: Response) {
  const vuln = await prisma.vulnerability.findFirst({
    where: { OR: [{ id: vulnId }, { codigoInterno: vulnId }] },
    include: { createdBy: true },
  });
  if (!vuln) {
    res.status(404).json({ error: 'Vulnerabilidade não encontrada' });
    return;
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
    Title: `Laudo ${vuln.codigoInterno}`,
    Author: 'UnisysGuard',
    Subject: vuln.titulo,
    Keywords: `OWASP, ${vuln.owaspCategory || ''}, ${vuln.criticidade}`,
  }});

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="laudo-${vuln.codigoInterno}.pdf"`);
  doc.pipe(res);

  // ----- CAPA -----
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0a0d0a');
  doc.fill('#ffffff');

  // U logo placeholder (simple)
  doc.save();
  doc.translate(50, 60);
  doc.fillColor(COLORS.emerald).roundedRect(0, 0, 50, 50, 8).fill();
  doc.fillColor('#0a0d0a').fontSize(36).font('Helvetica-Bold').text('U', 14, 6);
  doc.restore();

  doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('UnisysGuard', 115, 70);
  doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('AppSec & ASPM · Caixa Econômica Federal', 115, 92);

  // Título do laudo
  doc.moveTo(50, 250).fontSize(11).fillColor('#94a3b8').text('LAUDO TÉCNICO DE VULNERABILIDADE', { align: 'center' });
  doc.moveDown(0.5).fontSize(28).fillColor('#ffffff').font('Helvetica-Bold').text(vuln.codigoInterno, { align: 'center' });
  doc.moveDown(0.5).fontSize(16).fillColor(COLORS.emerald).font('Helvetica').text(vuln.titulo, { align: 'center', width: 495 });

  // Severity pill
  const sevColor = SEV_COLORS[vuln.criticidade] || COLORS.slate;
  const sevY = doc.y + 30;
  doc.roundedRect(doc.page.width / 2 - 60, sevY, 120, 28, 14).fill(sevColor);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(vuln.criticidade, doc.page.width / 2 - 60, sevY + 8, { width: 120, align: 'center' });

  // Metadata
  doc.y = doc.page.height - 180;
  doc.fontSize(9).fillColor('#94a3b8').font('Helvetica');
  doc.text(`Sistema · ${vuln.sistema}`, { align: 'center' });
  doc.text(`Ativo · ${vuln.ativo}`, { align: 'center' });
  doc.text(`Squad · ${vuln.squad}`, { align: 'center' });
  doc.moveDown(1.5);
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
  doc.text('Documento confidencial — Uso interno Unisys/Caixa', { align: 'center' });

  // ----- PÁGINA 2: Informações de Controle -----
  doc.addPage();
  resetPage(doc);
  sectionTitle(doc, '1. Informações de Controle');

  const info: [string, string][] = [
    ['Código Interno', vuln.codigoInterno],
    ['Jira/RTC Key', vuln.jiraKey || '—'],
    ['Título', vuln.titulo],
    ['Criticidade', vuln.criticidade],
    ['Status', vuln.status],
    ['Sistema', vuln.sistema],
    ['Ativo', vuln.ativo],
    ['Squad Responsável', vuln.squad],
    ['Origem', vuln.origem],
    ['Ambiente', vuln.ambiente],
    ['OWASP', vuln.owaspCategory || '—'],
    ['CWE', vuln.cwe || '—'],
    ['CVSS Score', vuln.scoreCvss ? String(vuln.scoreCvss) : `${SEV_SCORE[vuln.criticidade] || 0} (estimado)`],
    ['Detectada em', vuln.dataDeteccao?.toLocaleDateString('pt-BR') || '—'],
    ['Dias em Aberto', String(vuln.diasEmAberto || 0)],
    ['SLA', vuln.sla?.toLocaleDateString('pt-BR') || '—'],
    ['Criado por', vuln.createdBy?.email || '—'],
  ];
  drawTable(doc, info);

  // ----- 2. Sumário Executivo -----
  doc.moveDown(2);
  sectionTitle(doc, '2. Sumário Executivo');
  doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(
    vuln.descricaoExecutiva || vuln.titulo,
    { align: 'justify', lineGap: 3 },
  );

  // ----- PÁGINA 3: Metodologias + Gráfico -----
  doc.addPage();
  resetPage(doc);
  sectionTitle(doc, '3. Metodologias Aplicadas');
  const metodologias = [
    'OWASP Web Top 10 (2021) — classificação da categoria de vulnerabilidade.',
    'OWASP API Security Top 10 (2023) — quando aplicável a endpoints REST.',
    'OWASP ASVS 4.0 — verificação de controles esperados.',
    'CWE (Common Weakness Enumeration) — mapeamento técnico.',
    'CVSS v3.1 — pontuação de severidade (estimada se não fornecida).',
    'BACEN Resolução 4658 — controles de cibersegurança bancária aplicáveis.',
    'LGPD Art. 46-49 — análise de impacto a dados pessoais.',
  ];
  metodologias.forEach((m) => {
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(`• ${m}`, { indent: 10, lineGap: 4 });
  });

  // ----- 4. Gráfico de Criticidade -----
  doc.moveDown(2);
  sectionTitle(doc, '4. Gráfico de Criticidade');
  drawSeverityBar(doc, vuln.criticidade);

  // ----- 5. Matriz de Risco -----
  doc.moveDown(2);
  sectionTitle(doc, '5. Matriz de Risco (Impacto × Probabilidade)');
  drawRiskMatrix(doc, vuln.criticidade);

  // ----- PÁGINA 4: Descrição Técnica -----
  doc.addPage();
  resetPage(doc);
  sectionTitle(doc, '6. Descrição Técnica');
  doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(
    vuln.descricaoTecnica || '—',
    { align: 'justify', lineGap: 3 },
  );

  if (vuln.endpoint) {
    doc.moveDown(1);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text('Endpoint Afetado:');
    doc.font('Courier').fontSize(9).fillColor(COLORS.text).text(`${vuln.metodoHttp || 'GET'} ${vuln.endpoint}`, { indent: 10 });
  }
  if (vuln.parametroAfetado) {
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text('Parâmetro Afetado:');
    doc.font('Courier').fontSize(9).fillColor(COLORS.text).text(vuln.parametroAfetado, { indent: 10 });
  }

  doc.moveDown(2);
  sectionTitle(doc, '7. Impacto no Negócio');
  doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(
    vuln.impacto || 'A avaliar pelo time de negócio.',
    { align: 'justify', lineGap: 3 },
  );

  doc.moveDown(2);
  sectionTitle(doc, '8. Recomendação de Mitigação');
  doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(
    vuln.recomendacao || 'Aguardando recomendação técnica.',
    { align: 'justify', lineGap: 3 },
  );

  if (vuln.evidenciaTextual) {
    doc.moveDown(2);
    sectionTitle(doc, '9. Evidência');
    doc.font('Courier').fontSize(8).fillColor(COLORS.text).text(vuln.evidenciaTextual.slice(0, 1500), { lineGap: 2 });
  }

  // ----- Footer Compliance em todas páginas -----
  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
    doc.switchToPage(i);
    if (i === pageRange.start) continue; // skip cover
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.muted);
    doc.text(
      `UnisysGuard · Laudo ${vuln.codigoInterno} · Pág ${i + 1 - pageRange.start} de ${pageRange.count - 1} · Confidencial — LGPD Art.6º + BACEN Res. 4658`,
      50,
      doc.page.height - 30,
      { width: doc.page.width - 100, align: 'center' },
    );
  }

  doc.end();
}

// ===== Helpers =====
function resetPage(doc: PDFKit.PDFDocument) {
  doc.x = 50;
  doc.y = 50;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(COLORS.emerald).fontSize(13).font('Helvetica-Bold').text(title);
  doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor(COLORS.emerald).lineWidth(1).stroke();
  doc.moveDown(0.8);
}

function drawTable(doc: PDFKit.PDFDocument, rows: [string, string][]) {
  const labelW = 130;
  const startX = 50;
  rows.forEach(([k, v]) => {
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(k, startX, startY, { width: labelW });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(String(v), startX + labelW + 10, startY, { width: doc.page.width - startX - labelW - 60 });
    doc.moveDown(0.3);
  });
}

function drawSeverityBar(doc: PDFKit.PDFDocument, sev: string) {
  const startX = 50;
  const startY = doc.y;
  const barWidth = doc.page.width - 100;
  const barHeight = 30;
  const levels = ['INFORMATIVA', 'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
  const segmentWidth = barWidth / levels.length;

  levels.forEach((level, i) => {
    const x = startX + i * segmentWidth;
    doc.rect(x, startY, segmentWidth, barHeight).fillAndStroke(SEV_COLORS[level] || '#cbd5e1', '#ffffff');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text(level, x, startY + 11, { width: segmentWidth, align: 'center' });
    if (level === sev) {
      // marker
      doc.fillColor('#0f172a').polygon(
        [x + segmentWidth / 2 - 6, startY - 4],
        [x + segmentWidth / 2 + 6, startY - 4],
        [x + segmentWidth / 2, startY + 4],
      ).fill();
    }
  });
  doc.y = startY + barHeight + 12;
  doc.fontSize(9).fillColor(COLORS.muted).text(`Esta vulnerabilidade foi classificada como ${sev}.`, { align: 'center' });
}

function drawRiskMatrix(doc: PDFKit.PDFDocument, sev: string) {
  const startX = 130;
  const startY = doc.y + 10;
  const cell = 50;
  const cols = ['Muito Baixa', 'Baixa', 'Média', 'Alta', 'Muito Alta'];
  const rows = ['Crítico', 'Alto', 'Médio', 'Baixo', 'Insignificante'];

  // labels Y
  doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.muted);
  rows.forEach((r, i) => doc.text(r, startX - 75, startY + i * cell + cell / 2 - 4, { width: 70, align: 'right' }));
  // labels X
  cols.forEach((c, i) => doc.text(c, startX + i * cell, startY + rows.length * cell + 4, { width: cell, align: 'center' }));

  // axis titles
  doc.fontSize(8).fillColor(COLORS.text);
  doc.text('IMPACTO →', startX - 75, startY - 14, { width: 70, align: 'right' });
  doc.text('← PROBABILIDADE', startX, startY + rows.length * cell + 18, { width: cols.length * cell, align: 'center' });

  // cells: green low → red high
  const colors = [
    ['#10b981', '#fbbf24', '#f59e0b', '#dc2626', '#991b1b'], // Crítico row
    ['#10b981', '#fbbf24', '#f59e0b', '#dc2626', '#dc2626'],
    ['#10b981', '#10b981', '#fbbf24', '#f59e0b', '#dc2626'],
    ['#10b981', '#10b981', '#10b981', '#fbbf24', '#f59e0b'],
    ['#94a3b8', '#94a3b8', '#10b981', '#10b981', '#fbbf24'],
  ];

  // highlight pos based on sev
  const posMap: Record<string, [number, number]> = {
    CRITICA: [0, 4], ALTA: [1, 3], MEDIA: [2, 2], BAIXA: [3, 1], INFORMATIVA: [4, 0],
  };
  const [hr, hc] = posMap[sev] || [2, 2];

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const x = startX + c * cell;
      const y = startY + r * cell;
      doc.rect(x, y, cell, cell).fillAndStroke(colors[r][c], '#ffffff');
      if (r === hr && c === hc) {
        // big highlight border
        doc.lineWidth(3).strokeColor('#000000').rect(x + 2, y + 2, cell - 4, cell - 4).stroke();
        doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('★', x, y + cell / 2 - 8, { width: cell, align: 'center' });
      }
    }
  }
  doc.lineWidth(1);
  doc.y = startY + rows.length * cell + 40;
}
