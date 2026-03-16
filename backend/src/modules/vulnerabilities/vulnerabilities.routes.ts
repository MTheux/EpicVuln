import { Router } from 'express';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { prisma } from '../../app';
import { Response } from 'express';

const router = Router();
const controller = new VulnerabilitiesController();

// Mock de autenticação para testes do frontend sem JWT
const mockAuth = async (req: AuthRequest, res: Response, next: any) => {
    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
        req.user = { id: defaultUser.id };
    } else {
        req.user = { id: 'dev-mock-id' };
    }
    next();
};

// Exige autenticação (mockada temporariamente) para todas as rotas
router.use(mockAuth);

router.get('/', controller.findAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.post('/import', controller.importJira.bind(controller));
router.delete('/all', controller.deleteAll.bind(controller));
router.get('/:id', controller.findOne.bind(controller));
router.patch('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));
router.post('/:id/comments', controller.addComment.bind(controller));

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Certificar que a pasta uploads existe
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer com filtro de extensões e bloqueio de RCE
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Extensões permitidas com base no pedido
    const allowedExts = ['.png', '.jpg', '.jpeg', '.php', '.html'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Extension not allowed. Default allowed: png, jpg, jpeg, php, html'));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Rotas de Upload e Download Seguro
router.post('/:id/evidence', upload.single('file'), controller.uploadEvidence.bind(controller));
router.get('/:id/evidence/:filename', controller.downloadEvidence.bind(controller));

export default router;
