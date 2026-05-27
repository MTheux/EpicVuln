/**
 * AISEC ↔ MemPalace bridge.
 *
 * Proxies + thin wrappers em cima do serviço MemPalace stub que roda em
 * container separado (porta 9002). Mantém o backend AISEC desacoplado:
 * se o MemPalace estiver down, endpoints retornam 503 sem quebrar nada.
 *
 * Endpoints:
 *  GET    /api/memory/health         — ping do serviço
 *  GET    /api/memory/wings          — lista wings + contagens
 *  POST   /api/memory/store          — guarda 1 drawer
 *  POST   /api/memory/recall         — busca por similaridade
 *  DELETE /api/memory/wing/:wing     — apaga wing inteira
 *
 * Convenção AISEC: o `wing` default é o e-mail do usuário autenticado
 * (multi-tenant por user). O `room` é o nome da skill que originou o store.
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const MEMPALACE_URL = process.env.MEMPALACE_URL || 'http://mempalace:9002';

router.use(authenticate);

function userWing(req: AuthRequest): string {
  return (req.user?.email || 'anonymous').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function memCall(path: string, method: string = 'GET', body?: any) {
  const r = await fetch(`${MEMPALACE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw Object.assign(new Error(`MemPalace ${r.status}`), { status: r.status, body: data });
  return data;
}

router.get('/health', async (_req, res) => {
  try {
    const d = await memCall('/health');
    res.json({ ok: true, service: d });
  } catch (e: any) {
    res.status(503).json({ ok: false, error: e.message, hint: 'Container mempalace pode estar inicializando (~30s na 1ª subida).' });
  }
});

router.get('/wings', async (req: AuthRequest, res: Response) => {
  try {
    const data = await memCall('/wings');
    res.json(data);
  } catch (e: any) {
    res.status(e.status || 503).json({ error: e.message });
  }
});

router.post('/store', async (req: AuthRequest, res: Response) => {
  try {
    const { content, wing, room, drawer, tags, metadata } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'content obrigatório' });
    }
    const data = await memCall('/store', 'POST', {
      content,
      wing: wing || userWing(req),
      room: room || 'hackbot',
      drawer,
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        ...(metadata || {}),
        stored_by: req.user?.email || 'anonymous',
        stored_via: 'aisec-backend',
      },
    });
    res.json(data);
  } catch (e: any) {
    res.status(e.status || 503).json({ error: e.message });
  }
});

router.post('/recall', async (req: AuthRequest, res: Response) => {
  try {
    const { query, wing, room, top_k } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'query obrigatória' });
    }
    const data = await memCall('/recall', 'POST', {
      query,
      wing: wing === '*' ? null : (wing || userWing(req)),
      room,
      top_k: top_k || 5,
    });
    res.json(data);
  } catch (e: any) {
    res.status(e.status || 503).json({ error: e.message, hits: [], total: 0 });
  }
});

router.delete('/wing/:wing', async (req: AuthRequest, res: Response) => {
  try {
    const data = await memCall(`/wing/${encodeURIComponent(String(req.params.wing))}`, 'DELETE');
    res.json(data);
  } catch (e: any) {
    res.status(e.status || 503).json({ error: e.message });
  }
});

export default router;
