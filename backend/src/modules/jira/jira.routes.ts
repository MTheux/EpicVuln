import { Response } from 'express';
import { Router } from 'express';
import { authenticate, AuthRequest, requireRoles } from '../../middleware/auth.middleware';
import { prisma } from '../../app';

class JiraService {
    async getSettings() {
        const url = await prisma.systemSettings.findUnique({ where: { key: 'JIRA_URL' } });
        const email = await prisma.systemSettings.findUnique({ where: { key: 'JIRA_EMAIL' } });
        const token = await prisma.systemSettings.findUnique({ where: { key: 'JIRA_TOKEN' } });
        const projects = await prisma.systemSettings.findUnique({ where: { key: 'JIRA_PROJECTS' } });

        return {
            url: url?.value || '',
            email: email?.value || '',
            token: token?.value ? '********' : '',
            projects: projects?.value || ''
        };
    }

    async saveSettings(data: { url: string; email: string; token?: string; projects: string }) {
        const { url, email, token, projects } = data;

        await this.upsertSetting('JIRA_URL', url);
        await this.upsertSetting('JIRA_EMAIL', email);
        if (token && token !== '********') await this.upsertSetting('JIRA_TOKEN', token);
        await this.upsertSetting('JIRA_PROJECTS', projects);

        return { success: true, message: 'Configurações do Jira atualizadas com sucesso.' };
    }

    private async upsertSetting(key: string, value: string) {
        if (!value) return;
        await prisma.systemSettings.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    }

    async sync(userId: string) {
        const settings = await this.getSettings();
        const realToken = await prisma.systemSettings.findUnique({ where: { key: 'JIRA_TOKEN' } });

        if (!settings.url || !settings.email || !realToken?.value || !settings.projects) {
            throw new Error('Integração com o Jira não está completamente configurada.');
        }

        const baseUrl = settings.url.replace(/\/$/, '');
        const authHeader = 'Basic ' + Buffer.from(`${settings.email}:${realToken.value}`).toString('base64');
        const projects = settings.projects.split(',').map((p: string) => p.trim()).filter(Boolean);

        if (projects.length === 0) throw new Error('Nenhum projeto configurado para sincronização do Jira.');

        const jql = `project IN (${projects.map((p: string) => `"${p}"`).join(',')}) ORDER BY created DESC`;

        const response = await fetch(`${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na API do Jira: ${response.statusText} (${response.status})`);
        }

        const data: any = await response.json();
        let imported = 0;

