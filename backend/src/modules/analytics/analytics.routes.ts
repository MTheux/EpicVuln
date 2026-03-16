import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticate);

router.get('/dashboard', controller.getDashboard.bind(controller));
router.get('/squads', controller.getSquadScoreboards.bind(controller));
router.get('/squads/:squadName', controller.getSquadDetail.bind(controller));
router.get('/ssdlc', controller.getSsdlcOverview.bind(controller));

export default router;
