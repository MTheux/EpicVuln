import { PrismaClient, AssetType, BusinessCriticality, AssetStatus, Ambiente } from '@prisma/client';
import { RiskService } from '../risk/risk.service';

const prisma = new PrismaClient();

const CLOSED_STATUSES = ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'];

const riskService = new RiskService();

export class AssetsService {
  private computeRiskScore(
    businessCriticality: string,
    vulns: { criticidade: string; status: string; scoreCvss?: number | null; diasEmAberto?: number; ambiente?: string; reincidencia?: number }[]
  ): number {
    return riskService.computeAssetRiskFromData(businessCriticality, vulns);
  }

  async findAll(filters: {
    search?: string; type?: AssetType; businessCriticality?: BusinessCriticality;
    squad?: string; status?: AssetStatus; page?: number; limit?: number;
  }, organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { owner: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.type) where.type = filters.type;
    if (filters.businessCriticality) where.businessCriticality = filters.businessCriticality;
    if (filters.squad) where.squad = filters.squad;
    if (filters.status) where.status = filters.status || 'ACTIVE';

    const page = filters.page || 1;
    const limit = filters.limit || 100;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          vulnerabilities: {
            select: {
              id: true, criticidade: true, status: true,
              scoreCvss: true, diasEmAberto: true, ambiente: true, reincidencia: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    const mapped = assets.map(a => {
      const openVulns = a.vulnerabilities.filter(v => !CLOSED_STATUSES.includes(v.status));
      const criticalVulns = a.vulnerabilities.filter(v => ['EXTREMA', 'CRITICA'].includes(v.criticidade) && !CLOSED_STATUSES.includes(v.status));
      return {
        ...a,
        vulnerabilityCount: a.vulnerabilities.length,
        openVulnCount: openVulns.length,
        criticalVulnCount: criticalVulns.length,
        riskScore: this.computeRiskScore(a.businessCriticality, a.vulnerabilities),
        vulnerabilities: undefined, // Don't send full vuln list in list view
      };
    });

    return { data: mapped, total, page, limit };
  }

  async findOne(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        vulnerabilities: {
          select: {
            id: true, codigoInterno: true, jiraKey: true, titulo: true,
            criticidade: true, status: true, squad: true, diasEmAberto: true,
            sla: true, responsavel: true, dataCriacao: true,
          },
          orderBy: { dataCriacao: 'desc' },
        },
      },
    });
    if (!asset) return null;

    const openVulns = asset.vulnerabilities.filter(v => !CLOSED_STATUSES.includes(v.status));
    const criticalVulns = asset.vulnerabilities.filter(v => ['EXTREMA', 'CRITICA'].includes(v.criticidade) && !CLOSED_STATUSES.includes(v.status));

    return {
      ...asset,
      vulnerabilityCount: asset.vulnerabilities.length,
      openVulnCount: openVulns.length,
      criticalVulnCount: criticalVulns.length,
      riskScore: this.computeRiskScore(asset.businessCriticality, asset.vulnerabilities as any),
    };
  }

  async create(data: {
    name: string; type: AssetType; businessCriticality: BusinessCriticality;
    description?: string; owner?: string; squad?: string;
    environment?: Ambiente; url?: string; tags?: string[]; status?: AssetStatus;
  }, organizationId?: string) {
    return prisma.asset.create({ data: { ...data, tags: data.tags || [], organizationId: organizationId || undefined } });
  }

  async update(id: string, data: Partial<{
    name: string; type: AssetType; businessCriticality: BusinessCriticality;
    description: string; owner: string; squad: string;
    environment: Ambiente; url: string; tags: string[]; status: AssetStatus;
  }>) {
    return prisma.asset.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.asset.delete({ where: { id } });
  }

  async linkVulnerability(assetId: string, vulnerabilityId: string) {
    return prisma.vulnerability.update({
      where: { id: vulnerabilityId },
      data: { assetId },
    });
  }

  async unlinkVulnerability(vulnerabilityId: string) {
    return prisma.vulnerability.update({
      where: { id: vulnerabilityId },
      data: { assetId: null },
    });
  }

  async getStats() {
    const [total, byType, byCriticality, withOpenCritical] = await Promise.all([
      prisma.asset.count({ where: { status: 'ACTIVE' } }),
      prisma.asset.groupBy({ by: ['type'], _count: true, where: { status: 'ACTIVE' } }),
      prisma.asset.groupBy({ by: ['businessCriticality'], _count: true, where: { status: 'ACTIVE' } }),
      prisma.asset.count({
        where: {
          status: 'ACTIVE',
          vulnerabilities: {
            some: {
              criticidade: { in: ['EXTREMA', 'CRITICA'] },
              status: { notIn: CLOSED_STATUSES as any },
            },
          },
        },
      }),
    ]);

    return { total, byType, byCriticality, withOpenCritical };
  }
}
