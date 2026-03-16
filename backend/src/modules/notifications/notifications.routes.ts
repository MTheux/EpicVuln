import { Request, Response, Router } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const service = new NotificationsService();

// GET /stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const data = await service.getStats();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const data = await service.getLogs(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /send
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const { squad, motivo, body } = req.body;
    const userId = req.user?.id || 'system';
    const data = await service.sendManualNotification({ squad, motivo, body, userId });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /trigger/:jobName
router.post('/trigger/:jobName', async (req: Request, res: Response) => {
  try {
    const jobName = req.params.jobName as string;
    await service.triggerJob(jobName);
    res.json({ success: true, data: { jobName, triggered: true } });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

// GET /rules
router.get('/rules', async (_req: Request, res: Response) => {
  try {
    const data = await service.getRules();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /rules
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const data = await service.createRule(req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /rules/:id/toggle
router.patch('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const data = await service.toggleRule(req.params.id as string);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error.message === 'Rule not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

// DELETE /rules/:id
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    await service.deleteRule(req.params.id as string);
    res.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /email-status
router.get('/email-status', async (_req: Request, res: Response) => {
  try {
    const data = await service.getEmailStatus();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