        for (const issue of data.issues || []) {
            const key = issue.key;
            const fields = issue.fields;

            const titulo = fields.summary || 'Sem título';
            const descricao = fields.description?.content?.[0]?.content?.[0]?.text || '';
            const statusName = (fields.status?.name || 'Nova').toLowerCase();

            let mappedStatus = 'NOVO';
            if (statusName.includes('progress') || statusName.includes('andamento') || statusName.includes('correção')) mappedStatus = 'EM_CORRECAO';
            else if (statusName.includes('done') || statusName.includes('concluído') || statusName.includes('closed')) mappedStatus = 'CONCLUIDO';
            else if (statusName.includes('backlog')) mappedStatus = 'EM_BACKLOG';

            const priorityName = (fields.priority?.name || 'Medium').toLowerCase();
            let mappedCrit = 'MEDIA';
            if (priorityName.includes('high') || priorityName.includes('crit')) mappedCrit = 'CRITICA';
            else if (priorityName.includes('highest')) mappedCrit = 'EXTREMA';
            else if (priorityName.includes('low')) mappedCrit = 'BAIXA';

            const existing = await prisma.vulnerability.findFirst({
                where: { jiraKey: key }
            });

            let vulnId = '';

            if (!existing) {
                const newVuln = await prisma.vulnerability.create({
                    data: {
                        codigoInterno: `VULN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                        jiraKey: key,
                        titulo,
                        descricaoExecutiva: descricao.substring(0, 500) || 'Importado do Jira',
                        descricaoTecnica: descricao || 'Ticket Jira importado',
                        criticidade: mappedCrit as any,
                        status: mappedStatus as any,
                        squad: 'Sem dono',
                        sistema: 'Geral',
                        ativo: 'Sistemas',
                        ambiente: 'PRODUCAO',
                        origem: 'PENTEST',
                        createdById: userId,
                    }
                });
                vulnId = newVuln.id;
                imported++;
            } else {
                await prisma.vulnerability.update({
                    where: { id: existing.id },
                    data: {
                        titulo,
                        status: mappedStatus as any
                    }
                });
                vulnId = existing.id;
                imported++;
            }

            // --- Sincronizar Comentários do Jira para o Histórico ---
            try {
                const commentsRes = await fetch(`${baseUrl}/rest/api/3/issue/${key}/comment`, {
                    headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/json'
                    }
                });

                if (commentsRes.ok) {
                    const commentsData: any = await commentsRes.json();
                    for (const comment of commentsData.comments || []) {
                        const authorName = comment.author?.displayName || 'Jira User';
                        const commentText = comment.body?.content?.[0]?.content?.[0]?.text || '';
                        const createdAt = new Date(comment.created);

                        // Evitar duplicar no histórico (checar se já existe comentário com o mesmo texto e data)
                        const existingHist = await prisma.vulnerabilityHistory.findFirst({
                            where: {
                                vulnerabilityId: vulnId,
                                eventType: 'SYNC_JIRA',
                                description: { contains: commentText.substring(0, 50) }
                            }
                        });

                        if (!existingHist && commentText) {
                            await prisma.vulnerabilityHistory.create({
                                data: {
                                    vulnerabilityId: vulnId,
                                    eventType: 'SYNC_JIRA',
                                    description: `[Comentário Jira] ${authorName}: ${commentText}`,
                                    createdAt: createdAt
                                }
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(`Erro ao buscar comentários para ${key}:`, err);
            }
        }

        return { success: true, message: `Sincronização do Jira finalizada. ${imported} tickets processados.`, imported };
    }
    async handleWebhook(payload: any) {
        // Exemplo simplificado de payload Jira Webhook:
        // payload = { webhookEvent: 'jira:issue_updated', issue: { key: 'VUL-123', fields: { status: { name: 'Done' } } } }
        
        if (!payload || !payload.issue || !payload.issue.key) {
            throw new Error('Payload Jira inválido ou sem issue.key');
        }

        const jiraKey = payload.issue.key;
        const newStatusName = payload.issue.fields?.status?.name || 'Open';

        console.log(`[Jira Webhook] Atualizando ticket ${jiraKey} para status: ${newStatusName}`);

        // O mapeamento abaixo é padrão. Poderia existir uma tabela de configuração Custom, mas usaremos a predefinida.
        let mappedStatus = 'ABERTO';
        const st = newStatusName.toLowerCase();
        
        if (st.includes('done') || st.includes('conclu')) mappedStatus = 'CONCLUIDO';
        else if (st.includes('progress') || st.includes('corrigindo')) mappedStatus = 'EM_CORRECAO';
        else if (st.includes('backlog')) mappedStatus = 'EM_BACKLOG';
        else if (st.includes('review') || st.includes('revis')) mappedStatus = 'AGUARDANDO_REVISAO';

        // Tentar encontrar a vulnerabilidade e atualizar
        const vuln = await prisma.vulnerability.findFirst({
            where: { jiraKey }
        });

        if (vuln) {
            await prisma.vulnerability.update({
                where: { id: vuln.id },
                data: { status: mappedStatus as any }
            });
            console.log(`[Jira Webhook] Vulnerabilidade interna ${vuln.id} atualizada para o status ${mappedStatus}`);
            return { success: true, updated: true, jiraKey, newStatus: mappedStatus };
        } else {
            console.log(`[Jira Webhook] Recebi evento do Jira, mas não encontrei ${jiraKey} cadastrada internamente.`);
            return { success: true, updated: false, message: 'Issue não vinculada.' };
        }
    }
}

const service = new JiraService();
const router = Router();

// Endpoint para ler as configurações
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const settings = await service.getSettings();
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ error: 'Erro ao buscar configuracoes' });
    }
});

// Endpoint para salvar as configuracoes - somente ADMIN
router.post('/settings', authenticate, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
        const result = await service.saveSettings(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Erro ao salvar configuracoes' });
    }
});

// Endpoint principal para disparar a sincronização
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const result = await service.sync(req.user.id);
        res.json(result);
    } catch (error: any) {
        console.error('Jira Sync Error:', error);
        res.status(500).json({ error: 'Erro ao sincronizar com Jira' });
    }
});

// Endpoint protegido por secret para receber Webhooks do Jira
router.post('/webhook', async (req: AuthRequest, res: Response) => {
    const secret = req.query.secret || req.headers['x-webhook-secret'];
    const expectedSecret = process.env.JIRA_WEBHOOK_SECRET;

    if (!expectedSecret) {
        console.error('[Jira Webhook] JIRA_WEBHOOK_SECRET not configured in environment');
        res.status(500).json({ error: 'Webhook not configured' });
        return;
    }

    if (!secret || secret !== expectedSecret) {
        res.status(403).json({ error: 'Unauthorized webhook request' });
        return;
    }

    try {
        const result = await service.handleWebhook(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('Jira Webhook Error:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

export default router;
