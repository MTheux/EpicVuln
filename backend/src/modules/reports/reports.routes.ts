import { Router, Request, Response } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { generateVulnReport } from './vuln-report.service';

const router = Router();
const controller = new ReportsController();

router.use(authenticate);

router.get('/insights', controller.getInsights.bind(controller));
router.get('/dora', controller.getDora.bind(controller));
router.get('/export/excel', controller.downloadExcel.bind(controller));
router.get('/export/pdf', controller.downloadPdf.bind(controller));

// Laudo gerencial individual por vulnerabilidade (PDF)
router.get('/vuln/:id/pdf', async (req: Request, res: Response) => {
  try {
    await generateVulnReport(String(req.params.id), res);
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

export default router;
