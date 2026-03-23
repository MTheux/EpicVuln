import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { SettingsController } from './settings.controller';

const router = Router();
const controller = new SettingsController();

// Anyone authenticated can read SLA config
router.get('/sla', authenticate, controller.getSlaConfig);

// Only ADMIN can update
router.put('/sla', authenticate, requireRoles(['ADMIN']), controller.updateSlaConfig);

// Company profile
router.get('/company-profile', authenticate, controller.getCompanyProfile);
router.put('/company-profile', authenticate, requireRoles(['ADMIN']), controller.updateCompanyProfile);

// Discovered squads from vulns/assets
router.get('/discovered-squads', authenticate, controller.getDiscoveredSquads);

// Company stats
router.get('/company-stats', authenticate, controller.getCompanyStats);

// Onboarding status
router.get('/onboarding-status', authenticate, controller.getOnboardingStatus);

export default router;
