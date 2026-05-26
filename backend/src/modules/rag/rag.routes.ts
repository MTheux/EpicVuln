import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { authenticate } from '../../middleware/auth.middleware';
import { ingestText, querySimilar, listDocs, deleteDoc } from './rag.service';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Upload doc → extrair texto → ingest no RAG.
 * Suporta: PDF, TXT, MD, JSON (texto plano).
 */
router.post('/ingest', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'arquivo obrigatório' });
    const filename = req.file.originalname;
    const buf = req.file.buffer;
    let text = '';
    if (/\.pdf$/i.test(filename)) {
      const parsed = await pdfParse(buf);
      text = parsed.text || '';
    } else if (/\.(txt|md|json|yaml|yml)$/i.test(filename)) {
      text = buf.toString('utf-8');
    } else {
      // Try as utf-8 text; if too binary, fail gracefully
      text = buf.toString('utf-8');
    }
    if (!text.trim()) {
      return res.status(400).json({ error: 'Conteúdo vazio após extração' });
    }
    const orgId = (req as any).organizationId || (req as any).user?.organizationId || null;
    const result = await ingestText({ docName: filename, text, organizationId: orgId });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Query semântica — retorna top-K chunks relevantes.
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, topK = 5 } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query obrigatória' });
    const orgId = (req as any).organizationId || (req as any).user?.organizationId || null;
    const results = await querySimilar({ query, topK, organizationId: orgId });
    res.json({ query, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Lista docs ingeridos.
 */
router.get('/docs', async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).organizationId || (req as any).user?.organizationId || null;
    const docs = await listDocs(orgId);
    res.json(docs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/docs/:docId', async (req: Request, res: Response) => {
  try {
    const count = await deleteDoc(String(req.params.docId));
    res.json({ deleted: count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
