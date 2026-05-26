import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth.middleware';
import { loadLlmConfig } from '../llm/llm-config';

/**
 * Activity Graph — agrega entidades do UnisysGuard como grafo navegável.
 *
 * Nodes:
 *   - skill: Zekrom, HackBot, Forge, Mirror, Audit
 *   - motor: Provider LLM ativo (Ollama/GitHub Models/etc)
 *   - rag: Base de Conhecimento (cluster central)
 *   - doc: cada documento ingerido
 *   - vuln: cada vulnerabilidade
 *   - squad: cada squad SIACI distinta
 *   - request: mock UniSystem Burp requests
 *
 * Edges:
 *   - skill -> motor (skill chama LLM)
 *   - skill -> rag (skill consulta knowledge)
 *   - rag -> doc (BC contém docs)
 *   - vuln -> squad
 *   - HackBot -> outras skills (hub central)
 *   - skill -> activity (com timestamp pra animação live)
 *
 * Atividade recente:
 *   - últimas 50 ações com (timestamp, fromNode, toNode, action, payload preview)
 *   - frontend usa pra pulse/edge animation
 */

const prisma = new PrismaClient();
const router = Router();
router.use(authenticate);

interface GraphNode {
  id: string;
  label: string;
  group: 'skill' | 'motor' | 'rag' | 'doc' | 'vuln' | 'squad' | 'request' | 'hackbot' | 'tool';
  size: number;
  color: string;
  meta?: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  type?: 'static' | 'live';
  label?: string;
}

interface ActivityEvent {
  ts: number;
  fromId: string;
  toId: string;
  action: string;
  preview?: string;
}

const COLORS = {
  skill: '#10b981',
  hackbot: '#a855f7',
  motor: '#06b6d4',
  rag: '#f59e0b',
  doc: '#fbbf24',
  vuln: '#ef4444',
  squad: '#3b82f6',
  request: '#94a3b8',
  tool: '#8b5cf6',
};

// Mock activity ring buffer in-memory
const RECENT_ACTIVITY: ActivityEvent[] = [];
const MAX_ACTIVITY = 50;

export function recordActivity(ev: Omit<ActivityEvent, 'ts'>) {
  RECENT_ACTIVITY.unshift({ ts: Date.now(), ...ev });
  if (RECENT_ACTIVITY.length > MAX_ACTIVITY) RECENT_ACTIVITY.length = MAX_ACTIVITY;
}

// Seed some demo activity so the graph isn't dead on first load
function seedDemoActivity() {
  if (RECENT_ACTIVITY.length > 0) return;
  const now = Date.now();
  const events: Omit<ActivityEvent, 'ts'>[] = [
    { fromId: 'hackbot', toId: 'motor', action: 'chat.completion', preview: 'Como testar XSS?' },
    { fromId: 'zekrom', toId: 'motor', action: 'plan.generate', preview: 'Plano OWASP API Top 10' },
    { fromId: 'zekrom', toId: 'rag', action: 'rag.query', preview: 'política senha BACEN' },
    { fromId: 'hackbot', toId: 'zekrom', action: 'skill.invoke', preview: 'Analisar endpoint /pix' },
    { fromId: 'zekrom', toId: 'request:0', action: 'request.analyze', preview: 'GET /api/transferencias/{id}' },
    { fromId: 'rag', toId: 'doc:demo', action: 'rag.retrieve', preview: 'top-3 chunks' },
    { fromId: 'motor', toId: 'vuln:VUL-CXA-0381', action: 'vuln.enrich', preview: 'IDOR severidade CRÍTICA' },
    { fromId: 'hackbot', toId: 'jwt-inspector', action: 'tool.invoke', preview: 'Decode JWT' },
  ];
  events.forEach((e, i) => {
    RECENT_ACTIVITY.unshift({ ts: now - i * 8000, ...e });
  });
}

/**
 * GET /graph — devolve grafo completo (nodes + edges + activity recente)
 */
