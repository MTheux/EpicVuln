import { Router } from 'express';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { llmLimiter } from '../../app';

const router = Router();
const llmService = new LlmService();
const llmController = new LlmController(llmService);

router.get('/analyze', llmLimiter, llmController.analyzeVulnerabilities);

export default router;
