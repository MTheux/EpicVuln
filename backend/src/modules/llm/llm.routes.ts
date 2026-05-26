import { Router, Request, Response } from 'express';
import multer from 'multer';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { ZekromService } from './zekrom.service';
import { ForgeService } from './forge.service';
import { MirrorService } from './mirror.service';
import { AuditService } from './audit.service';
import { getRelevantPortfolio } from './portfolio-context.service';
import { llmLimiter } from '../../rate-limiters';
import { authenticate } from '../../middleware/auth.middleware';
import { loadLlmConfig, saveLlmConfig, getLlmConfigSafe, PROVIDER_MODELS } from './llm-config';

const router = Router();
const llmService = new LlmService();
const llmController = new LlmController(llmService);
const zekrom = new ZekromService(llmService);
const forge = new ForgeService(llmService);
const mirror = new MirrorService(llmService);
const audit = new AuditService(llmService);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate);

router.get('/analyze', llmLimiter, llmController.analyzeVulnerabilities);
router.get('/attack-graph', llmLimiter, llmController.getAttackGraph);

/**
 * Mitigação de controle SDL — recebe info do controle e devolve:
 *  - descricaoExpandida: explicação prática do controle
 *  - codigoMitigacao: snippet de código ASP.NET Core / Node.js que implementa
 *  - testes: como validar
 */
