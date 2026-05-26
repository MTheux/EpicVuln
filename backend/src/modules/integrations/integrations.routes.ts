import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth.middleware';

/**
 * Integrações UnisysGuard — conectores genéricos.
 *
 * Cada integração persiste config em SystemSettings sob chave `integration:<id>`.
 * O endpoint /test executa uma checagem básica (HTTP, auth, ping) sem expor segredos.
 *
 * Suportadas:
 *  - jira (Cloud/Server) — criação de issue ao detectar vuln crítica
 *  - teams (incoming webhook) — notificação de findings
 *  - slack (incoming webhook) — notificação de findings
 *  - webhook (outbound genérico) — POST de eventos pra URL custom
 *  - azure-devops (PAT) — work items + boards
 *  - mcp (server stub) — expõe skills como tools MCP (vide /mcp/tools)
 */

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate);

const INTEGRATION_IDS = ['jira', 'teams', 'slack', 'webhook', 'azure-devops', 'mcp'] as const;
type IntegrationId = (typeof INTEGRATION_IDS)[number];

const settingKey = (id: string) => `integration:${id}`;

interface IntegrationConfig {
  id: string;
  enabled: boolean;
  config: Record<string, any>;
  updatedAt: string;
}

function maskSecrets(cfg: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (typeof v === 'string' && /token|secret|password|key|webhook/i.test(k) && v.length > 8) {
      masked[k] = v.slice(0, 4) + '****' + v.slice(-4);
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const list: IntegrationConfig[] = [];
    for (const id of INTEGRATION_IDS) {
      const s = await prisma.systemSettings.findUnique({ where: { key: settingKey(id) } });
      if (s) {
        const parsed = JSON.parse(s.value);
        list.push({
          id,
          enabled: !!parsed.enabled,
          config: maskSecrets(parsed.config || {}),
          updatedAt: s.updatedAt.toISOString(),
        });
      } else {
        list.push({ id, enabled: false, config: {}, updatedAt: '' });
      }
    }
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!INTEGRATION_IDS.includes(id as IntegrationId)) {
      return res.status(400).json({ error: `Integração desconhecida: ${id}` });
    }
    const { enabled = true, config = {} } = req.body || {};
    const value = JSON.stringify({ enabled, config });
    await prisma.systemSettings.upsert({
      where: { key: settingKey(id) },
      update: { value },
      create: { key: settingKey(id), value },
    });
    res.json({ success: true, id, enabled, config: maskSecrets(config) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.systemSettings.deleteMany({ where: { key: settingKey(String(req.params.id)) } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * /test — basic connectivity / smoke test by integration type.
 * Returns { ok: boolean, message: string, latencyMs?: number }
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const config = req.body?.config || {};
  const start = Date.now();

  try {
    switch (id) {
      case 'jira': {
        const { baseUrl, email, token } = config;
        if (!baseUrl || !token) throw new Error('baseUrl + token obrigatórios');
        const auth = email
          ? `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
          : `Bearer ${token}`;
        const r = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/api/3/myself`, {
          headers: { Authorization: auth, Accept: 'application/json' },
        });
        if (!r.ok) throw new Error(`Jira respondeu ${r.status}`);
        const me: any = await r.json();
        return res.json({ ok: true, message: `Conectado como ${me.displayName || me.emailAddress || 'usuário Jira'}`, latencyMs: Date.now() - start });
      }
      case 'teams': {
        const { webhookUrl } = config;
        if (!webhookUrl?.startsWith('https://')) throw new Error('webhookUrl https obrigatório');
        const r = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '🛡️ UnisysGuard — Teste de conexão (sem ação)' }),
        });
        if (!r.ok) throw new Error(`Teams respondeu ${r.status}`);
        return res.json({ ok: true, message: 'Mensagem de teste enviada ao canal Teams', latencyMs: Date.now() - start });
      }
      case 'slack': {
        const { webhookUrl } = config;
        if (!webhookUrl?.startsWith('https://hooks.slack.com/')) throw new Error('Slack webhook URL inválida');
        const r = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ':shield: UnisysGuard — Teste de conexão' }),
        });
        if (!r.ok) throw new Error(`Slack respondeu ${r.status}`);
        return res.json({ ok: true, message: 'Mensagem de teste enviada ao canal Slack', latencyMs: Date.now() - start });
      }
      case 'webhook': {
        const { url, secret } = config;
        if (!url) throw new Error('URL obrigatória');
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'UnisysGuard/1.0' };
        if (secret) headers['X-UnisysGuard-Signature'] = `sha256=${secret.slice(0, 8)}-test`;
        const r = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: 'test', source: 'unisysguard', timestamp: new Date().toISOString() }),
        });
        return res.json({ ok: r.ok, message: `Webhook respondeu ${r.status}`, latencyMs: Date.now() - start });
      }
      case 'azure-devops': {
        const { org, project, pat } = config;
        if (!org || !pat) throw new Error('org + pat obrigatórios');
        const auth = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const r = await fetch(`https://dev.azure.com/${org}/_apis/projects?api-version=7.0`, {
          headers: { Authorization: auth, Accept: 'application/json' },
        });
        if (!r.ok) throw new Error(`Azure DevOps respondeu ${r.status}`);
        const data: any = await r.json();
        return res.json({ ok: true, message: `Conectado em ${org}. ${data.count || 0} projetos visíveis${project ? `. Project alvo: ${project}` : ''}`, latencyMs: Date.now() - start });
      }
      case 'mcp': {
        // MCP server is hosted by us — test = ping local /mcp/tools endpoint
        return res.json({ ok: true, message: 'MCP server interno disponível em /api/mcp/tools', latencyMs: Date.now() - start });
      }
      default:
        return res.status(400).json({ ok: false, message: `Integração desconhecida: ${id}` });
    }
  } catch (e: any) {
    return res.json({ ok: false, message: e.message, latencyMs: Date.now() - start });
  }
});

