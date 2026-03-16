import { prisma } from '../../app';

export class AnalyticsService {
    async getDashboardMetrics() {
        const totalOpen = await prisma.vulnerability.count({
            where: {
                status: { in: ['Aberta', 'Em Backlog', 'Em Correção', 'Em Reteste'] }
            }
        });

        const bySeverity = await prisma.vulnerability.groupBy({
            by: ['criticidade'],
            _count: true
        });

        const highestSeverityList = await prisma.vulnerability.findMany({
            where: { criticidade: { in: ['Extrema', 'Alta'] } },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // Conta vencidas usando subquery via Prisma não é trivial diretamente em groupBy dates.
        // Vamos processar no NodeJS para esse escopo simples
        const allActive = await prisma.vulnerability.findMany({
            where: { status: { notIn: ['Concluída', 'Mitigada', 'Fechada', 'Risco Aceito'] } },
            select: { id: true, sla: true }
        });

        const now = new Date();
        let expiredCount = 0;
        allActive.forEach(v => {
            if (v.sla && new Date(v.sla) < now) {
                expiredCount++;
            }
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
}
