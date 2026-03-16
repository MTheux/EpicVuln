import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';

export class NotificationsController {
    private service: NotificationsService;

    constructor() {
        this.service = new NotificationsService();
    }

    async notify(req: AuthRequest, res: Response) {
        try {
            const result = await this.service.notifySquad(req.body.vulnerabilityId, req.user!.id);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'Vulnerability not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }
}

const router = Router();
const controller = new NotificationsController();

router.post('/notify-squad', authenticate, controller.notify.bind(controller));

export default router;
