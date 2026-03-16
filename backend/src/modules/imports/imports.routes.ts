import { Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';

// MOCK: Configuração simples de rotas.
// Num ambiente de prod, integraríamos Multer e leríamos arquivos xlsx/csv.

const router = Router();

router.post('/csv', authenticate, async (req: Request, res: Response) => {
    try {
        // Faria o parsing do CSV e salvaria as vulnerabilidades
        res.json({ success: true, message: 'CSV importado com sucesso (mock)', importedCount: 10 });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao importar CSV' });
    }
});

router.post('/excel', authenticate, async (req: Request, res: Response) => {
    try {
        res.json({ success: true, message: 'Excel importado com sucesso (mock)', importedCount: 5 });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao importar Excel' });
    }
});

export default router;