router.get('/graph', async (_req: Request, res: Response) => {
  try {
    seedDemoActivity();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const config = loadLlmConfig();

    // ---- Central hub: HackBot ----
    nodes.push({ id: 'hackbot', label: 'HackBot', group: 'hackbot', size: 18, color: COLORS.hackbot });

    // ---- Motor IA ativo ----
    nodes.push({
      id: 'motor',
      label: `Motor IA · ${config.provider}`,
      group: 'motor',
      size: 16,
      color: COLORS.motor,
      meta: { provider: config.provider, model: config.model },
    });

    // ---- Skills ----
    const skills = [
      { id: 'zekrom', label: 'Zekrom · DAST', status: 'shipped' },
      { id: 'jwt-inspector', label: 'JWT Inspector', status: 'shipped' },
      { id: 'epicos', label: 'Gerador Épicos', status: 'shipped' },
      { id: 'arquitetura', label: 'Arquitetura STRIDE', status: 'shipped' },
      { id: 'jshunter', label: 'JSHunter', status: 'shipped' },
      { id: 'forge', label: 'Forge', status: 'shipped' },
      { id: 'mirror', label: 'Mirror', status: 'shipped' },
      { id: 'audit', label: 'Audit', status: 'shipped' },
    ];
    skills.forEach((s) => {
      nodes.push({
        id: s.id,
        label: s.label,
        group: 'skill',
        size: s.status === 'shipped' ? 14 : s.status === 'next' ? 11 : 8,
        color: s.status === 'shipped' ? COLORS.skill : s.status === 'next' ? '#fbbf24' : '#64748b',
        meta: s,
      });
      // Skills → Motor (all skills use LLM)
      edges.push({ source: s.id, target: 'motor', weight: 1, type: 'static' });
      // HackBot → Skills (HackBot is central hub)
      edges.push({ source: 'hackbot', target: s.id, weight: 0.5, type: 'static' });
    });

    // ---- RAG cluster ----
    nodes.push({ id: 'rag', label: 'Base Conhecimento (RAG)', group: 'rag', size: 15, color: COLORS.rag });
    edges.push({ source: 'zekrom', target: 'rag', weight: 1.5, type: 'static', label: 'consulta' });
    edges.push({ source: 'mirror', target: 'rag', weight: 1.5, type: 'static', label: 'consulta' });
    edges.push({ source: 'audit', target: 'rag', weight: 1.5, type: 'static', label: 'consulta' });
    edges.push({ source: 'hackbot', target: 'rag', weight: 1, type: 'static' });

    // ---- Docs RAG (real from DB) ----
    try {
      const docs: any[] = await prisma.$queryRawUnsafe(
        `SELECT doc_id, doc_name FROM knowledge_chunks GROUP BY doc_id, doc_name LIMIT 20`,
      );
      docs.forEach((d) => {
        const nid = `doc:${d.doc_id}`;
        nodes.push({
          id: nid,
          label: d.doc_name.slice(0, 30),
          group: 'doc',
          size: 6,
          color: COLORS.doc,
          meta: { docId: d.doc_id, fullName: d.doc_name },
        });
        edges.push({ source: 'rag', target: nid, weight: 0.4, type: 'static' });
      });
    } catch {}

    // ---- Squads SIACI (from distinct vuln squads) ----
    try {
      const squads: any[] = await prisma.$queryRawUnsafe(
        `SELECT DISTINCT squad FROM vulnerabilities WHERE squad IS NOT NULL LIMIT 10`,
      );
      squads.forEach((s) => {
        const nid = `squad:${s.squad}`;
        const label = s.squad.split(' - ')[0]; // NM182
        nodes.push({
          id: nid,
          label,
          group: 'squad',
          size: 10,
          color: COLORS.squad,
          meta: { squad: s.squad },
        });
      });
    } catch {}

    // ---- Vulns (latest 15) ----
    try {
      const vulns = await prisma.vulnerability.findMany({
        take: 15,
        orderBy: { dataCriacao: 'desc' },
        select: { codigoInterno: true, titulo: true, criticidade: true, squad: true },
      });
      vulns.forEach((v) => {
        const nid = `vuln:${v.codigoInterno}`;
        const size = v.criticidade === 'CRITICA' ? 9 : v.criticidade === 'ALTA' ? 7 : 5;
        nodes.push({
          id: nid,
          label: v.codigoInterno,
          group: 'vuln',
          size,
          color: v.criticidade === 'CRITICA' ? '#dc2626' : v.criticidade === 'ALTA' ? '#f59e0b' : '#94a3b8',
          meta: { codigo: v.codigoInterno, titulo: v.titulo, crit: v.criticidade, squad: v.squad },
        });
        if (v.squad) edges.push({ source: nid, target: `squad:${v.squad}`, weight: 0.6, type: 'static' });
      });
    } catch {}

    // ---- Mock UniSystem Burp requests (5 demo) ----
    const burpReqs = [
      { id: 'request:0', label: 'GET /pix/qrcode', method: 'GET' },
      { id: 'request:1', label: 'GET /users/{id}/balance', method: 'GET' },
      { id: 'request:2', label: 'PUT /transfer/cancel', method: 'PUT' },
      { id: 'request:3', label: 'POST /auth/login', method: 'POST' },
      { id: 'request:4', label: 'GET /admin/users', method: 'GET' },
    ];
    burpReqs.forEach((r) => {
      nodes.push({ id: r.id, label: r.label, group: 'request', size: 6, color: COLORS.request, meta: r });
      edges.push({ source: 'zekrom', target: r.id, weight: 0.4, type: 'static' });
    });

    // ---- Live edges from recent activity (last 10) ----
    RECENT_ACTIVITY.slice(0, 10).forEach((ev, i) => {
      edges.push({
        source: ev.fromId,
        target: ev.toId,
        weight: 2 - i * 0.15,
        type: 'live',
        label: ev.action,
      });
    });

    res.json({
      nodes,
      edges,
      activity: RECENT_ACTIVITY.slice(0, 30),
      stats: {
        nodes: nodes.length,
        edges: edges.length,
        skills: skills.length,
        docs: nodes.filter((n) => n.group === 'doc').length,
        vulns: nodes.filter((n) => n.group === 'vuln').length,
        squads: nodes.filter((n) => n.group === 'squad').length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /node/:id/logs — devolve atividade específica de um node
 */
router.get('/node/:id/logs', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const logs = RECENT_ACTIVITY.filter((ev) => ev.fromId === id || ev.toId === id).slice(0, 30);
    res.json({ nodeId: id, logs, count: logs.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /event — registra evento de atividade (chamado pelas skills)
 */
router.post('/event', (req: Request, res: Response) => {
  try {
    const { fromId, toId, action, preview } = req.body || {};
    if (!fromId || !toId || !action) {
      return res.status(400).json({ error: 'fromId, toId, action obrigatórios' });
    }
    recordActivity({ fromId, toId, action, preview });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
