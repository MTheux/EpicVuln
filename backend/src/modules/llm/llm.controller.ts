import { Request, Response } from 'express';
import { LlmService } from './llm.service';

export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  analyzeVulnerabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.llmService.generateAnalysis();
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('LLM Analysis Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao gerar análise com IA', 
        error: error.message 
      });
    }
  };

  getAttackGraph = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.llmService.generateAttackGraph();
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Attack Graph Error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar Attack Graph',
        error: error.message
      });
    }
  };
}
