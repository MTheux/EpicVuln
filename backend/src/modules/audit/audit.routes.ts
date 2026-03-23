import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, requireRoles(['ADMIN']), AuditController.getLogs);

export default router;