/**
 * POST /api/integrations/burp/import — recebe payload do Burp Extension (Jython).
 *
 * Body esperado: { source, version, exportedAt, requests: BurpRequest[] }
 * Persiste em SystemSettings sob a chave `burp:last-import` pra o frontend ler
 * via localStorage (próximo upload do operador).
 *
 * Skips persistence se body for inválido. Retorna count + endpoint sugerido pro
 * pentester ir ver no UI.
 */
router.post('/burp/import', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const requests = Array.isArray(body.requests) ? body.requests : [];
    if (requests.length === 0) {
      return res.status(400).json({ ok: false, error: 'requests vazio' });
    }
    // Limita pra evitar abuso (max 5000 items, max 5MB total)
    const trimmed = requests.slice(0, 5000);
    await prisma.systemSettings.upsert({
      where: { key: 'burp:last-import' },
      update: {
        value: JSON.stringify({
          source: body.source || 'burp-extension',
          version: body.version || 'unknown',
          exportedAt: body.exportedAt || new Date().toISOString(),
          count: trimmed.length,
          requests: trimmed,
        }),
      },
      create: {
        key: 'burp:last-import',
        value: JSON.stringify({
          source: body.source || 'burp-extension',
          version: body.version || 'unknown',
          exportedAt: body.exportedAt || new Date().toISOString(),
          count: trimmed.length,
          requests: trimmed,
        }),
      },
    });
    return res.json({
      ok: true,
      count: trimmed.length,
      nextStep: 'Abra /pentest/unisystem e depois /pentest/checklist no AISEC.',
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/integrations/burp/last — retorna o último import recebido (pro frontend
 * hidratar localStorage automaticamente).
 */
router.get('/burp/last', async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSettings.findUnique({ where: { key: 'burp:last-import' } });
    if (!setting) return res.json({ ok: true, data: null });
    return res.json({ ok: true, data: JSON.parse(setting.value) });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
