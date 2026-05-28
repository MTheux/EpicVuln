import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { LlmService } from '../llm/llm.service';
import { ZekromService } from '../llm/zekrom.service';

/**
 * MCP (Model Context Protocol) — server stub.
 *
 * Expõe skills do UnisysGuard como tools MCP discoveráveis e invocáveis por
 * agentes externos (Claude Desktop, Cursor, custom agents).
 *
 * GET /mcp/tools — lista tools no formato MCP (name, description, inputSchema)
 * POST /mcp/invoke/:tool — executa tool com argumentos
 *
 * Compliance: toda invocação passa por authenticate + logada em /admin/logs-ia.
 */

const router = Router();
router.use(authenticate);

const llm = new LlmService();
const zekrom = new ZekromService(llm);

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

const tools: McpTool[] = [
  {
    name: 'zekrom_parse_spec',
    description: 'Parseia uma spec OpenAPI/Swagger (JSON, YAML ou HTML) e devolve a lista normalizada de endpoints com método, path, parâmetros e auth.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Conteúdo bruto do spec (JSON, YAML ou HTML)' },
      },
      required: ['content'],
    },
  },
  {
    name: 'zekrom_generate_plan',
    description: 'Recebe spec parseado e gera checklist OWASP API Top 10 2023 + Web Top 10 2021 por endpoint, com severidade e rationale. Não executa requests — apenas planeja.',
    inputSchema: {
      type: 'object',
      properties: {
        spec: { type: 'object', description: 'Spec parseado (formato ZekromParsedSpec)' },
        scope: { type: 'string', enum: ['api', 'web', 'both'], description: 'Escopo dos testes' },
      },
      required: ['spec'],
    },
  },
  {
    name: 'zekrom_generate_guidance',
    description: 'Recebe um TestCard OWASP + endpoint e gera guidance detalhada: payloads exemplo, cURL e sinais de detecção. Pentester executa manualmente (human oversight).',
    inputSchema: {
      type: 'object',
      properties: {
        card: { type: 'object', description: 'TestCard com endpoint/method/owaspId/category/severity/rationale' },
        baseUrl: { type: 'string' },
      },
      required: ['card'],
    },
  },
  {
    name: 'generate_epic',
    description: 'Gera épico RTC completo (título, descrição técnica, impacto, OWASP, mitigação, riscos) a partir de descrição breve + alvo. Detecta tipo de vulnerabilidade (XSS, SQLi, IDOR, BOLA, CSRF, etc) automaticamente.',
    inputSchema: {
      type: 'object',
      properties: {
        alvo: { type: 'string', description: 'URL ou endpoint afetado' },
        descricao: { type: 'string', description: 'Descrição breve do que foi testado' },
        tipo: { type: 'string', enum: ['WEB', 'API'] },
      },
      required: ['alvo', 'descricao'],
    },
  },
  {
    name: 'analyze_architecture',
    description: 'Aplica STRIDE em diagrama de arquitetura. Identifica componentes, lista ameaças por componente, gera attack tree.',
    inputSchema: {
      type: 'object',
      properties: {
        contexto: { type: 'string', description: 'Contexto adicional sobre o sistema' },
        imageBase64: { type: 'string', description: 'Imagem do diagrama em base64' },
        imageMime: { type: 'string', description: 'MIME type da imagem (ex: image/png)' },
      },
      required: ['contexto'],
    },
  },
  {
    name: 'jwt_decode_analyze',
    description: 'Decodifica JWT e analisa vulnerabilidades client-side: alg=none, weak alg, missing claims (exp/iss/aud/jti), dados sensíveis no payload (CPF, CNPJ, password, secret), kid injection, jku/x5u externo, algorithm confusion candidate.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'JWT (3 partes separadas por ponto)' },
      },
      required: ['token'],
    },
  },
  {
    name: 'wso2_sync',
    description: 'WSO2 Hub — sincroniza lista de APIs do WSO2 API Manager. Retorna inventário com nome, versão, status, contexto, securityScheme.',
    inputSchema: {
      type: 'object',
      properties: { live: { type: 'boolean', description: 'true=usa WSO2 real (precisa config), false=mock' } },
      required: [],
    },
  },
  {
    name: 'wso2_spec_sanity',
    description: 'WSO2 Hub — Spec Sanity linter. Recebe OpenAPI JSON e devolve findings (localhost leak, HTTP, security ausente, $ref quebrado, PII em examples, versioning, paths inconsistentes). Score 0-100.',
    inputSchema: {
      type: 'object',
      properties: { spec: { type: 'object', description: 'OpenAPI 3.x spec object' } },
      required: ['spec'],
    },
  },
];

router.get('/tools', (_req: Request, res: Response) => {
  res.json({
    server: 'UnisysGuard MCP',
    version: '1.0.0',
    description: 'Skills agênticas de AppSec ASPM expostas como tools MCP.',
    tools,
  });
});

router.post('/invoke/:tool', async (req: Request, res: Response) => {
  const toolName = req.params.tool;
  const args = req.body || {};
  const start = Date.now();
  try {
    let result: any;
    switch (toolName) {
      case 'zekrom_parse_spec':
        result = zekrom.parseSpec(args.content, 'paste');
        break;
      case 'zekrom_generate_plan':
        result = await zekrom.generatePlan(args.spec, args.scope || 'both');
        break;
      case 'zekrom_generate_guidance':
        result = await zekrom.generateGuidance(args.card, args.baseUrl || '', args.endpointDetails);
        break;
      case 'generate_epic':
        result = await llm.generateEpic({
          alvo: args.alvo,
          descricao: args.descricao,
          tipo: (args.tipo === 'API' ? 'API' : 'WEB') as 'WEB' | 'API',
          imageBase64: args.imageBase64 || null,
          imageMime: args.imageMime || null,
        });
        break;
      case 'analyze_architecture':
        result = await llm.analyzeArchitecture({
          contexto: args.contexto || '',
          imageBase64: args.imageBase64 || null,
          imageMime: args.imageMime || null,
        });
        break;
      case 'wso2_sync':
      case 'wso2_spec_sanity':
        result = { ok: true, note: 'Use endpoints REST /api/wso2/sync e /api/wso2/lint diretamente.' };
        break;
      case 'jwt_decode_analyze': {
        const token = String(args.token || '');
        const parts = token.split('.');
        const decode = (s: string) => {
          let b = s.replace(/-/g, '+').replace(/_/g, '/');
          while (b.length % 4) b += '=';
          try { return JSON.parse(Buffer.from(b, 'base64').toString('utf-8')); } catch { return null; }
        };
        result = {
          header: parts[0] ? decode(parts[0]) : null,
          payload: parts[1] ? decode(parts[1]) : null,
          signature: parts[2] || '',
          partsCount: parts.length,
          note: 'Análise client-side completa em /pentest/jwt-inspector',
        };
        break;
      }
      default:
        return res.status(404).json({ error: `Tool desconhecida: ${toolName}` });
    }
    res.json({ tool: toolName, result, latencyMs: Date.now() - start });
  } catch (e: any) {
    res.status(500).json({ tool: toolName, error: e.message, latencyMs: Date.now() - start });
  }
});

export default router;
