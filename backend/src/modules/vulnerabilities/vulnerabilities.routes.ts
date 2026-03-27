import { Router } from 'express';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();
const controller = new VulnerabilitiesController();

// All routes require authentication
router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.post('/', controller.create.bind(controller));
router.post('/import', controller.importData.bind(controller));
router.post('/import-xml', controller.importXml.bind(controller));
router.delete('/all', requireRoles(['ADMIN', 'SEGURANCA']), controller.deleteAll.bind(controller));
router.get('/:id', controller.findOne.bind(controller));
router.patch('/:id', controller.update.bind(controller));
router.delete('/:id', requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR']), controller.delete.bind(controller));
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
    // Safe file extensions only - no executable types
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.pdf', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Extensao nao permitida. Tipos aceitos: png, jpg, jpeg, gif, bmp, webp, pdf, txt, csv'));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Rotas de Upload e Download Seguro
router.post('/:id/evidence', upload.single('file'), controller.uploadEvidence.bind(controller));
router.get('/:id/evidence/:filename', controller.downloadEvidence.bind(controller));

export default router;
