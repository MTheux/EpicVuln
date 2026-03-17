import { prisma } from '../../app';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'];

const SEVERITY_LABELS: Record<string, string> = {
    EXTREMA: 'Extrema', CRITICA: 'Crítica', ALTA: 'Alta',
    MEDIA: 'Média', BAIXA: 'Baixa', INFORMATIVA: 'Informativa',
};

const STATUS_LABELS: Record<string, string> = {
    NOVO: 'Nova', ABERTO: 'Aberta', EM_BACKLOG: 'Em Backlog',
    EM_CORRECAO: 'Em Correção', EM_RETESTE: 'Em Reteste',
    MITIGADO: 'Mitigada', CONCLUIDO: 'Concluída',
    RISCO_ACEITO: 'Risco Aceito', FECHADO: 'Fechada',
};

export class ReportsService {

    // ─── Insights para reunião semanal ──────────────────────────
    async getWeeklyInsights() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const allVulns = await prisma.vulnerability.findMany({
            select: {
                id: true, titulo: true, codigoInterno: true,
                squad: true, criticidade: true, status: true,
                sla: true, diasEmAberto: true, dataCriacao: true,
                owaspCategory: true, cwe: true, origem: true,
                responsavel: true, sistema: true,
                history: {
                    select: { eventType: true, createdAt: true }
                }
            }
        });

        const open = allVulns.filter(v => OPEN_STATUSES.includes(v.status));

        // 1. Top 10 falhas mais reportadas (por CWE/OWASP)
        const falhaCounts: Record<string, { count: number; label: string }> = {};
        for (const v of allVulns) {
            const key = v.owaspCategory || v.cwe || 'Sem classificação';
            if (!falhaCounts[key]) falhaCounts[key] = { count: 0, label: key };
            falhaCounts[key].count++;
        }
        const topFalhas = Object.values(falhaCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 2. Squads que mais demoram para corrigir (MTTR)
        const squadMttr: Record<string, { total: number; count: number }> = {};
        for (const v of allVulns) {
            const conclusao = v.history.find(h => h.eventType === 'CONCLUSAO');
            if (conclusao) {
                const days = (new Date(conclusao.createdAt).getTime() - new Date(v.dataCriacao).getTime()) / (1000 * 60 * 60 * 24);
                if (!squadMttr[v.squad]) squadMttr[v.squad] = { total: 0, count: 0 };
                squadMttr[v.squad].total += days;
                squadMttr[v.squad].count++;
            }
        }
        const slowestSquads = Object.entries(squadMttr)
            .map(([squad, data]) => ({ squad, mttrDays: Math.round(data.total / data.count), resolved: data.count }))
            .sort((a, b) => b.mttrDays - a.mttrDays)
            .slice(0, 10);

        // 3. Vulns em backlog eterno (>30 dias abertas)
        const backlogEterno = open
            .filter(v => v.diasEmAberto > 30)
            .sort((a, b) => b.diasEmAberto - a.diasEmAberto)
            .slice(0, 15)
            .map(v => ({
                codigoInterno: v.codigoInterno,
                titulo: v.titulo,
                squad: v.squad,
                criticidade: SEVERITY_LABELS[v.criticidade] || v.criticidade,
                diasEmAberto: v.diasEmAberto,
                status: STATUS_LABELS[v.status] || v.status,
                responsavel: v.responsavel || 'Sem responsável',
            }));

        // 4. SLA vencidos por squad
        const slaVencidoPorSquad: Record<string, number> = {};
        for (const v of open) {
            if (v.sla && new Date(v.sla) < now) {
                slaVencidoPorSquad[v.squad] = (slaVencidoPorSquad[v.squad] || 0) + 1;
            }
        }
        const squadsSlaVencido = Object.entries(slaVencidoPorSquad)
            .map(([squad, count]) => ({ squad, slaVencido: count }))
            .sort((a, b) => b.slaVencido - a.slaVencido);

        // 5. Resumo geral
        const totalAberto = open.length;
        const totalExtremaCritica = open.filter(v => v.criticidade === 'EXTREMA' || v.criticidade === 'CRITICA').length;
        const totalSlaVencido = open.filter(v => v.sla && new Date(v.sla) < now).length;
        const novasUltimos30d = allVulns.filter(v => new Date(v.dataCriacao) >= thirtyDaysAgo).length;
        const fechadasUltimos30d = allVulns.filter(v =>
            v.history.some(h => h.eventType === 'CONCLUSAO' && new Date(h.createdAt) >= thirtyDaysAgo)
        ).length;
        const semResponsavel = open.filter(v => !v.responsavel).length;

        // 6. Origem das falhas (Pentest, SAST, DAST etc)
        const origemCounts: Record<string, number> = {};
        for (const v of allVulns) {
            origemCounts[v.origem] = (origemCounts[v.origem] || 0) + 1;
        }
        const byOrigem = Object.entries(origemCounts)
            .map(([origem, count]) => ({ origem, count }))
            .sort((a, b) => b.count - a.count);

        // 7. Severidade aberta
        const severidadeAberta: Record<string, number> = {};
        for (const v of open) {
            const label = SEVERITY_LABELS[v.criticidade] || v.criticidade;
            severidadeAberta[label] = (severidadeAberta[label] || 0) + 1;
        }

        return {
            resumo: {
                totalAberto,
                totalExtremaCritica,
                totalSlaVencido,
                novasUltimos30d,
                fechadasUltimos30d,
                semResponsavel,
                totalSquads: new Set(allVulns.map(v => v.squad)).size,
            },
            topFalhas,
            slowestSquads,
            backlogEterno,
            squadsSlaVencido,
            byOrigem,
            severidadeAberta,
        };
    }

