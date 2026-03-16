import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticate);
router.get('/dashboard', controller.getDashboard.bind(controller));

export default router;
