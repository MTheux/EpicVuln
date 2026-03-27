import { prisma } from '../../app';
import { getSquadMetadata } from './squad-mapping';

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'];
const CLOSED_STATUSES = ['MITIGADO', 'CONCLUIDO', 'RISCO_ACEITO', 'FECHADO'];

export class AnalyticsService {
    async getDashboardMetrics() {
        const totalOpen = await prisma.vulnerability.count({
            where: { status: { in: OPEN_STATUSES as any } }
        });

        const bySeverity = await prisma.vulnerability.groupBy({
            by: ['criticidade'],
            _count: true
        });

        const highestSeverityList = await prisma.vulnerability.findMany({
            where: { criticidade: { in: ['CRITICA', 'ALTA'] as any } },
            orderBy: { dataCriacao: 'desc' },
            take: 5
        });

        const allActive = await prisma.vulnerability.findMany({
            where: { status: { in: OPEN_STATUSES as any } },
            select: { id: true, sla: true }
        });

        const now = new Date();
        let expiredCount = 0;
        allActive.forEach(v => {
            if (v.sla && new Date(v.sla) < now) expiredCount++;
        });

        return {
            totalOpen,
            expiredCount,
            bySeverity: bySeverity.map(b => ({
                severity: b.criticidade,
                count: b._count
            })),
            recentCritical: highestSeverityList
        };
    }

    async getSquadScoreboards() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const allVulns = await prisma.vulnerability.findMany({
            select: {
                id: true,
                squad: true,
                criticidade: true,
                status: true,
                sla: true,
                diasEmAberto: true,
                dataCriacao: true,
                reincidencia: true,
                history: {
                    select: {
                        eventType: true,
                        createdAt: true,
                        previousValue: true,
                        newValue: true,
                    }
                }
            }
        });

        const squadsMap: Record<string, typeof allVulns> = {};
        for (const v of allVulns) {
            if (!v.squad) continue;
            if (!squadsMap[v.squad]) squadsMap[v.squad] = [];
            squadsMap[v.squad].push(v);
        }

        const scorecards = Object.entries(squadsMap).map(([squadName, vulns]) => {
            return this.calculateSquadMetrics(squadName, vulns, now, thirtyDaysAgo, sixtyDaysAgo);
        });

