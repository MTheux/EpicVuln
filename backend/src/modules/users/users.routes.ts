import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();
const usersController = new UsersController();

// Apenas ADMIN e GESTOR podem gerenciar os usuários
router.use(authenticate, requireRoles(['ADMIN', 'GESTOR']));

router.get('/', usersController.findAll.bind(usersController));
router.post('/', usersController.create.bind(usersController));
router.get('/:id', usersController.findOne.bind(usersController));
router.patch('/:id', usersController.update.bind(usersController));

export default router;
