import { Request, Response } from 'express';
import { RiskService } from './risk.service';

export class RiskController {
  private service: RiskService;

  constructor() {
    this.service = new RiskService();
  }

  async getPortfolioRisk(req: Request, res: Response) {
    try {
      const data = await this.service.getPortfolioRisk();
      res.json(data);
    } catch (error) {
      console.error('Error fetching portfolio risk:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSquadRisks(req: Request, res: Response) {
    try {
      const data = await this.service.getSquadRisks();
      res.json(data);
    } catch (error) {
      console.error('Error fetching squad risks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getVulnerabilityRisk(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await this.service.getVulnerabilityRisk(id);
      if (!data) {
        return res.status(404).json({ error: 'Vulnerability not found' });
      }
      res.json(data);
    } catch (error) {
      console.error('Error fetching vulnerability risk:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRiskTrends(req: Request, res: Response) {
    try {
      const data = await this.service.getRiskTrends();
      res.json(data);
    } catch (error) {
      console.error('Error fetching risk trends:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