        scorecards.sort((a, b) => a.complianceScore - b.complianceScore);
        return scorecards;
    }

    async getSquadDetail(squadName: string) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const vulns = await prisma.vulnerability.findMany({
            where: { squad: squadName },
            select: {
                id: true,
                codigoInterno: true,
                titulo: true,
                squad: true,
                criticidade: true,
                status: true,
                sla: true,
                diasEmAberto: true,
                dataCriacao: true,
                reincidencia: true,
                responsavel: true,
                sistema: true,
                owaspCategory: true,
                history: {
                    select: {
                        eventType: true,
                        createdAt: true,
                        previousValue: true,
                        newValue: true,
                    }
                }
            }
        });

        if (vulns.length === 0) return null;

        const metrics = this.calculateSquadMetrics(squadName, vulns, now, thirtyDaysAgo, sixtyDaysAgo);
        const bySeverity: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byOwasp: Record<string, number> = {};
        const openVulns: any[] = [];

        for (const v of vulns) {
            bySeverity[v.criticidade] = (bySeverity[v.criticidade] || 0) + 1;
            byStatus[v.status] = (byStatus[v.status] || 0) + 1;
            if (v.owaspCategory) byOwasp[v.owaspCategory] = (byOwasp[v.owaspCategory] || 0) + 1;
            if (OPEN_STATUSES.includes(v.status)) {
                openVulns.push({
                    id: v.id,
                    codigoInterno: v.codigoInterno,
                    titulo: v.titulo,
                    criticidade: v.criticidade,
                    status: v.status,
                    diasEmAberto: v.diasEmAberto,
                    sla: v.sla,
                    responsavel: v.responsavel,
                    sistema: v.sistema,
                    slaExpired: v.sla ? new Date(v.sla) < now : false,
                });
            }
        }

        openVulns.sort((a, b) => b.diasEmAberto - a.diasEmAberto);
        const monthlyTrend = this.calculateMonthlyTrend(vulns, now);

        // Agrupar por responsável (dev)
        const devMap: Record<string, { total: number; open: number; closed: number; critica: number; slaExpired: number; vulns: any[] }> = {};
        for (const v of vulns) {
            const dev = v.responsavel || 'Sem responsável';
            if (!devMap[dev]) devMap[dev] = { total: 0, open: 0, closed: 0, critica: 0, slaExpired: 0, vulns: [] };
            devMap[dev].total++;
            if (OPEN_STATUSES.includes(v.status)) {
                devMap[dev].open++;
                if (v.sla && new Date(v.sla) < now) devMap[dev].slaExpired++;
            } else {
                devMap[dev].closed++;
            }
            if (v.criticidade === 'CRITICA') devMap[dev].critica++;
            devMap[dev].vulns.push({
                id: v.id,
                codigoInterno: v.codigoInterno,
                titulo: v.titulo,
                criticidade: v.criticidade,
                status: v.status,
                diasEmAberto: v.diasEmAberto,
                sla: v.sla,
                sistema: v.sistema,
                slaExpired: v.sla ? new Date(v.sla) < now : false,
            });
        }

        const devScoreboard = Object.entries(devMap).map(([name, d]) => ({
            name,
            total: d.total,
            open: d.open,
            closed: d.closed,
            extremaCritica: d.critica,
            slaExpired: d.slaExpired,
            correcaoPct: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0,
            vulns: d.vulns.sort((a: any, b: any) => b.diasEmAberto - a.diasEmAberto),
        })).sort((a, b) => b.total - a.total);

        return {
            ...metrics,
            bySeverity,
            byStatus,
            byOwasp,
            openVulns: openVulns.slice(0, 20),
            monthlyTrend,
            devScoreboard,
        };
    }

    async getSsdlcOverview() {
        const scorecards = await this.getSquadScoreboards();
        const totalSquads = scorecards.length;
        const avgCompliance = totalSquads > 0
            ? Math.round(scorecards.reduce((sum, s) => sum + s.complianceScore, 0) / totalSquads)
            : 0;
        const avgMttr = totalSquads > 0
            ? Math.round(scorecards.reduce((sum, s) => sum + s.mttrDays, 0) / totalSquads)
            : 0;
        const avgSlaCompliance = totalSquads > 0
            ? Math.round(scorecards.reduce((sum, s) => sum + s.slaComplianceRate, 0) / totalSquads)
            : 0;

        const maturityDistribution = {
            critical: scorecards.filter(s => s.complianceScore < 30).length,
            low: scorecards.filter(s => s.complianceScore >= 30 && s.complianceScore < 50).length,
            medium: scorecards.filter(s => s.complianceScore >= 50 && s.complianceScore < 70).length,
            good: scorecards.filter(s => s.complianceScore >= 70 && s.complianceScore < 85).length,
            excellent: scorecards.filter(s => s.complianceScore >= 85).length,
        };

        const worstSquads = scorecards.slice(0, 5);
        const bestSquads = [...scorecards].sort((a, b) => b.complianceScore - a.complianceScore).slice(0, 5);

        return {
            totalSquads,
            avgCompliance,
            avgMttr,
            avgSlaCompliance,
            maturityDistribution,
            worstSquads,
            bestSquads,
            allSquads: scorecards,
        };
    }

    private calculateSquadMetrics(
        squadName: string,
        vulns: any[],
        now: Date,
        thirtyDaysAgo: Date,
        sixtyDaysAgo: Date
    ) {
        const total = vulns.length;
        const open = vulns.filter(v => OPEN_STATUSES.includes(v.status));
        const closed = vulns.filter(v => CLOSED_STATUSES.includes(v.status));

        const extrema = 0; // EXTREMA severity removed - now merged into CRITICA
        const critica = open.filter(v => v.criticidade === 'CRITICA').length;
        const alta = open.filter(v => v.criticidade === 'ALTA').length;
        const media = open.filter(v => v.criticidade === 'MEDIA').length;
        const baixa = open.filter(v => v.criticidade === 'BAIXA' || v.criticidade === 'INFORMATIVA').length;

        const withSla = vulns.filter(v => v.sla);
        const slaExpired = open.filter(v => v.sla && new Date(v.sla) < now).length;
        const slaMet = closed.filter(v => {
            if (!v.sla) return false;
            const conclusao = v.history.find((h: any) => h.eventType === 'CONCLUSAO');
            if (!conclusao) return true;
            return new Date(conclusao.createdAt) <= new Date(v.sla);
        }).length;
        const slaTotal = withSla.length || 1;
        const slaComplianceRate = Math.round((slaMet / slaTotal) * 100);

        const remediationTimes: number[] = [];
        for (const v of closed) {
            const conclusao = v.history.find((h: any) => h.eventType === 'CONCLUSAO');
            if (conclusao) {
                const created = new Date(v.dataCriacao).getTime();
                const resolved = new Date(conclusao.createdAt).getTime();
                const days = (resolved - created) / (1000 * 60 * 60 * 24);
                if (days >= 0) remediationTimes.push(days);
            }
        }
        const mttrDays = remediationTimes.length > 0
            ? Math.round(remediationTimes.reduce((a, b) => a + b, 0) / remediationTimes.length)
            : 0;

        const avgDaysOpen = open.length > 0
            ? Math.round(open.reduce((sum, v) => sum + v.diasEmAberto, 0) / open.length)
            : 0;

        const totalReopens = vulns.reduce((sum, v) => {
            return sum + v.history.filter((h: any) => h.eventType === 'REABERTURA').length;
        }, 0);
        const reopenRate = closed.length > 0 ? Math.round((totalReopens / closed.length) * 100) : 0;

        const newLast30 = vulns.filter(v => new Date(v.dataCriacao) >= thirtyDaysAgo).length;
        const closedLast30 = vulns.filter(v => {
            const conclusao = v.history.find((h: any) => h.eventType === 'CONCLUSAO');
            return conclusao && new Date(conclusao.createdAt) >= thirtyDaysAgo;
        }).length;

        const trendDirection = 'stable';

        const mttrScore = mttrDays === 0 ? 100 : Math.max(0, 100 - (mttrDays * 2));
        const reopenScore = Math.max(0, 100 - (reopenRate * 2));
        const resolutionRate = total > 0 ? Math.round((closed.length / total) * 100) : 100;

        // Security Debt calculation
        const securityDebt = open.reduce((sum, v) => {
            let pts = v.criticidade === 'CRITICA' ? 100
                    : v.criticidade === 'ALTA' ? 25 
                    : v.criticidade === 'MEDIA' ? 10 : 5;
            if (v.sla && new Date(v.sla) < now) pts *= 2;
            return sum + pts;
        }, 0);

        const fixedBeforeSla = closed.filter(v => {
            const conclusao = v.history.find((h: any) => h.eventType === 'CONCLUSAO');
            return v.sla && conclusao && new Date(conclusao.createdAt) < new Date(v.sla);
        }).length;
        const fixedBeforeSlaRate = total > 0 ? Math.round((fixedBeforeSla / total) * 100) : 0;

        // Proactivity based on percentages (fair across squads of different sizes)
        // 50% weight: resolution rate (closed/total)
        // 30% weight: fixed before SLA rate
        // 20% weight: SLA compliance rate
        const proactivityScore = Math.min(100, Math.round(
            (resolutionRate * 0.50) + (fixedBeforeSlaRate * 0.30) + (slaComplianceRate * 0.20)
        ));

        const debtScore = Math.max(0, 100 - (securityDebt / 10));
        const complianceScore = Math.round(
            (slaComplianceRate * 0.35) +
            (debtScore * 0.25) +
            (mttrScore * 0.20) +
            (proactivityScore * 0.10) +
            (reopenScore * 0.10)
        );

        const metadata = getSquadMetadata(squadName);

        return {
            squadName,
            ...metadata,
            total,
            openCount: open.length,
            closedCount: closed.length,
            extrema,
            critica,
            alta,
            media,
            baixa,
            slaExpired,
            slaComplianceRate,
            mttrDays,
            avgDaysOpen,
            reopenRate,
            newLast30,
            closedLast30,
            trendDirection,
            complianceScore,
            securityDebt,
            proactivityScore,
        };
    }

    private calculateMonthlyTrend(vulns: any[], now: Date) {
        const months: { month: string; opened: number; closed: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const label = start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            const opened = vulns.filter(v => {
                const d = new Date(v.dataCriacao);
                return d >= start && d < end;
            }).length;
            const closed = vulns.filter(v => {
                const conclusao = v.history.find((h: any) => h.eventType === 'CONCLUSAO');
                if (!conclusao) return false;
                const d = new Date(conclusao.createdAt);
                return d >= start && d < end;
            }).length;
            months.push({ month: label, opened, closed });
        }
        return months;
    }
}
