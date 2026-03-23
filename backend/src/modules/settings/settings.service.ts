import { prisma } from '../../app';

const SLA_KEY = 'sla_config';
const COMPANY_PROFILE_KEY = 'company_profile';

const DEFAULT_SLA: Record<string, number> = {
  EXTREMA: 0,
  CRITICA: 30,
  ALTA: 90,
  MEDIA: 180,
  BAIXA: 270,
  INFORMATIVA: 365,
};

export class SettingsService {
  async getSlaConfig(): Promise<Record<string, number>> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: SLA_KEY },
      });
      if (setting) {
        return JSON.parse(setting.value);
      }
      return DEFAULT_SLA;
    } catch {
      return DEFAULT_SLA;
    }
  }

  async updateSlaConfig(config: Record<string, number>): Promise<Record<string, number>> {
    // Validate: only allow known severity keys, values must be non-negative integers
    const valid: Record<string, number> = {};
    for (const key of Object.keys(DEFAULT_SLA)) {
      const val = config[key];
      if (typeof val === 'number' && val >= 0 && Number.isInteger(val)) {
        valid[key] = val;
      } else {
        valid[key] = DEFAULT_SLA[key];
      }
    }

    await prisma.systemSettings.upsert({
      where: { key: SLA_KEY },
      update: { value: JSON.stringify(valid) },
      create: { key: SLA_KEY, value: JSON.stringify(valid) },
    });

    return valid;
  }

  async getCompanyProfile(): Promise<Record<string, any>> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: COMPANY_PROFILE_KEY },
      });
      if (setting) {
        return JSON.parse(setting.value);
      }
      return {};
    } catch {
      return {};
    }
  }

  async updateCompanyProfile(profile: Record<string, any>, userId?: string): Promise<Record<string, any>> {
    const { name, sector, description, logo, dataSources, squads, assetCategories } = profile;

    // Create or update organization for multi-tenant support
    const orgId = profile.organizationId || `org-${Date.now()}`;

    const org = await prisma.organization.upsert({
      where: { id: orgId },
      create: {
        id: orgId,
        name: name || 'Unnamed Organization',
        sector: sector || null,
        description: description || null,
        logo: logo || null,
      },
      update: {
        name: name || 'Unnamed Organization',
        sector: sector || null,
        description: description || null,
        logo: logo || null,
      },
    });

    // Assign user to this organization
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { organizationId: org.id },
      });
    }

    const data = { name, sector, description, logo, dataSources, squads, assetCategories, organizationId: org.id };

    // Also save in SystemSettings for backward compatibility
    await prisma.systemSettings.upsert({
      where: { key: COMPANY_PROFILE_KEY },
      update: { value: JSON.stringify(data) },
      create: { key: COMPANY_PROFILE_KEY, value: JSON.stringify(data) },
    });

    return data;
  }

  async getDiscoveredSquads(): Promise<string[]> {
    try {
      const vulnSquads = await prisma.vulnerability.findMany({
        select: { squad: true },
        distinct: ['squad'],
        where: { squad: { not: '' } },
      });
      const assetSquads = await prisma.asset.findMany({
        select: { squad: true },
        distinct: ['squad'],
        where: { squad: { not: null } },
      });
      const allSquads = new Set<string>();
      vulnSquads.forEach(v => { if (v.squad) allSquads.add(v.squad); });
      assetSquads.forEach(a => { if (a.squad) allSquads.add(a.squad); });
      return Array.from(allSquads).sort();
    } catch {
      return [];
    }
  }

  async getCompanyStats(): Promise<Record<string, any>> {
    try {
      const [totalVulns, totalAssets, totalUsers, openVulns] = await Promise.all([
        prisma.vulnerability.count(),
        prisma.asset.count(),
        prisma.user.count(),
        prisma.vulnerability.count({ where: { status: { notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] } } }),
      ]);
      return { totalVulns, totalAssets, totalUsers, openVulns };
    } catch {
      return { totalVulns: 0, totalAssets: 0, totalUsers: 0, openVulns: 0 };
    }
  }

  async getOnboardingStatus(): Promise<{ completed: boolean }> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: COMPANY_PROFILE_KEY },
      });
      if (setting) {
        const profile = JSON.parse(setting.value);
        return { completed: !!profile.name };
      }
      return { completed: false };
    } catch {
      return { completed: false };
    }
  }
}
