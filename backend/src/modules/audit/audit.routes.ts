import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/role.middleware';

const router = Router();

router.get('/', authMiddleware, requireRoles(['ADMIN']), AuditController.getLogs);

export default router;
