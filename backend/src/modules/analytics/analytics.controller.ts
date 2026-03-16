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
}
