import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/users.routes';
import vulnRoutes from './vulnerabilities/vulnerabilities.routes';
import analyticsRoutes from './analytics/analytics.routes';
import notificationsRoutes from './notifications/notifications.routes';
import jiraRoutes from './jira/jira.routes';
import importsRoutes from './imports/imports.routes';
import llmRoutes from './llm/llm.routes';
import reportsRoutes from './reports/reports.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vulnerabilities', vulnRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/jira', jiraRoutes);
router.use('/imports', importsRoutes);
router.use('/llm', llmRoutes);
router.use('/reports', reportsRoutes);

export default router;
