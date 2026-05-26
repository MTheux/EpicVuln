import { LlmService } from './llm.service';
import { loadLlmConfig } from './llm-config';
import * as yaml from 'js-yaml';
import { getRelevantPortfolio, PortfolioMatch } from './portfolio-context.service';

/**
 * Zekrom — DAST Copilot Orchestrator
 *
 * Skill agêntica do UnisysGuard especializada em validar mudanças DAST:
 * 1. Ingere OpenAPI/Swagger (URL, WSO2, paste, upload)
 * 2. Normaliza endpoints
 * 3. Gera checklist OWASP API/Web Top 10 por endpoint
 * 4. Emite "tip cards" de exploração (sem executar — human-in-loop por Unisys AI P1.0)
 * 5. Exporta prompt pack para o pentester colar no GitHub Copilot Chat
 *
 * Compliance: nada é executado pelo agente. Toda ação cabe ao pentester.
 * Logs vão para /admin/logs-ia.
 */

export interface ZekromEndpoint {
  method: string;
  path: string;
  summary?: string;
  operationId?: string;
  parameters: Array<{ name: string; in: string; type?: string; required?: boolean; description?: string }>;
  requestBody?: { contentType?: string; schema?: any; required?: boolean };
  responses: string[];
  security: string[];
  tags: string[];
}

export interface ZekromParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  source: 'url' | 'wso2' | 'paste' | 'upload';
  endpoints: ZekromEndpoint[];
  securitySchemes: Record<string, any>;
  parseWarnings: string[];
}

export interface ZekromTestCard {
  endpoint: string;
  method: string;
  owaspId: string;        // ex: "API1:2023" / "A01:2021"
  category: string;       // ex: "BOLA", "Broken Access Control"
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  rationale: string;      // por que esse teste cabe nesse endpoint
  reincidencia?: {        // populado pelo Live Portfolio Context
    codigoInterno: string;
    titulo: string;
    status: string;
    score: number;
  };
}

export interface ZekromGuidance {
  card: ZekromTestCard;
  hypothesis: string;
  payloadExamples: Array<{ description: string; curl: string; expectedSignal: string }>;
  detection: string;
  mitigation: string;
  aiDisclosure: string;   // texto Unisys-policy compliant
}

export class ZekromService {
  constructor(private readonly llm: LlmService) {}