router.post('/control-mitigation', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { id, titulo, categoria, owasp, asvs, cwe, sev, stack = 'ASP.NET Core / C#' } = req.body || {};
    if (!titulo) return res.status(400).json({ error: 'titulo obrigatório' });

    const systemPrompt = `Você é especialista em Application Security pra Caixa Econômica Federal usando stack ${stack}.
Recebe um controle SDL CIWEB e devolve:
1. Descrição expandida (3-5 frases) explicando o controle em linguagem de dev.
2. Código de exemplo concreto pra IMPLEMENTAR o controle (ASP.NET Core preferencial, Node.js como segunda opção).
3. Como TESTAR que o controle está ativo.
4. Erros comuns que devs cometem ao implementar.

REGRAS:
- Português pt-BR técnico.
- Use code blocks com linguagem (\`\`\`csharp ou \`\`\`javascript).
- Cite OWASP/ASVS quando relevante.
- Sem GPL no código exemplo.

Devolva APENAS JSON puro:
{
  "descricaoExpandida": "...",
  "codigoMitigacao": "código entre triple backticks com linguagem",
  "comoTestar": "passos pra validar",
  "errosComuns": ["erro 1", "erro 2", "erro 3"]
}`;

    const userMessage = `CONTROLE SDL CIWEB:
- ID: ${id}
- Título: ${titulo}
- Categoria: ${categoria}
- OWASP: ${owasp || 'N/A'}
- ASVS: ${asvs || 'N/A'}
- CWE: ${cwe || 'N/A'}
- Severidade: ${sev || 'N/A'}
- Stack alvo: ${stack}

Gere descrição expandida + código de mitigação + como testar + erros comuns.`;

    let text = await llmService.callPublic(systemPrompt, userMessage);
    text = text.replace(/```json/g, '').replace(/```\s*$/g, '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * HackBot — chatbot interativo do UnisysGuard.
 * Recebe array de mensagens, devolve resposta. Sistema prompt define HackBot
 * como auxiliar do pentester (defensivo + ofensivo, sempre com human oversight).
 */
router.post('/chat', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { messages = [] } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] obrigatório' });
    }

    const systemPrompt = `Você é o HackBot — auxiliar do pentester ofensivo da squad Unisys que atende a Caixa Econômica Federal.

PAPEL:
- Tirar dúvidas técnicas sobre web, API, mobile, cloud, mainframe.
- Sugerir payloads, comandos cURL, ferramentas e técnicas — pentester executa manualmente.
- Explicar conceitos OWASP, CWE, CVE, frameworks de segurança.
- Ajudar a interpretar requests/responses e identificar candidatos a vulnerabilidade.
- Sugerir próximos passos de investigação.
- Estimar severidade (CRITICA/ALTA/MEDIA/BAIXA) com base no impacto bancário Caixa.
- Linkar pra skills da plataforma quando relevante (Zekrom DAST, JWT Inspector, Gerador de Épicos, Análise STRIDE, JSHunter).

REGRAS UNISYS AI P1.0:
- Você nunca executa ações. Só sugere.
- Nunca invente CVEs/CWEs/endpoints/credenciais. Se não souber, diga "não tenho certeza".
- Output sempre rotulado como "Content Created By/With Use of AI" pelo cliente.
- Pra dados confidenciais, lembre o user de checar se o provider atual é Unisys-approved (GitHub Models) ou Local (Ollama).

ESTILO:
- pt-BR técnico, direto, sem enrolação.
- Use code blocks pra payloads/cURL.
- Cite framework (OWASP API1:2023, CWE-89, etc).
- Respostas curtas por padrão. Se o user pedir detalhe, aprofunde.`;

    // Pull just the conversation; build the proper format for callPublic
    const lastUser = messages[messages.length - 1]?.content || '';
    const history = messages
      .slice(0, -1)
      .map((m: any) => `${m.role === 'user' ? 'USUÁRIO' : 'HACKBOT'}: ${m.content}`)
      .join('\n\n');
    const userMessage = history
      ? `HISTÓRICO DA CONVERSA:\n${history}\n\n---\nMENSAGEM ATUAL DO USUÁRIO:\n${lastUser}`
      : lastUser;

    // Live Portfolio Context — busca vulns ativas relevantes pra mensagem do user
    const portfolioQuery = lastUser + (history ? '\n' + history.slice(-500) : '');
    const lpc = await getRelevantPortfolio(portfolioQuery, {
      topK: 5,
      organizationId: (req as any).organizationId,
    });
    const enrichedSystem = lpc.matches.length > 0
      ? `${systemPrompt}\n\n${lpc.promptBlock}`
      : systemPrompt;

    const response = await llmService.callPublic(enrichedSystem, userMessage);
    res.json({
      message: response,
      portfolioContext: {
        used: lpc.matches.length,
        matches: lpc.matches.map((m) => ({
          codigoInterno: m.codigoInterno,
          titulo: m.titulo,
          criticidade: m.criticidade,
          owaspCategory: m.owaspCategory,
          ativo: m.ativo,
          score: m.score,
          reasons: m.matchReasons,
        })),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-epic', llmLimiter, upload.single('evidencia'), async (req: Request, res: Response) => {
  try {
    const { alvo, descricao, tipo } = req.body;
    const hasImage = !!req.file;
    const result = await llmService.generateEpic({
      alvo: alvo || '',
      descricao: descricao || '',
      tipo: (tipo === 'API' ? 'API' : 'WEB') as 'WEB' | 'API',
      imageBase64: hasImage ? req.file!.buffer.toString('base64') : null,
      imageMime: hasImage ? req.file!.mimetype : null,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/analyze-architecture', llmLimiter, upload.single('diagrama'), async (req: Request, res: Response) => {
  try {
    const { contexto } = req.body;
    const hasImage = !!req.file;
    const result = await llmService.analyzeArchitecture({
      contexto: contexto || '',
      imageBase64: hasImage ? req.file!.buffer.toString('base64') : null,
      imageMime: hasImage ? req.file!.mimetype : null,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ===================== Zekrom · DAST Copilot Orchestrator ===================== */

/**
 * Parse an OpenAPI/Swagger spec.
 * Accepts: form-data with field "content" (pasted) OR file upload "spec" OR JSON body { url, headers }.
 */
router.post('/zekrom/parse-spec', upload.single('spec'), async (req: Request, res: Response) => {
  try {
    let raw: string | null = null;
    let source: 'url' | 'wso2' | 'paste' | 'upload' = 'paste';

    if (req.file) {
      raw = req.file.buffer.toString('utf-8');
      source = 'upload';
    } else if (req.body.url) {
      const headers: Record<string, string> = {};
      if (req.body.token) headers.Authorization = `Bearer ${req.body.token}`;
      raw = await zekrom.fetchSpec(req.body.url, headers);
      source = req.body.wso2 ? 'wso2' : 'url';
    } else if (req.body.content) {
      raw = req.body.content;
      source = 'paste';
    }

    if (!raw) {
      return res.status(400).json({ error: 'Forneça spec via upload, URL ou paste.' });
    }

    const parsed = zekrom.parseSpec(raw, source);
    res.json(parsed);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/zekrom/generate-plan', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { spec, scope } = req.body;
    if (!spec || !spec.endpoints) {
      return res.status(400).json({ error: 'Spec parseado é obrigatório.' });
    }
    const plan = await zekrom.generatePlan(spec, scope || 'api');
    res.json({ plan, count: plan.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/zekrom/generate-guidance', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { card, baseUrl, endpointDetails } = req.body;
    if (!card) return res.status(400).json({ error: 'Card é obrigatório.' });
    const guidance = await zekrom.generateGuidance(card, baseUrl || '', endpointDetails);
    res.json(guidance);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/zekrom/copilot-pack', async (req: Request, res: Response) => {
  try {
    const { spec, plan } = req.body;
    if (!spec || !plan) return res.status(400).json({ error: 'spec e plan são obrigatórios.' });
    const md = zekrom.generateCopilotPack(spec, plan);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zekrom-copilot-pack.md"');
    res.send(md);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================================================================ */
/* ============================== Forge ====================================== */
router.post('/forge/modernize', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { sourceCode, legacyLang, targetFramework, contexto, withTests } = req.body || {};
    if (!sourceCode || !String(sourceCode).trim()) {
      return res.status(400).json({ error: 'sourceCode obrigatório' });
    }
    const result = await forge.modernize({
      sourceCode,
      legacyLang: legacyLang || 'auto',
      targetFramework: targetFramework || 'aspnet-core-8',
      contexto,
      withTests: withTests !== false,
    });
    const cfg = loadLlmConfig();
    res.json({ ...result, _provider: cfg.provider, _model: cfg.model });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================== Mirror ===================================== */
const upload2 = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/mirror/model', llmLimiter, upload2.single('diagrama'), async (req: Request, res: Response) => {
  try {
    const { contexto, framework, topK } = req.body || {};
    if (!contexto || !String(contexto).trim()) {
      return res.status(400).json({ error: 'contexto obrigatório' });
    }
    const fw = (['stride', 'pasta', 'linddun'] as const).includes(framework) ? framework : 'stride';
    const hasImage = !!req.file;
    const result = await mirror.modelThreats({
      contexto,
      framework: fw,
      imageBase64: hasImage ? req.file!.buffer.toString('base64') : null,
      imageMime: hasImage ? req.file!.mimetype : null,
      topK: topK ? Number(topK) : 5,
    });
    const cfg = loadLlmConfig();
    res.json({ ...result, _provider: cfg.provider, _model: cfg.model });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================== Audit ====================================== */
router.post('/audit/run', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { normas, escopoAtivo, contextoAdicional } = req.body || {};
    const list = Array.isArray(normas) && normas.length > 0 ? normas : ['lgpd', 'bacen-4658', 'sdl-ciweb'];
    const result = await audit.runAudit({ normas: list, escopoAtivo, contextoAdicional });
    const cfg = loadLlmConfig();
    res.json({ ...result, _provider: cfg.provider, _model: cfg.model });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================================================================ */

router.get('/config', (req: Request, res: Response) => {
  try {
    const config = getLlmConfigSafe();
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: 'Erro ao carregar configuração' });
  }
});

router.get('/providers', (req: Request, res: Response) => {
  res.json(PROVIDER_MODELS);
});

router.put('/config', (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, baseUrl } = req.body;
    if (!provider || !model) {
      res.status(400).json({ error: 'Provider e model são obrigatórios' });
      return;
    }
    const existing = loadLlmConfig();
    const newConfig = {
      provider,
      apiKey: apiKey || (provider === existing.provider ? existing.apiKey : ''),
      model,
      baseUrl: baseUrl || undefined,
    };
    saveLlmConfig(newConfig);
    res.json({ success: true, config: getLlmConfigSafe() });
  } catch (e: any) {
    res.status(500).json({ error: 'Erro ao salvar configuração: ' + e.message });
  }
});

router.post('/test', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, baseUrl } = req.body;
    const existing = loadLlmConfig();
    const testConfig = {
      provider: provider || existing.provider,
      apiKey: apiKey || existing.apiKey,
      model: model || existing.model,
      baseUrl: baseUrl || existing.baseUrl,
    };
    saveLlmConfig(testConfig);
    const testService = new LlmService();
    const startTime = Date.now();
    try {
      const result = await testService.generateAnalysis();
      const elapsed = Date.now() - startTime;
      res.json({
        success: true,
        provider: testConfig.provider,
        model: testConfig.model,
        responseTime: `${elapsed}ms`,
        hasData: !!result.resumoExecutivo,
      });
    } catch (testErr: any) {
      saveLlmConfig(existing);
      throw testErr;
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
