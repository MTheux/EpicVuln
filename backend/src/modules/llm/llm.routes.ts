import { Router } from 'express';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

const router = Router();
const llmService = new LlmService();
const llmController = new LlmController(llmService);

router.get('/analyze', llmController.analyzeVulnerabilities);

export default router;