  /**
   * Parse OpenAPI/Swagger from raw content (JSON or YAML).
   * For WSO2 ingestion, fetch the swagger from the publisher API in callers.
   */
  parseSpec(rawContent: string, source: ZekromParsedSpec['source'] = 'paste'): ZekromParsedSpec {
    const warnings: string[] = [];
    let doc: any;
    const trimmed = rawContent.trim();

    // If content is HTTP request raw (starts with VERB / HTTP/...)
    if (/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+\S+\s+HTTP\/\d/i.test(trimmed)) {
      return this.parseRawHttpRequest(trimmed, source);
    }

    // If content is HAR (HTTP Archive JSON)
    if (trimmed.startsWith('{') && /"log"\s*:\s*\{/.test(trimmed) && /"entries"/.test(trimmed)) {
      return this.parseHarFile(trimmed, source);
    }

    // If content is HTML, parse as Web target (extract forms, links, params)
    if (/^<!DOCTYPE|^<html|<head|<body/i.test(trimmed.slice(0, 500))) {
      return this.parseHtmlAsWebTarget(trimmed, source);
    }

    try {
      doc = trimmed.startsWith('{') ? JSON.parse(trimmed) : yaml.load(trimmed);
    } catch (e: any) {
      throw new Error(`Conteúdo inválido. Aceita: (a) JSON OpenAPI começando com { "openapi": ... }, (b) YAML OpenAPI começando com openapi: 3.0.0, (c) HTML de página web. Erro: ${e.message}`);
    }

    if (!doc || typeof doc !== 'object') {
      throw new Error('Conteúdo vazio ou em formato inválido.');
    }

    const isV3 = !!doc.openapi;
    const isV2 = !!doc.swagger;
    if (!isV3 && !isV2) {
      if (!doc.paths && !doc.info) {
        throw new Error('Conteúdo não parece OpenAPI/Swagger nem HTML. Spec válido deve ter "openapi"/"swagger" + "info" + "paths".');
      }
      warnings.push('Spec sem campo openapi/swagger explícito — assumindo OpenAPI 3.x.');
    }

    const title = doc.info?.title || 'Sem título';
    const version = doc.info?.version || '—';
    let baseUrl = '';
    if (isV3 && Array.isArray(doc.servers) && doc.servers.length > 0) {
      baseUrl = doc.servers[0].url || '';
    } else if (isV2) {
      const scheme = (doc.schemes?.[0]) || 'https';
      baseUrl = `${scheme}://${doc.host || ''}${doc.basePath || ''}`;
    }

    const securitySchemes = isV3
      ? (doc.components?.securitySchemes || {})
      : (doc.securityDefinitions || {});

    const endpoints: ZekromEndpoint[] = [];
    const paths = doc.paths || {};

    for (const [path, pathItem] of Object.entries<any>(paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;
      const pathParameters: any[] = pathItem.parameters || [];

      for (const method of ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']) {
        const op = pathItem[method];
        if (!op) continue;

        const params = [
          ...pathParameters,
          ...(op.parameters || []),
        ].map((p: any) => ({
          name: p.name,
          in: p.in,
          type: p.schema?.type || p.type,
          required: !!p.required,
          description: p.description,
        }));

        let requestBody: ZekromEndpoint['requestBody'];
        if (isV3 && op.requestBody) {
          const content = op.requestBody.content || {};
          const ct = Object.keys(content)[0];
          requestBody = {
            contentType: ct,
            schema: ct ? content[ct]?.schema : undefined,
            required: !!op.requestBody.required,
          };
        } else if (isV2) {
          const bodyParam = (op.parameters || []).find((p: any) => p.in === 'body');
          if (bodyParam) {
            requestBody = {
              contentType: op.consumes?.[0] || 'application/json',
              schema: bodyParam.schema,
              required: !!bodyParam.required,
            };
          }
        }

        const responses = Object.keys(op.responses || {});
        const security = (op.security || doc.security || [])
          .flatMap((s: any) => Object.keys(s || {}));

        endpoints.push({
          method: method.toUpperCase(),
          path,
          summary: op.summary || op.description,
          operationId: op.operationId,
          parameters: params,
          requestBody,
          responses,
          security: [...new Set(security)] as string[],
          tags: op.tags || [],
        });
      }
    }

    if (endpoints.length === 0) {
      warnings.push('Nenhum endpoint encontrado no spec.');
    }

    return {
      title,
      version,
      baseUrl,
      source,
      endpoints,
      securitySchemes,
      parseWarnings: warnings,
    };
  }

  /**
   * Fetch OpenAPI spec OR website HTML from arbitrary URL.
   * If response is HTML, returns it as a "web target" parsed differently.
   */
  async fetchSpec(url: string, headers: Record<string, string> = {}): Promise<string> {
    const r = await fetch(url, { headers });
    if (!r.ok) {
      throw new Error(`Falha ao buscar em ${url}: HTTP ${r.status}`);
    }
    return await r.text();
  }

  /**
   * Parses raw HTTP request (as captured by Burp/curl/etc).
   * Example:
   *   POST /api/users/123 HTTP/1.1
   *   Host: api.caixa.gov.br
   *   Authorization: Bearer xyz
   *   Content-Type: application/json
   *
   *   {"name":"x"}
   */
  private parseRawHttpRequest(raw: string, source: ZekromParsedSpec['source']): ZekromParsedSpec {
    const warnings: string[] = ['Conteúdo identificado como request HTTP raw — Zekrom extraiu método, path, headers, body, params.'];
    const lines = raw.split(/\r?\n/);
    const firstLine = lines[0] || '';
    const match = firstLine.match(/^(\w+)\s+(\S+)\s+HTTP\/[\d.]+/);
    if (!match) {
      throw new Error('Request HTTP inválido. Formato esperado: VERBO /path HTTP/1.1');
    }
    const method = match[1].toUpperCase();
    const fullPath = match[2];

    // headers
    const headers: Record<string, string> = {};
    let bodyStart = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '') { bodyStart = i + 1; break; }
      const colon = lines[i].indexOf(':');
      if (colon > 0) {
        const key = lines[i].slice(0, colon).trim();
        const value = lines[i].slice(colon + 1).trim();
        headers[key.toLowerCase()] = value;
      }
    }
    const body = bodyStart > 0 ? lines.slice(bodyStart).join('\n').trim() : '';

    // baseUrl from Host header
    const host = headers['host'] || '';
    const scheme = headers['origin']?.startsWith('http://') ? 'http' : 'https';
    const baseUrl = host ? `${scheme}://${host}` : '';

    // params from query string
    const [path, queryString] = fullPath.split('?');
    const params: any[] = [];
    if (queryString) {
      const qs = new URLSearchParams(queryString);
      qs.forEach((value, name) => {
        params.push({ name, in: 'query', type: 'string', required: false, description: `query (sample: ${value.slice(0, 30)})` });
      });
    }

    // body params (if JSON)
    let requestBody: ZekromEndpoint['requestBody'];
    if (body) {
      const ct = headers['content-type'] || 'application/json';
      requestBody = { contentType: ct, required: true };
      if (ct.includes('json') && body.startsWith('{')) {
        try {
          const json = JSON.parse(body);
          Object.keys(json).forEach((k) => {
            params.push({ name: k, in: 'body', type: typeof json[k], required: false, description: `body field (sample: ${JSON.stringify(json[k]).slice(0, 40)})` });
          });
        } catch {}
      } else if (ct.includes('form-urlencoded')) {
        const f = new URLSearchParams(body);
        f.forEach((v, n) => params.push({ name: n, in: 'body', type: 'string', required: false, description: `form field` }));
      }
    }

    // security
    const security: string[] = [];
    if (headers['authorization']?.toLowerCase().startsWith('bearer')) security.push('bearerAuth');
    if (headers['cookie']?.includes('=')) security.push('cookie');
    if (headers['x-api-key']) security.push('apiKey');

    // warnings — signal sensitive headers
    if (headers['authorization']) warnings.push('Header Authorization presente — não compartilhar real token; teste replay, JWT analysis, alg swap.');
    if (/csrf|xsrf/i.test(Object.keys(headers).join(','))) warnings.push('Token CSRF/XSRF detectado nos headers — testar bypass.');
    if (path.includes('{') || /\/\d+/.test(path)) warnings.push('Path contém ID — candidato natural a IDOR/BOLA.');

    const endpoint: ZekromEndpoint = {
      method,
      path,
      summary: `${method} ${path} — capturado do Burp/cURL`,
      parameters: params,
      requestBody,
      responses: ['200'],
      security,
      tags: ['captured'],
    };

    return {
      title: `[Request] ${method} ${path.split('?')[0]}`,
      version: 'raw-http',
      baseUrl,
      source,
      endpoints: [endpoint],
      securitySchemes: security.length > 0 ? Object.fromEntries(security.map((s) => [s, { type: 'http' }])) : {},
      parseWarnings: warnings,
    };
  }

