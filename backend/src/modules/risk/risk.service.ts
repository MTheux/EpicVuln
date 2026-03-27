import { prisma } from '../../app';

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE'];
const CLOSED_STATUSES = ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'];

const SEVERITY_BASE: Record<string, number> = {
  CRITICA: 95,
  ALTA: 60,
  MEDIA: 40,
  BAIXA: 20,
  INFORMATIVA: 5,
};

const ENVIRONMENT_FACTOR: Record<string, number> = {
  PRODUCAO: 1.3,
  HOMOLOGACAO: 1.0,
  DESENVOLVIMENTO: 0.7,
  STAGING: 0.8,
};

const BUSINESS_WEIGHT: Record<string, number> = {
  CRITICAL: 1.5,
  HIGH: 1.2,
  MEDIUM: 1.0,
  LOW: 0.8,
};

interface VulnForRisk {
  id: string;
  criticidade: string;
  scoreCvss: number | null;
  diasEmAberto: number;
  ambiente: string;
  reincidencia: number;
  status: string;
  squad: string;
}

interface AssetForRisk {
  id: string;
  name: string;
  businessCriticality: string;
  status: string;
  vulnerabilities: VulnForRisk[];
}

export class RiskService {
  /**
   * Individual Vulnerability Risk Score (0-100)
   */
  computeVulnRisk(vuln: VulnForRisk): number {
    // baseScore
    const baseScore = vuln.scoreCvss != null
      ? vuln.scoreCvss * 10
      : (SEVERITY_BASE[vuln.criticidade] || 20);

    // ageFactor: 1.0 + min(diasEmAberto / 90, 1.0) * 0.5
    const ageFactor = 1.0 + Math.min(vuln.diasEmAberto / 90, 1.0) * 0.5;

    // environmentFactor
    const environmentFactor = ENVIRONMENT_FACTOR[vuln.ambiente] || 1.0;

    // recurrenceFactor: 1.0 + (reincidencia * 0.15), capped at 1.6
    const recurrenceFactor = Math.min(1.0 + vuln.reincidencia * 0.15, 1.6);

    const raw = baseScore * ageFactor * environmentFactor * recurrenceFactor;
    return Math.min(Math.round(raw * 100) / 100, 100);
  }

  /**
   * Asset Risk Score (0-100)
   */
  computeAssetRisk(asset: AssetForRisk): number {
    const openVulns = asset.vulnerabilities.filter(v => !CLOSED_STATUSES.includes(v.status));
    if (openVulns.length === 0) return 0;

    // Compute individual vuln risks and sort descending
    const vulnRisks = openVulns
      .map(v => this.computeVulnRisk(v))
      .sort((a, b) => b - a);

    // Weighted average of top 5 (weight by position: 5, 4, 3, 2, 1)
    const top5 = vulnRisks.slice(0, 5);
    let weightSum = 0;
    let weightedSum = 0;
    top5.forEach((risk, i) => {
      const w = top5.length - i; // highest gets most weight
      weightedSum += risk * w;
      weightSum += w;
    });
    const weightedAvgVulnRisk = weightSum > 0 ? weightedSum / weightSum : 0;

    // businessWeight
    const businessWeight = BUSINESS_WEIGHT[asset.businessCriticality] || 1.0;

    // concentrationFactor: 1.0 + min(openVulnCount / 10, 0.5)
    const concentrationFactor = 1.0 + Math.min(openVulns.length / 10, 0.5);

    const raw = businessWeight * weightedAvgVulnRisk * concentrationFactor;
    return Math.min(Math.round(raw * 100) / 100, 100);
  }

  /**
   * Get individual vulnerability risk score
   */
  async getVulnerabilityRisk(vulnId: string) {
    const vuln = await prisma.vulnerability.findUnique({
      where: { id: vulnId },
      select: {
        id: true,
        titulo: true,
        criticidade: true,
        scoreCvss: true,
        diasEmAberto: true,
        ambiente: true,
        reincidencia: true,
        status: true,
        squad: true,
        codigoInterno: true,
      },
    });

    if (!vuln) return null;

    const vulnData: VulnForRisk = {
      id: vuln.id,
      criticidade: vuln.criticidade as string,
      scoreCvss: vuln.scoreCvss,
      diasEmAberto: vuln.diasEmAberto,
      ambiente: vuln.ambiente as string,
      reincidencia: vuln.reincidencia,
      status: vuln.status as string,
      squad: vuln.squad,
    };

    const riskScore = this.computeVulnRisk(vulnData);

    // Compute individual factor breakdown
    const baseScore = vuln.scoreCvss != null
      ? vuln.scoreCvss * 10
      : (SEVERITY_BASE[vuln.criticidade as string] || 20);
    const ageFactor = 1.0 + Math.min(vuln.diasEmAberto / 90, 1.0) * 0.5;
    const environmentFactor = ENVIRONMENT_FACTOR[vuln.ambiente as string] || 1.0;
    const recurrenceFactor = Math.min(1.0 + vuln.reincidencia * 0.15, 1.6);

    return {
      id: vuln.id,
      codigoInterno: vuln.codigoInterno,
      titulo: vuln.titulo,
      riskScore,
      factors: {
        baseScore: Math.round(baseScore * 100) / 100,
        ageFactor: Math.round(ageFactor * 100) / 100,
        environmentFactor,
        recurrenceFactor: Math.round(recurrenceFactor * 100) / 100,
      },
      details: {
        criticidade: vuln.criticidade,
        scoreCvss: vuln.scoreCvss,
        diasEmAberto: vuln.diasEmAberto,
        ambiente: vuln.ambiente,
        reincidencia: vuln.reincidencia,
        status: vuln.status,
      },
    };
  }

