import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AssetsService } from './assets.service';

export class AssetsController {
  private service: AssetsService;

  constructor() {
    this.service = new AssetsService();
  }

  findAll = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.service.findAll({
        search: req.query.search as string,
        type: req.query.type as any,
        businessCriticality: req.query.businessCriticality as any,
        squad: req.query.squad as string,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      }, req.organizationId);
      res.json(result);
    } catch (e: any) {
      console.error('Assets findAll error:', e);
      res.status(500).json({ error: 'Erro ao buscar ativos' });
    }
  };

  findOne = async (req: Request, res: Response) => {
    try {
      const asset = await this.service.findOne(req.params.id as string);
      if (!asset) { res.status(404).json({ error: 'Ativo não encontrado' }); return; }
      res.json(asset);
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao buscar ativo' });
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const { name, type, businessCriticality, description, owner, squad, environment, url, tags, status } = req.body;
      if (!name || !type || !businessCriticality) {
        res.status(400).json({ error: 'name, type e businessCriticality são obrigatórios' }); return;
      }
      const asset = await this.service.create({ name, type, businessCriticality, description, owner, squad, environment, url, tags, status }, req.organizationId);
      res.status(201).json(asset);
    } catch (e: any) {
      console.error('Assets create error:', e);
      res.status(500).json({ error: 'Erro ao criar ativo' });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const asset = await this.service.update(req.params.id as string, req.body);
      res.json(asset);
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao atualizar ativo' });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await this.service.delete(req.params.id as string);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao excluir ativo' });
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  };

  linkVulnerability = async (req: Request, res: Response) => {
    try {
      const { vulnerabilityId } = req.body;
      if (!vulnerabilityId) { res.status(400).json({ error: 'vulnerabilityId é obrigatório' }); return; }
      await this.service.linkVulnerability(req.params.id as string, vulnerabilityId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao vincular vulnerabilidade' });
    }
  };

  unlinkVulnerability = async (req: Request, res: Response) => {
    try {
      const { vulnerabilityId } = req.body;
      if (!vulnerabilityId) { res.status(400).json({ error: 'vulnerabilityId é obrigatório' }); return; }
      await this.service.unlinkVulnerability(vulnerabilityId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao desvincular vulnerabilidade' });
    }
  };
}
