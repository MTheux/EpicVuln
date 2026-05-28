/**
 * WSO2 Hub — integração com WSO2 API Manager.
 *
 * Endpoints:
 *  GET  /api/wso2/sync        — lista APIs (mock por enquanto + estrutura
 *                                 pronta pra consumir WSO2 Publisher REST API real)
 *  GET  /api/wso2/apis/:id/swagger — retorna o OpenAPI JSON da API
 *  POST /api/wso2/lint        — recebe um OpenAPI JSON e devolve findings
 *                                 de "Spec Sanity" (linter 100% client-driven
 *                                 — pra demo já incluímos backend version também)
 *
 * Integração real WSO2:
 *  - Endpoint Publisher: GET {gateway}/api/am/publisher/v4/apis
 *  - Auth: OAuth2 Bearer (scope apim:api_view)
 *  - Token URL: {gateway}/oauth2/token
 *  - Pra produção, configurar credenciais em SystemSettings (chave 'wso2:config')
 *    e ativar `live: true` no body do /sync.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();
router.use(authenticate);

interface Wso2Config {
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
}

async function loadWso2Config(): Promise<Wso2Config | null> {
  try {
    const setting = await prisma.systemSettings.findUnique({ where: { key: 'wso2:config' } });
    if (!setting) return null;
    return JSON.parse(setting.value);
  } catch { return null; }
}

// ============== Mock data (5 APIs típicas SIACI) ==============
const MOCK_APIS = [
  {
    id: 'siaci-transferencias-v2',
    name: 'SIACI Transferências',
    version: 'v2',
    context: '/api/v2/transferencias',
    status: 'PUBLISHED',
    provider: 'NM182',
    description: 'Endpoint de transferências entre contas + PIX.',
    endpointCount: 7,
    updatedAt: '2026-05-21T14:33:00Z',
    securityScheme: 'oauth2',
    visibility: 'private',
  },
  {
    id: 'siaci-pix-v3',
    name: 'SIACI PIX',
    version: 'v3',
    context: '/api/v3/pix',
    status: 'PUBLISHED',
    provider: 'NM177',
    description: 'Chaves PIX, QRCode, cancelamento, busca.',
    endpointCount: 12,
    updatedAt: '2026-05-25T09:11:00Z',
    securityScheme: 'oauth2',
    visibility: 'private',
  },
  {
    id: 'siaci-usuarios-v1',
    name: 'SIACI Usuários',
    version: 'v1',
    context: '/api/v1/usuarios',
    status: 'PUBLISHED',
    provider: 'NM180',
    description: 'Cadastro, perfil, autenticação.',
    endpointCount: 9,
    updatedAt: '2026-05-19T16:20:00Z',
    securityScheme: 'oauth2',
    visibility: 'public',
  },
  {
    id: 'siaci-debug-v1',
    name: 'SIACI Debug (não usar em prod)',
    version: 'v1',
    context: '/api/v1/debug',
    status: 'PROTOTYPED',
    provider: 'NM181',
    description: 'Endpoints internos pra troubleshooting.',
    endpointCount: 4,
    updatedAt: '2026-04-02T11:00:00Z',
    securityScheme: 'none',
    visibility: 'public',
  },
  {
    id: 'siaci-proxy-v1',
    name: 'SIACI Proxy Externo',
    version: 'v1',
    context: '/api/v1/proxy',
    status: 'CREATED',
    provider: 'NM181',
    description: 'Proxy reverso pra serviços externos (lab).',
    endpointCount: 3,
    updatedAt: '2026-05-15T08:45:00Z',
    securityScheme: 'basic',
    visibility: 'public',
  },
];

// Mock swagger for ID siaci-pix-v3 (the most illustrative — with intentional issues for linter to find)
const MOCK_SWAGGERS: Record<string, any> = {
  'siaci-pix-v3': {
    openapi: '3.0.1',
    info: {
      title: 'SIACI PIX',
      version: 'v3',
      description: '',
    },
    servers: [
      { url: 'http://localhost:8080/api/v3/pix' },
      { url: 'https://hml-api.caixa.gov.br/api/v3/pix' },
    ],
    paths: {
      '/transferencia': {
        post: {
          summary: 'Cria transferência PIX',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Transferencia' } } } },
          responses: { '200': { description: 'OK' } },
        },
      },
      '/cancelar/{id}': {
        get: {
          summary: 'Cancela PIX',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'cancelado' } },
        },
      },
      '/buscar': {
        get: {
          parameters: [{ name: 'filtro', in: 'query', schema: { type: 'string' } }],
          responses: { '200': { description: 'OK', content: { 'application/json': { example: { cpf: '111.111.111-11', conta: '1234-5' } } } } },
        },
      },
    },
    components: {
      schemas: {
        Transferencia: {
          type: 'object',
          properties: {
            contaOrigem: { type: 'string' },
            contaDestino: { type: 'string' },
            valor: { type: 'number' },
          },
        },
        // NOTE: $ref UsuarioDetail aponta pra schema inexistente — linter pega
      },
    },
  },
};

// ============== Endpoints ==============

router.get('/sync', async (req: Request, res: Response) => {
  const live = String(req.query.live || '') === 'true';
  if (live) {
    const cfg = await loadWso2Config();
    if (!cfg?.gatewayUrl || !cfg?.clientId) {
      return res.status(412).json({ error: 'WSO2 não configurado. Vá em Configurações → Integrações.' });
    }
    // TODO: produção — autenticar OAuth2 + GET /api/am/publisher/v4/apis
    return res.status(501).json({ error: 'Integração live com WSO2 em roadmap. Use ?live=false (mock).' });
  }
  return res.json({
    source: 'mock',
    syncedAt: new Date().toISOString(),
    totalApis: MOCK_APIS.length,
    apis: MOCK_APIS,
  });
});

router.get('/apis/:id/swagger', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const swagger = MOCK_SWAGGERS[id];
  if (!swagger) {
    return res.status(404).json({ error: `Swagger mock não disponível pra ${id}. Disponível: ${Object.keys(MOCK_SWAGGERS).join(', ')}` });
  }
  res.json(swagger);
});

/**
 * Spec Sanity — analisa um OpenAPI JSON e devolve findings.
 * 100% determinístico (sem LLM). Roda 12 regras.
 */
