import { Router } from 'express';
import { AssetsController } from './assets.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AssetsController();

router.use(authenticate);

router.get('/', controller.findAll);
router.get('/stats', controller.getStats);
router.get('/:id', controller.findOne);
router.post('/', requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR']), controller.create);
router.patch('/:id', requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR']), controller.update);
router.delete('/:id', requireRoles(['ADMIN', 'SEGURANCA']), controller.delete);
router.post('/:id/link-vulnerability', requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR']), controller.linkVulnerability);
router.post('/:id/unlink-vulnerability', requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR']), controller.unlinkVulnerability);

export default router;
