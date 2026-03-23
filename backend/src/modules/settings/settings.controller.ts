import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { SettingsService } from './settings.service';

const service = new SettingsService();

export class SettingsController {
  async getSlaConfig(req: Request, res: Response) {
    try {
      const config = await service.getSlaConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar configuração SLA' });
    }
  }

  async updateSlaConfig(req: Request, res: Response) {
    try {
      const config = await service.updateSlaConfig(req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar configuração SLA' });
    }
  }

  async getCompanyProfile(req: Request, res: Response) {
    try {
      const profile = await service.getCompanyProfile();
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar perfil da empresa' });
    }
  }

  async updateCompanyProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const profile = await service.updateCompanyProfile(req.body, userId);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar perfil da empresa' });
    }
  }

  async getDiscoveredSquads(req: Request, res: Response) {
    try {
      const squads = await service.getDiscoveredSquads();
      res.json({ squads });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar squads' });
    }
  }

  async getCompanyStats(req: Request, res: Response) {
    try {
      const stats = await service.getCompanyStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  async getOnboardingStatus(req: Request, res: Response) {
    try {
      const status = await service.getOnboardingStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao verificar status do onboarding' });
    }
  }
}