  /**
   * Parse HAR (HTTP Archive) file — array of requests.
   * Convert each entry to a ZekromEndpoint.
   */
  private parseHarFile(raw: string, source: ZekromParsedSpec['source']): ZekromParsedSpec {
    const warnings: string[] = ['HAR file detectado — Zekrom extraiu requests do log.'];
    let har: any;
    try { har = JSON.parse(raw); } catch (e: any) { throw new Error(`HAR inválido: ${e.message}`); }
    const entries = har.log?.entries || [];
    if (entries.length === 0) {
      throw new Error('HAR não contém entries.');
    }

    const endpoints: ZekromEndpoint[] = [];
    const seen = new Set<string>();
    let baseUrl = '';

    for (const entry of entries.slice(0, 100)) {
      const req = entry.request;
      if (!req) continue;
      try {
        const u = new URL(req.url);
        if (!baseUrl) baseUrl = u.origin;
        const key = `${req.method}:${u.pathname}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const params: any[] = [];
        u.searchParams.forEach((v, n) => {
          params.push({ name: n, in: 'query', type: 'string', required: false, description: `query (sample: ${v.slice(0, 30)})` });
        });
        (req.headers || []).forEach((h: any) => {
          if (/^(authorization|x-api-key|x-csrf|cookie)/i.test(h.name)) {
            params.push({ name: h.name, in: 'header', type: 'string', required: false, description: 'header sensível' });
          }
        });

        let requestBody: ZekromEndpoint['requestBody'];
        if (req.postData?.text) {
          requestBody = { contentType: req.postData.mimeType || 'application/json', required: true };
        }

        endpoints.push({
          method: req.method.toUpperCase(),
          path: u.pathname,
          summary: `${req.method} ${u.pathname} (HAR entry)`,
          parameters: params,
          requestBody,
          responses: [String(entry.response?.status || 200)],
          security: (req.headers || []).some((h: any) => /^authorization/i.test(h.name)) ? ['bearerAuth'] : [],
          tags: ['har'],
        });
      } catch {}
    }

    return {
      title: `[HAR] ${har.log?.creator?.name || 'browser'} · ${endpoints.length} requests únicos`,
      version: 'har',
      baseUrl,
      source,
      endpoints,
      securitySchemes: {},
      parseWarnings: warnings,
    };
  }

  /**
   * Parses an HTML page as a "Web target" — extracts forms, links, headers as pseudo-endpoints.
   * Allows Zekrom to plan Web Top 10 tests for plain websites without OpenAPI.
   */
  private parseHtmlAsWebTarget(html: string, source: ZekromParsedSpec['source']): ZekromParsedSpec {
    const warnings: string[] = ['Conteúdo identificado como HTML — Zekrom processou como Web target (forms + links + params extraídos).'];
    const endpoints: ZekromEndpoint[] = [];

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || 'Web Target').trim().slice(0, 120);

    // Extract base URL from <base href> or first absolute link
    const baseMatch = html.match(/<base[^>]+href=["']([^"']+)["']/i);
    let baseUrl = baseMatch?.[1] || '';
    if (!baseUrl) {
      const firstLink = html.match(/https?:\/\/[^"'\s<>]+/);
      if (firstLink) {
        try { baseUrl = new URL(firstLink[0]).origin; } catch {}
      }
    }

    // Extract forms
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let m: RegExpExecArray | null;
    while ((m = formRegex.exec(html)) !== null) {
      const attrs = m[1];
      const body = m[2];
      const actionMatch = attrs.match(/action=["']([^"']*)["']/i);
      const methodMatch = attrs.match(/method=["']([^"']*)["']/i);
      const action = actionMatch?.[1] || '/';
      const method = (methodMatch?.[1] || 'GET').toUpperCase();
      const params: ZekromEndpoint['parameters'] = [];
      const inputRegex = /<(?:input|textarea|select)\b([^>]*)>/gi;
      let im: RegExpExecArray | null;
      while ((im = inputRegex.exec(body)) !== null) {
        const a = im[1];
        const nameMatch = a.match(/name=["']([^"']+)["']/i);
        const typeMatch = a.match(/type=["']([^"']+)["']/i);
        const requiredMatch = /\brequired\b/i.test(a);
        if (nameMatch) {
          params.push({
            name: nameMatch[1],
            in: 'formData',
            type: typeMatch?.[1] || 'string',
            required: requiredMatch,
            description: 'form field',
          });
        }
      }
      endpoints.push({
        method,
        path: action,
        summary: `Form ${method} ${action} (${params.length} fields)`,
        parameters: params,
        requestBody: method === 'POST' || method === 'PUT' ? { contentType: 'application/x-www-form-urlencoded', required: true } : undefined,
        responses: ['200'],
        security: [],
        tags: ['form'],
      });
    }

    // Extract links with query strings (potential GET endpoints with params)
    const linkRegex = /<a[^>]+href=["']([^"']+\?[^"']+)["']/gi;
    const seenLinks = new Set<string>();
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1];
      if (seenLinks.has(href)) continue;
      seenLinks.add(href);
      try {
        const u = new URL(href, baseUrl || 'http://placeholder.local');
        const params = [...u.searchParams.entries()].map(([name, value]) => ({
          name,
          in: 'query',
          type: 'string',
          required: false,
          description: `query param (sample value: ${value.slice(0, 30)})`,
        }));
        if (params.length > 0) {
          endpoints.push({
            method: 'GET',
            path: u.pathname,
            summary: `Link com ${params.length} query params`,
            parameters: params,
            responses: ['200'],
            security: [],
            tags: ['link'],
          });
        }
      } catch {}
    }

    // Detect common signals in the HTML
    const securitySchemes: Record<string, any> = {};
    if (/<input[^>]+type=["']password["']/i.test(html)) {
      securitySchemes.formPassword = { type: 'http', scheme: 'form-password' };
      warnings.push('Detectado campo de senha — incluir Broken Authentication nos testes.');
    }
    if (/csrf|_token|authenticity_token/i.test(html)) {
      securitySchemes.csrfToken = { type: 'apiKey', in: 'cookie/form', name: 'csrf-token' };
    }
    if (/document\.cookie/i.test(html)) {
      warnings.push('JS acessando document.cookie — risco se cookie sem HttpOnly.');
    }
    if (/eval\s*\(|innerHTML\s*=/.test(html)) {
      warnings.push('Padrões sink XSS detectados no JS (eval / innerHTML).');
    }

    if (endpoints.length === 0) {
      // Fall back to a single generic endpoint for the page itself
      endpoints.push({
        method: 'GET',
        path: '/',
        summary: 'Página HTML sem forms ou links com query string',
        parameters: [],
        responses: ['200'],
        security: [],
        tags: ['html'],
      });
      warnings.push('Nenhum form ou link com query detectado. Testes Web ainda aplicáveis a headers/cookies/CSP.');
    }

    return {
      title: `[Web] ${title}`,
      version: 'html',
      baseUrl,
      source,
      endpoints,
      securitySchemes,
      parseWarnings: warnings,
    };
  }

  /**
   * Generate OWASP Top 10 test plan matched to endpoints.
   * Returns one or more ZekromTestCards per endpoint.
   */
  async generatePlan(spec: ZekromParsedSpec, scope: 'api' | 'web' | 'both' = 'api'): Promise<ZekromTestCard[]> {
    const config = loadLlmConfig();
    if (!config.apiKey && config.provider !== 'ollama') {
      throw new Error('IA não configurada. Configure provider em Configurações → Integrações.');
    }

    // Trim to first 25 endpoints to keep prompt sane
    const sample = spec.endpoints.slice(0, 25).map((e) => ({
      method: e.method,
      path: e.path,
      summary: e.summary?.slice(0, 200),
      hasAuth: e.security.length > 0,
      hasBody: !!e.requestBody,
      paramCount: e.parameters.length,
      hasIdParam: e.parameters.some((p) => /id|uuid|guid/i.test(p.name)) || /\{.*?(id|uuid|guid).*?\}/i.test(e.path),
    }));

    const systemPrompt = `Você é Zekrom, skill agêntica de pentest do UnisysGuard especializada em validar mudanças DAST em APIs e Web para a Caixa Econômica Federal.

Sua tarefa: dado um conjunto de endpoints OpenAPI, gerar um CHECKLIST de testes OWASP cabíveis por endpoint.

REFERÊNCIAS:
- OWASP API Security Top 10 2023 (API1-API10:2023)
- OWASP Web Top 10 2021 (A01-A10:2021)

REGRAS:
- Não invente endpoints. Use apenas o que está na lista.
- Para cada endpoint, retorne 1 a 3 testes RELEVANTES (não todos os 10 OWASP — só os que fazem sentido pelo contexto).
- "rationale" deve citar pistas do endpoint (ex: "tem param id na URL → IDOR cabe").
- Severidade reflete impacto bancário (PIX, transferência, dados cliente).
- ZERO execução — só checklist. Pentester decide se vai explorar.

Devolva APENAS JSON puro array:
[
  {
    "endpoint": "/api/...",
    "method": "GET|POST|...",
    "owaspId": "API1:2023" ou "A01:2021",
    "category": "Nome curto da categoria OWASP",
    "severity": "CRITICA|ALTA|MEDIA|BAIXA",
    "rationale": "Por que esse teste cabe NESSE endpoint"
  }
]`;

    // Live Portfolio Context — busca vulns já cadastradas no ativo/sistema
    const portfolioQuery = `${spec.title} ${spec.baseUrl} ${sample.map((e) => e.path).join(' ')}`;
    const lpc = await getRelevantPortfolio(portfolioQuery, { topK: 6 });

    const enrichedSystem = lpc.matches.length > 0
      ? `${systemPrompt}\n\n${lpc.promptBlock}\n\nINSTRUÇÃO ADICIONAL: para test cards que mapeiem nos endpoints/categorias acima, marque rationale com "REINCIDÊNCIA: VUL-CXA-XXXX" no início. Priorize esses cards primeiro.`
      : systemPrompt;

    const userMessage = `SPEC: ${spec.title} v${spec.version}
Base URL: ${spec.baseUrl}
Escopo: ${scope}

ENDPOINTS (${sample.length} de ${spec.endpoints.length}):
${JSON.stringify(sample, null, 2)}`;

    const text = await this.llm.callPublic(enrichedSystem, userMessage);
    const cards = this.extractJsonArray(text);

    // Post-process: enriquece cards com reincidencia matchada
    if (lpc.matches.length > 0) {
      for (const card of cards) {
        const matched = this.matchCardToPortfolio(card, lpc.matches);
        if (matched) {
          card.reincidencia = {
            codigoInterno: matched.codigoInterno,
            titulo: matched.titulo,
            status: matched.status,
            score: matched.score,
          };
        }
      }
    }
    return cards;
  }

  /** Heurística: associa um test card a uma vuln do portfólio pelo endpoint/path + OWASP. */
  private matchCardToPortfolio(card: ZekromTestCard, matches: PortfolioMatch[]): PortfolioMatch | null {
    let best: PortfolioMatch | null = null;
    let bestScore = 0;
    for (const m of matches) {
      let s = 0;
      if (m.endpoint && card.endpoint && (m.endpoint.includes(card.endpoint) || card.endpoint.includes(m.endpoint))) s += 50;
      if (m.metodoHttp && card.method && m.metodoHttp.toUpperCase() === card.method.toUpperCase()) s += 10;
      if (m.owaspCategory && card.owaspId && m.owaspCategory.toUpperCase().includes(card.owaspId.toUpperCase())) s += 30;
      if (card.rationale?.toUpperCase().includes(m.codigoInterno)) s += 100; // LLM already cited
      if (s > bestScore) { best = m; bestScore = s; }
    }
    return bestScore >= 40 ? best : null;
  }

  /**
   * Generate detailed exploitation guidance for a single test card.
   * NEVER executes — only produces payload examples for the pentester to run manually.
   */
  async generateGuidance(card: ZekromTestCard, baseUrl: string, endpointDetails?: ZekromEndpoint): Promise<ZekromGuidance> {
    const config = loadLlmConfig();
    if (!config.apiKey && config.provider !== 'ollama') {
      throw new Error('IA não configurada.');
    }

    const systemPrompt = `Você é Zekrom, especialista em DAST. Gere guidance EXECUTÁVEL pelo pentester para o teste indicado.

REGRAS UNISYS AI P1.0:
- Você NÃO executa. Só gera payloads exemplo + comandos cURL para o humano rodar.
- Não use código GPL nos exemplos.
- Não invente CVEs.
- "expectedSignal" deve ser concreto (status code, header, regex no body, diff de tempo).
- Toda saída é "Content Created By/With Use of AI" — pentester valida.

Devolva APENAS JSON:
{
  "hypothesis": "O que se quer provar com esse teste (1 frase)",
  "payloadExamples": [
    { "description": "Caso teste 1", "curl": "curl -X ... '${baseUrl}...'", "expectedSignal": "Indicador de sucesso" }
  ],
  "detection": "Como confirmar que a vuln existe (passos)",
  "mitigation": "Correção recomendada (cite controle + framework)"
}`;

    // Live Portfolio Context — busca pelo endpoint+owasp do card
    const portfolioQuery = `${card.endpoint} ${card.method} ${card.owaspId} ${card.category} ${baseUrl}`;
    const lpc = await getRelevantPortfolio(portfolioQuery, { topK: 3 });
    const enrichedSystem = lpc.matches.length > 0
      ? `${systemPrompt}\n\n${lpc.promptBlock}\n\nINSTRUÇÃO ADICIONAL: se a evidência/PoC cadastrada acima cobrir este teste, REUSE os payloads/cURL dela como base. Cite o código (ex: "baseado em VUL-CXA-XXXX").`
      : systemPrompt;

    const userMessage = `BASE URL: ${baseUrl}
ENDPOINT: ${card.method} ${card.endpoint}
TESTE: ${card.owaspId} · ${card.category}
RATIONALE: ${card.rationale}
DETALHES DO ENDPOINT: ${endpointDetails ? JSON.stringify({
      summary: endpointDetails.summary,
      parameters: endpointDetails.parameters,
      hasBody: !!endpointDetails.requestBody,
      bodyContentType: endpointDetails.requestBody?.contentType,
      responses: endpointDetails.responses,
      security: endpointDetails.security,
    }, null, 2) : 'não fornecidos'}

Gere 2-4 payloadExamples concretos.`;

    const text = await this.llm.callPublic(enrichedSystem, userMessage);
    const parsed = this.extractJson(text);
    return {
      card,
      hypothesis: parsed.hypothesis || '',
      payloadExamples: parsed.payloadExamples || [],
      detection: parsed.detection || '',
      mitigation: parsed.mitigation || '',
      aiDisclosure: lpc.matches.length > 0
        ? `Content Created By/With Use of AI · Unisys AI P1.0 · Baseado em ${lpc.matches.length} vuln(s) do portfólio: ${lpc.matches.map((m) => m.codigoInterno).join(', ')}`
        : 'Content Created By/With Use of AI · Unisys AI P1.0 · Human oversight required',
    };
  }

  /**
   * Generate a Copilot Chat prompt-pack as Markdown — designed for the pentester
   * to paste into GitHub Copilot Chat inside their IDE to continue analysis with
   * full context.
   */
  generateCopilotPack(spec: ZekromParsedSpec, plan: ZekromTestCard[]): string {
    const date = new Date().toISOString();
    const groupedByEndpoint = new Map<string, ZekromTestCard[]>();
    for (const c of plan) {
      const key = `${c.method} ${c.endpoint}`;
      if (!groupedByEndpoint.has(key)) groupedByEndpoint.set(key, []);
      groupedByEndpoint.get(key)!.push(c);
    }

    let md = `# Zekrom · Copilot Prompt Pack\n\n`;
    md += `> **Content Created By/With Use of AI** · Unisys AI P1.0 compliant · ${date}\n>\n`;
    md += `> Cole esse arquivo no **GitHub Copilot Chat** (\`@workspace\` ou \`/explain\`) para receber assistência contextual durante o pentest. Toda análise sugerida pelo Copilot deve ser validada manualmente (human oversight obrigatório).\n\n`;
    md += `## Contexto do Alvo\n\n`;
    md += `- **API:** ${spec.title} v${spec.version}\n`;
    md += `- **Base URL:** \`${spec.baseUrl}\`\n`;
    md += `- **Endpoints analisados:** ${spec.endpoints.length}\n`;
    md += `- **Schemes de autenticação:** ${Object.keys(spec.securitySchemes).join(', ') || 'nenhum declarado'}\n`;
    md += `- **Fonte:** ${spec.source}\n\n`;
    md += `## Plano de Testes Sugerido pelo Zekrom\n\n`;

    for (const [endpoint, cards] of groupedByEndpoint) {
      md += `### \`${endpoint}\`\n\n`;
      for (const c of cards) {
        md += `- **${c.owaspId} · ${c.category}** (${c.severity})\n`;
        md += `  - _Rationale:_ ${c.rationale}\n`;
      }
      md += '\n';
    }

    md += `## Prompts Prontos pro Copilot Chat\n\n`;
    md += `### 1. Mapeamento de risco da PR\n\n`;
    md += `\`\`\`\n`;
    md += `@workspace Considerando o plano de pentest abaixo, identifique no código (controllers/handlers) os pontos que implementam cada endpoint listado. Para cada um, liste:\n`;
    md += `1. Onde está a validação de input.\n`;
    md += `2. Onde está a checagem de autorização.\n`;
    md += `3. Se há rate-limit configurado.\n`;
    md += `4. Se a query ao banco usa parâmetros parametrizados.\n\n`;
    md += `Endpoints:\n${[...groupedByEndpoint.keys()].map((e) => `- ${e}`).join('\n')}\n`;
    md += `\`\`\`\n\n`;

    md += `### 2. Geração de teste unitário de segurança\n\n`;
    md += `\`\`\`\n`;
    md += `@workspace Para o endpoint X (substitua), gere um teste unitário em xUnit/NUnit (ASP.NET) que valide:\n`;
    md += `- Acesso negado para usuário sem permissão (401/403).\n`;
    md += `- IDOR: usuário A não acessa recurso de usuário B.\n`;
    md += `- Validação de input: rejeita payloads inválidos.\n`;
    md += `\`\`\`\n\n`;

    md += `### 3. Code review focado em OWASP\n\n`;
    md += `\`\`\`\n`;
    md += `/explain Analise esse handler/controller buscando as 3 vulnerabilidades OWASP mais prováveis. Para cada uma, mostre a linha do código e proponha a correção.\n`;
    md += `\`\`\`\n\n`;

    md += `---\n\n`;
    md += `_Gerado pelo Zekrom · EpicVuln · Unisys AppSec ASPM. Não execute automaticamente. Human oversight obrigatório._\n`;
    return md;
  }

  private extractJson(text: string): any {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : cleaned);
  }

  private extractJsonArray(text: string): any[] {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const m = cleaned.match(/\[[\s\S]*\]/);
    return JSON.parse(m ? m[0] : cleaned);
  }
}
