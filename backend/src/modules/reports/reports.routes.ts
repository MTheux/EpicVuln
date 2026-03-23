import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new ReportsController();

router.use(authenticate);

router.get('/insights', controller.getInsights.bind(controller));
router.get('/dora', controller.getDora.bind(controller));
router.get('/export/excel', controller.downloadExcel.bind(controller));
router.get('/export/pdf', controller.downloadPdf.bind(controller));

export default router;
