import { Router, Request, Response } from 'express';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { llmLimiter } from '../../rate-limiters';
import { authenticate } from '../../middleware/auth.middleware';
import { loadLlmConfig, saveLlmConfig, getLlmConfigSafe, PROVIDER_MODELS } from './llm-config';

const router = Router();
const llmService = new LlmService();
const llmController = new LlmController(llmService);

// All LLM routes require authentication
router.use(authenticate);

router.get('/analyze', llmLimiter, llmController.analyzeVulnerabilities);
router.get('/attack-graph', llmLimiter, llmController.getAttackGraph);

// LLM Config routes
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

    // Load existing config to preserve apiKey if not provided
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

// Test LLM connection
router.post('/test', llmLimiter, async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, baseUrl } = req.body;

    // Temporarily save and test
    const existing = loadLlmConfig();
    const testConfig = {
      provider: provider || existing.provider,
      apiKey: apiKey || existing.apiKey,
      model: model || existing.model,
      baseUrl: baseUrl || existing.baseUrl,
    };

    saveLlmConfig(testConfig);

    // Quick test — ask the LLM a simple question
    const testService = new LlmService();
    const startTime = Date.now();

    // Use a lightweight call
    try {
      // We'll just verify the analysis works
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
      // Restore old config on failure
      saveLlmConfig(existing);
      throw testErr;
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