router.post('/lint', (req: Request, res: Response) => {
  const spec = req.body || {};
  const findings: Array<{ rule: string; severity: string; message: string; path?: string; pointer?: string }> = [];

  // R1 — servers com localhost/private IP
  const servers = spec.servers || [];
  for (let i = 0; i < servers.length; i++) {
    const url = servers[i]?.url || '';
    if (/localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.|169\.254\./.test(url)) {
      findings.push({ rule: 'localhost-in-servers', severity: 'CRITICA', message: `Server #${i + 1} expõe host interno: ${url}`, pointer: `/servers/${i}/url` });
    }
    if (url.startsWith('http://')) {
      findings.push({ rule: 'http-not-https', severity: 'ALTA', message: `Server #${i + 1} usa HTTP sem TLS: ${url}`, pointer: `/servers/${i}/url` });
    }
  }

  // R2 — info.description vazio
  if (!spec.info?.description?.trim()) {
    findings.push({ rule: 'missing-description', severity: 'MEDIA', message: 'info.description está vazio', pointer: '/info/description' });
  }
  // R3 — info.version padrão
  if (!spec.info?.version) {
    findings.push({ rule: 'missing-version', severity: 'BAIXA', message: 'info.version ausente', pointer: '/info/version' });
  }

  // R4 — security global ou por endpoint
  const paths = spec.paths || {};
  let hasGlobalSecurity = Array.isArray(spec.security) && spec.security.length > 0;
  for (const [pathStr, ops] of Object.entries(paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    for (const m of methods) {
      const op: any = (ops as any)[m];
      if (!op) continue;
      const opSec = Array.isArray(op.security) ? op.security : null;
      const isStateChanging = ['post', 'put', 'patch', 'delete'].includes(m);
      if (isStateChanging && !hasGlobalSecurity && !(opSec && opSec.length)) {
        findings.push({ rule: 'no-security-state-changing', severity: 'CRITICA', message: `${m.toUpperCase()} ${pathStr} state-changing sem security definido`, path: pathStr });
      }
      if (!op.responses || Object.keys(op.responses).length === 0) {
        findings.push({ rule: 'no-responses', severity: 'MEDIA', message: `${m.toUpperCase()} ${pathStr} sem responses definidas`, path: pathStr });
      } else {
        const codes = Object.keys(op.responses);
        if (!codes.some((c) => c.startsWith('4'))) {
          findings.push({ rule: 'missing-4xx-response', severity: 'BAIXA', message: `${m.toUpperCase()} ${pathStr} não define resposta 4xx`, path: pathStr });
        }
      }

      // R5 — example com possível PII
      try {
        const exJson = JSON.stringify(op.responses || {});
        if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(exJson)) {
          findings.push({ rule: 'pii-in-example-cpf', severity: 'ALTA', message: `${m.toUpperCase()} ${pathStr} expõe CPF em example response`, path: pathStr });
        }
        if (/password|senha|secret/i.test(exJson) && /:\s*"[^"]+"/.test(exJson)) {
          findings.push({ rule: 'pii-in-example-secret', severity: 'ALTA', message: `${m.toUpperCase()} ${pathStr} contém password/secret em example`, path: pathStr });
        }
      } catch {}
    }
  }

  // R6 — $ref quebrado
  const refs: string[] = [];
  const findRefs = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.$ref === 'string') refs.push(obj.$ref);
    for (const k of Object.keys(obj)) findRefs(obj[k]);
  };
  findRefs(spec);
  const declaredSchemas = Object.keys(spec.components?.schemas || {});
  for (const ref of refs) {
    const m = ref.match(/^#\/components\/schemas\/(.+)$/);
    if (m && !declaredSchemas.includes(m[1])) {
      findings.push({ rule: 'broken-ref', severity: 'ALTA', message: `$ref aponta pra schema inexistente: ${ref}`, pointer: ref });
    }
  }

  // R7 — versioning na URL
  const hasVersionedPath = Object.keys(paths).some((p) => /\/v\d+\//.test(p));
  const hasVersionedServer = servers.some((s: any) => /\/v\d+/.test(s?.url || ''));
  if (!hasVersionedPath && !hasVersionedServer) {
    findings.push({ rule: 'missing-versioning', severity: 'BAIXA', message: 'API sem versionamento explícito (/v1/, /v2/)' });
  }

  // R8 — tags ausentes
  if (!spec.tags || !Array.isArray(spec.tags) || spec.tags.length === 0) {
    findings.push({ rule: 'missing-tags', severity: 'BAIXA', message: 'Nenhuma tag definida no nível raiz' });
  }

  // R9 — paths consistency (kebab vs camel)
  const pathSegs = Object.keys(paths).flatMap((p) => p.split('/').filter(Boolean));
  const hasCamel = pathSegs.some((s) => /[a-z][A-Z]/.test(s));
  const hasKebab = pathSegs.some((s) => /-/.test(s));
  if (hasCamel && hasKebab) {
    findings.push({ rule: 'inconsistent-path-style', severity: 'BAIXA', message: 'Paths misturam camelCase e kebab-case' });
  }

  // Score
  const weights: Record<string, number> = { CRITICA: 25, ALTA: 12, MEDIA: 5, BAIXA: 2 };
  const totalDeduction = findings.reduce((sum, f) => sum + (weights[f.severity] || 0), 0);
  const score = Math.max(0, 100 - totalDeduction);

  res.json({
    score,
    totalFindings: findings.length,
    bySeverity: {
      CRITICA: findings.filter((f) => f.severity === 'CRITICA').length,
      ALTA: findings.filter((f) => f.severity === 'ALTA').length,
      MEDIA: findings.filter((f) => f.severity === 'MEDIA').length,
      BAIXA: findings.filter((f) => f.severity === 'BAIXA').length,
    },
    findings,
    lintedAt: new Date().toISOString(),
  });
});

router.post('/config', async (req: Request, res: Response) => {
  try {
    const { gatewayUrl, clientId, clientSecret } = req.body || {};
    if (!gatewayUrl) return res.status(400).json({ error: 'gatewayUrl obrigatório' });
    await prisma.systemSettings.upsert({
      where: { key: 'wso2:config' },
      update: { value: JSON.stringify({ gatewayUrl, clientId, clientSecret }) },
      create: { key: 'wso2:config', value: JSON.stringify({ gatewayUrl, clientId, clientSecret }) },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