    // ─── Gerar Excel ────────────────────────────────────────────
    async generateExcel(): Promise<Buffer> {
        const vulns = await prisma.vulnerability.findMany({
            orderBy: [{ criticidade: 'asc' }, { diasEmAberto: 'desc' }],
        });

        const rows = vulns.map(v => ({
            'Código': v.codigoInterno,
            'Título': v.titulo,
            'Severidade': SEVERITY_LABELS[v.criticidade] || v.criticidade,
            'Status': STATUS_LABELS[v.status] || v.status,
            'Squad': v.squad,
            'Responsável': v.responsavel || '',
            'Sistema': v.sistema,
            'Origem': v.origem,
            'OWASP': v.owaspCategory || '',
            'CWE': v.cwe || '',
            'Dias Aberto': v.diasEmAberto,
            'SLA': v.sla ? new Date(v.sla).toLocaleDateString('pt-BR') : '',
            'Data Detecção': v.dataDeteccao ? new Date(v.dataDeteccao).toLocaleDateString('pt-BR') : '',
            'Data Criação': new Date(v.dataCriacao).toLocaleDateString('pt-BR'),
            'Descrição Executiva': v.descricaoExecutiva,
            'Recomendação': v.recomendacao || '',
            'Impacto': v.impacto || '',
            'CVSS': v.scoreCvss || '',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 14 },
            { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
            { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 14 }, { wch: 14 }, { wch: 50 }, { wch: 50 },
            { wch: 30 }, { wch: 8 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Vulnerabilidades');

        // Summary sheet
        const insights = await this.getWeeklyInsights();
        const summaryRows = [
            { 'Métrica': 'Total Abertas', 'Valor': insights.resumo.totalAberto },
            { 'Métrica': 'Extremas + Críticas', 'Valor': insights.resumo.totalExtremaCritica },
            { 'Métrica': 'SLA Vencido', 'Valor': insights.resumo.totalSlaVencido },
            { 'Métrica': 'Sem Responsável', 'Valor': insights.resumo.semResponsavel },
            { 'Métrica': 'Novas (30d)', 'Valor': insights.resumo.novasUltimos30d },
            { 'Métrica': 'Fechadas (30d)', 'Valor': insights.resumo.fechadasUltimos30d },
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

        // Slowest squads sheet
        const wsSquads = XLSX.utils.json_to_sheet(insights.slowestSquads.map(s => ({
            'Squad': s.squad,
            'MTTR (dias)': s.mttrDays,
            'Resolvidas': s.resolved,
        })));
        wsSquads['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsSquads, 'MTTR por Squad');

        // Top falhas sheet
        const wsFalhas = XLSX.utils.json_to_sheet(insights.topFalhas.map(f => ({
            'Tipo de Falha': f.label,
            'Ocorrências': f.count,
        })));
        wsFalhas['!cols'] = [{ wch: 40 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsFalhas, 'Top Falhas');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return Buffer.from(buffer);
    }

    // ─── Gerar PDF ──────────────────────────────────────────────
    async generatePdf(): Promise<Buffer> {
        const insights = await this.getWeeklyInsights();
        const now = new Date();

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).font('Helvetica-Bold')
                .text('Raio-X CredSystem — Relatório Semanal', { align: 'center' });
            doc.fontSize(10).font('Helvetica')
                .text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, { align: 'center' });
            doc.moveDown(1.5);

            // Resumo
            doc.fontSize(14).font('Helvetica-Bold').text('Resumo Executivo');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            const r = insights.resumo;
            doc.text(`• Vulnerabilidades abertas: ${r.totalAberto}`);
            doc.text(`• Extremas + Críticas: ${r.totalExtremaCritica}`);
            doc.text(`• SLA vencido: ${r.totalSlaVencido}`);
            doc.text(`• Sem responsável: ${r.semResponsavel}`);
            doc.text(`• Novas nos últimos 30 dias: ${r.novasUltimos30d}`);
            doc.text(`• Fechadas nos últimos 30 dias: ${r.fechadasUltimos30d}`);
            doc.text(`• Squads monitoradas: ${r.totalSquads}`);
            doc.moveDown(1);

            // Severidade
            doc.fontSize(14).font('Helvetica-Bold').text('Severidade (Abertas)');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            for (const [sev, count] of Object.entries(insights.severidadeAberta)) {
                doc.text(`• ${sev}: ${count}`);
            }
            doc.moveDown(1);

            // Top Falhas
            doc.fontSize(14).font('Helvetica-Bold').text('Top 10 Falhas Mais Reportadas');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            insights.topFalhas.forEach((f, i) => {
                doc.text(`${i + 1}. ${f.label} — ${f.count} ocorrência(s)`);
            });
            doc.moveDown(1);

            // Squads mais lentas
            doc.fontSize(14).font('Helvetica-Bold').text('Squads Mais Lentas (MTTR)');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            insights.slowestSquads.forEach((s, i) => {
                doc.text(`${i + 1}. ${s.squad} — ${s.mttrDays} dias (${s.resolved} resolvidas)`);
            });
            doc.moveDown(1);

            // SLA vencido por squad
            if (insights.squadsSlaVencido.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('SLA Vencido por Squad');
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica');
                insights.squadsSlaVencido.forEach(s => {
                    doc.text(`• ${s.squad}: ${s.slaVencido} vencida(s)`);
                });
                doc.moveDown(1);
            }

            // Backlog eterno
            if (insights.backlogEterno.length > 0) {
                if (doc.y > 650) doc.addPage();
                doc.fontSize(14).font('Helvetica-Bold').text('Backlog Eterno (>30 dias abertas)');
                doc.moveDown(0.5);
                doc.fontSize(9).font('Helvetica');
                insights.backlogEterno.forEach(v => {
                    doc.text(`[${v.codigoInterno}] ${v.titulo.substring(0, 60)} — ${v.squad} — ${v.diasEmAberto}d — ${v.criticidade}`, {
                        width: 495,
                    });
                });
            }

            doc.end();
        });
    }
}
