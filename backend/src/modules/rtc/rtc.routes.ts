import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { RtcController } from './rtc.controller';

const router = Router();
const controller = new RtcController();

// GET /rtc/settings - buscar configuracoes do RTC
router.get('/settings', authenticate, (req, res) => controller.getSettings(req as any, res));

// POST /rtc/settings - salvar configuracoes do RTC (somente ADMIN)
router.post('/settings', authenticate, requireRoles(['ADMIN']), (req, res) => controller.saveSettings(req as any, res));

// POST /rtc/sync - sincronizar work items do RTC
router.post('/sync', authenticate, (req, res) => controller.sync(req as any, res));

// POST /rtc/test - testar conexao com o RTC
router.post('/test', authenticate, (req, res) => controller.testConnection(req as any, res));

export default router;
