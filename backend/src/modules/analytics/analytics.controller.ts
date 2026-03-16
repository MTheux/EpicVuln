import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
    private service: AnalyticsService;

    constructor() {
        this.service = new AnalyticsService();
    }

    async getDashboard(req: Request, res: Response) {
        try {
            const data = await this.service.getDashboardMetrics();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getSquadScoreboards(req: Request, res: Response) {
        try {
            const data = await this.service.getSquadScoreboards();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getSquadDetail(req: Request, res: Response) {
        try {
            const squadName = req.params.squadName as string;
            const data = await this.service.getSquadDetail(decodeURIComponent(squadName));
            if (!data) {
                return res.status(404).json({ error: 'Squad not found' });
            }
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getSsdlcOverview(req: Request, res: Response) {
        try {
            const data = await this.service.getSsdlcOverview();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
