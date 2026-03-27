import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/users.routes';
import vulnRoutes from './vulnerabilities/vulnerabilities.routes';
import analyticsRoutes from './analytics/analytics.routes';
import notificationsRoutes from './notifications/notifications.routes';
import importsRoutes from './imports/imports.routes';
import assetsRoutes from './assets/assets.routes';
import llmRoutes from './llm/llm.routes';
import reportsRoutes from './reports/reports.routes';
import settingsRoutes from './settings/settings.routes';
import riskRoutes from './risk/risk.routes';
import rtcRoutes from './rtc/rtc.routes';
import auditRoutes from './audit/audit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vulnerabilities', vulnRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/imports', importsRoutes);
router.use('/llm', llmRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/assets', assetsRoutes);
router.use('/risk', riskRoutes);
router.use('/rtc', rtcRoutes);
router.use('/audit', auditRoutes);

export default router;