  /**
   * Portfolio/Global Risk Score (0-100)
   */
  async getPortfolioRisk() {
    const assets = await prisma.asset.findMany({
      where: { status: 'ACTIVE' },
      include: {
        vulnerabilities: {
          select: {
            id: true,
            criticidade: true,
            scoreCvss: true,
            diasEmAberto: true,
            ambiente: true,
            reincidencia: true,
            status: true,
            squad: true,
          },
        },
      },
    });

    let totalWeight = 0;
    let weightedScoreSum = 0;
    const byCategory: Record<string, { count: number; avgRisk: number; totalRisk: number }> = {};
    const bySeverity: Record<string, { count: number; avgRisk: number }> = {};

    // Collect all open vuln risks for severity breakdown
    const allOpenVulns: { criticidade: string; risk: number }[] = [];

    for (const asset of assets) {
      const assetData: AssetForRisk = {
        id: asset.id,
        name: asset.name,
        businessCriticality: asset.businessCriticality as string,
        status: asset.status as string,
        vulnerabilities: asset.vulnerabilities.map((v: any) => ({
          id: v.id,
          criticidade: v.criticidade as string,
          scoreCvss: v.scoreCvss,
          diasEmAberto: v.diasEmAberto,
          ambiente: v.ambiente as string,
          reincidencia: v.reincidencia,
          status: v.status as string,
          squad: v.squad,
        })),
      };

      const assetRisk = this.computeAssetRisk(assetData);
      const bw = BUSINESS_WEIGHT[asset.businessCriticality as string] || 1.0;
      weightedScoreSum += assetRisk * bw;
      totalWeight += bw;

      // By category (businessCriticality)
      const cat = asset.businessCriticality as string;
      if (!byCategory[cat]) byCategory[cat] = { count: 0, avgRisk: 0, totalRisk: 0 };
      byCategory[cat].count++;
      byCategory[cat].totalRisk += assetRisk;

      // Collect open vulns for severity breakdown
      const openVulns = asset.vulnerabilities.filter((v: any) => !CLOSED_STATUSES.includes(v.status as string));
      for (const v of openVulns) {
        const vRisk = this.computeVulnRisk({
          id: v.id,
          criticidade: v.criticidade as string,
          scoreCvss: v.scoreCvss,
          diasEmAberto: v.diasEmAberto,
          ambiente: v.ambiente as string,
          reincidencia: v.reincidencia,
          status: v.status as string,
          squad: v.squad,
        });
        allOpenVulns.push({ criticidade: v.criticidade as string, risk: vRisk });
      }
    }

    // Compute category averages
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avgRisk = byCategory[cat].count > 0
        ? Math.round((byCategory[cat].totalRisk / byCategory[cat].count) * 100) / 100
        : 0;
    }

    // Compute severity breakdown
    for (const v of allOpenVulns) {
      if (!bySeverity[v.criticidade]) bySeverity[v.criticidade] = { count: 0, avgRisk: 0 };
      bySeverity[v.criticidade].count++;
      bySeverity[v.criticidade].avgRisk += v.risk;
    }
    for (const sev of Object.keys(bySeverity)) {
      bySeverity[sev].avgRisk = bySeverity[sev].count > 0
        ? Math.round((bySeverity[sev].avgRisk / bySeverity[sev].count) * 100) / 100
        : 0;
    }

    const portfolioScore = totalWeight > 0
      ? Math.min(Math.round((weightedScoreSum / totalWeight) * 100) / 100, 100)
      : 0;

