import { Request, Response } from 'express';
import { ReportsService } from './reports.service';

export class ReportsController {
    private service: ReportsService;

    constructor() {
        this.service = new ReportsService();
    }

    async getInsights(req: Request, res: Response) {
        try {
            const data = await this.service.getWeeklyInsights();
            res.json(data);
        } catch (error) {
            console.error('Error fetching insights:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getDora(req: Request, res: Response) {
        try {
            const data = await this.service.getDoraMetrics();
            res.json(data);
        } catch (error) {
            console.error('Error fetching DORA metrics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async downloadExcel(req: Request, res: Response) {
        try {
            const buffer = await this.service.generateExcel();
            const filename = `epicvuln-relatorio-${new Date().toISOString().split('T')[0]}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Error generating Excel:', error);
            res.status(500).json({ error: 'Failed to generate Excel' });
        }
    }

    async downloadPdf(req: Request, res: Response) {
        try {
            const buffer = await this.service.generatePdf();
            const filename = `epicvuln-relatorio-${new Date().toISOString().split('T')[0]}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }
}
