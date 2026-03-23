import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { RtcService } from './rtc.service';

const service = new RtcService();

export class RtcController {
    async getSettings(req: AuthRequest, res: Response) {
        try {
            const settings = await service.getSettings();
            res.json(settings);
        } catch (error: any) {
            console.error('[RTC] Erro ao buscar configuracoes:', error);
            res.status(500).json({ error: 'Erro ao buscar configuracoes do RTC' });
        }
    }

    async saveSettings(req: AuthRequest, res: Response) {
        try {
            const result = await service.saveSettings(req.body);
            res.json(result);
        } catch (error: any) {
            console.error('[RTC] Erro ao salvar configuracoes:', error);
            res.status(500).json({ error: 'Erro ao salvar configuracoes do RTC' });
        }
    }

    async sync(req: AuthRequest, res: Response) {
        try {
            const result = await service.sync(req.user.id);
            res.json(result);
        } catch (error: any) {
            console.error('[RTC] Sync Error:', error);
            res.status(500).json({ error: error.message || 'Erro ao sincronizar com RTC' });
        }
    }

    async testConnection(req: AuthRequest, res: Response) {
        try {
            const result = await service.testConnection();
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error: any) {
            console.error('[RTC] Test Connection Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Erro ao testar conexao com RTC' });
        }
    }
}