    // Simple trend: compare current score to what it would be without age factor boost
    // (We just return the current score and let the frontend handle trend via /trends)
    return {
      score: portfolioScore,
      totalAssets: assets.length,
      totalOpenVulns: allOpenVulns.length,
      byCategory,
      bySeverity,
    };
  }

  /**
   * Squad Risk Scores
   */
  async getSquadRisks() {
    const vulns = await prisma.vulnerability.findMany({
      where: { status: { in: OPEN_STATUSES as any } },
      select: {
        id: true,
        criticidade: true,
        scoreCvss: true,
        diasEmAberto: true,
        ambiente: true,
        reincidencia: true,
        status: true,
        squad: true,
      },
    });

    const squadMap: Record<string, VulnForRisk[]> = {};
    for (const v of vulns) {
      const squad = v.squad || 'Sem Squad';
      if (!squadMap[squad]) squadMap[squad] = [];
      squadMap[squad].push({
        id: v.id,
        criticidade: v.criticidade as string,
        scoreCvss: v.scoreCvss,
        diasEmAberto: v.diasEmAberto,
        ambiente: v.ambiente as string,
        reincidencia: v.reincidencia,
        status: v.status as string,
        squad: v.squad,
      });
    }

    const squads = Object.entries(squadMap).map(([squad, vulnList]) => {
      const risks = vulnList.map(v => this.computeVulnRisk(v));
      const avgRisk = risks.length > 0
        ? Math.round((risks.reduce((a, b) => a + b, 0) / risks.length) * 100) / 100
        : 0;
      const maxRisk = risks.length > 0 ? Math.max(...risks) : 0;

      const bySeverity: Record<string, number> = {};
      for (const v of vulnList) {
        bySeverity[v.criticidade] = (bySeverity[v.criticidade] || 0) + 1;
      }

      return {
        squad,
        riskScore: avgRisk,
        maxRisk,
        openVulnCount: vulnList.length,
        bySeverity,
      };
    });

    // Sort by risk score descending
    squads.sort((a, b) => b.riskScore - a.riskScore);

    return { squads };
  }

  /**
   * Risk trends - last 6 months of simulated portfolio risk
   * Since we don't have historical snapshots, we approximate by using diasEmAberto
   */
  async getRiskTrends() {
    const now = new Date();
    const months: { label: string; date: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        date: d,
      });
    }

    // Get all vulnerabilities with creation dates in the last 6 months window
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allVulns = await prisma.vulnerability.findMany({
      select: {
        id: true,
        criticidade: true,
        scoreCvss: true,
        diasEmAberto: true,
        ambiente: true,
        reincidencia: true,
        status: true,
        squad: true,
        dataCriacao: true,
        ultimaAtualizacao: true,
      },
    });

    const assets = await prisma.asset.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        businessCriticality: true,
        status: true,
      },
    });

    // For each month, estimate the portfolio risk as if we snapshot at end of that month
    const trends = months.map(month => {
      const endOfMonth = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0);

      // Vulns that were open at the end of this month:
      // - created before end of month
      // - either still open, or closed after end of month
      const openAtMonth = allVulns.filter(v => {
        const created = new Date(v.dataCriacao);
        if (created > endOfMonth) return false;
        const isClosed = CLOSED_STATUSES.includes(v.status as string);
        if (!isClosed) return true;
        // If closed, check if it was closed after this month
        const updated = new Date(v.ultimaAtualizacao);
        return updated > endOfMonth;
      });

      // Simple portfolio score approximation: average vuln risk
      if (openAtMonth.length === 0) {
        return { month: month.label, score: 0, vulnCount: 0 };
      }

      const risks = openAtMonth.map(v => {
        // Approximate diasEmAberto at that point in time
        const created = new Date(v.dataCriacao);
        const daysOpen = Math.max(0, Math.floor((endOfMonth.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
        return this.computeVulnRisk({
          id: v.id,
          criticidade: v.criticidade as string,
          scoreCvss: v.scoreCvss,
          diasEmAberto: daysOpen,
          ambiente: v.ambiente as string,
          reincidencia: v.reincidencia,
          status: v.status as string,
          squad: v.squad,
        });
      });

      const avgRisk = Math.round((risks.reduce((a, b) => a + b, 0) / risks.length) * 100) / 100;

      return { month: month.label, score: Math.min(avgRisk, 100), vulnCount: openAtMonth.length };
    });

    return { trends };
  }

  /**
   * Compute asset risk for use by AssetsService
   */
  computeAssetRiskFromData(
    businessCriticality: string,
    vulnerabilities: Array<{
      criticidade: string;
      scoreCvss?: number | null;
      diasEmAberto?: number;
      ambiente?: string;
      reincidencia?: number;
      status: string;
    }>
  ): number {
    const openVulns = vulnerabilities.filter(v => !CLOSED_STATUSES.includes(v.status));
    if (openVulns.length === 0) return 0;

    const vulnRisks = openVulns
      .map(v => this.computeVulnRisk({
        id: '',
        criticidade: v.criticidade,
        scoreCvss: v.scoreCvss ?? null,
        diasEmAberto: v.diasEmAberto ?? 0,
        ambiente: v.ambiente ?? 'PRODUCAO',
        reincidencia: v.reincidencia ?? 0,
        status: v.status,
        squad: '',
      }))
      .sort((a, b) => b - a);

    const top5 = vulnRisks.slice(0, 5);
    let weightSum = 0;
    let weightedSum = 0;
    top5.forEach((risk, i) => {
      const w = top5.length - i;
      weightedSum += risk * w;
      weightSum += w;
    });
    const weightedAvgVulnRisk = weightSum > 0 ? weightedSum / weightSum : 0;

    const bw = BUSINESS_WEIGHT[businessCriticality] || 1.0;
    const concentrationFactor = 1.0 + Math.min(openVulns.length / 10, 0.5);

    const raw = bw * weightedAvgVulnRisk * concentrationFactor;
    return Math.min(Math.round(raw * 100) / 100, 100);
  }
}
