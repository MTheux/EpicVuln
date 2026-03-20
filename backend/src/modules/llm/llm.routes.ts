import { Router } from 'express';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { llmLimiter } from '../../rate-limiters';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const llmService = new LlmService();
const llmController = new LlmController(llmService);

// All LLM routes require authentication
router.use(authenticate);

router.get('/analyze', llmLimiter, llmController.analyzeVulnerabilities);
router.get('/attack-graph', llmLimiter, llmController.getAttackGraph);

export default router;
