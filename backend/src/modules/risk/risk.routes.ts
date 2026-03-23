import { Router } from 'express';
import { RiskController } from './risk.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new RiskController();

router.use(authenticate);

router.get('/portfolio', controller.getPortfolioRisk.bind(controller));
router.get('/squads', controller.getSquadRisks.bind(controller));
router.get('/vulnerability/:id', controller.getVulnerabilityRisk.bind(controller));
router.get('/trends', controller.getRiskTrends.bind(controller));

export default router;
