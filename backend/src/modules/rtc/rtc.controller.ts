import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { RtcService } from './rtc.service';
import { parseRtcPdf } from './rtc-pdf-parser';
import { prisma } from '../../app';
import { v4 as uuidv4 } from 'uuid';


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

    async importPdf(req: AuthRequest, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
            }

            // Dynamic import pdf-parse
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(req.file.buffer);
            const text = pdfData.text;

            if (!text || text.trim().length < 10) {
                return res.status(400).json({ error: 'PDF sem conteudo de texto extraivel' });
            }

            // Parse vulnerabilities from PDF text
            const parsed = parseRtcPdf(text);

            console.log('[RTC PDF] Text preview:', text.substring(0, 500));
            console.log('[RTC PDF] Parsed vulns:', JSON.stringify(parsed.map(v => ({ titulo: v.titulo, dataCriacao: v.dataCriacao, squad: v.squad })), null, 2));

            if (parsed.length === 0) {
                return res.status(400).json({
                    error: 'Nenhuma vulnerabilidade encontrada no PDF. Verifique se o PDF e de um Epic do RTC.',
                    textPreview: text.substring(0, 500),
                });
            }

            // Create vulnerabilities in database
            const results: { created: number; skipped: number; errors: string[] } = {
                created: 0,
                skipped: 0,
                errors: [],
            };

            for (const vuln of parsed) {
                try {
                    // Check if already exists (by title + squad)
                    const existing = await prisma.vulnerability.findFirst({
                        where: {
                            titulo: vuln.titulo,
                            squad: vuln.squad,
                            organizationId: req.organizationId || null,
                        },
                    });

                    if (existing) {
                        results.skipped++;
                        continue;
                    }

                    const codigoInterno = `RTC-${vuln.workItemId || uuidv4().substring(0, 8).toUpperCase()}`;

                    await prisma.vulnerability.create({
                        data: {
                            codigoInterno,
                            jiraKey: vuln.workItemId ? `WI-${vuln.workItemId}` : null,
                            titulo: vuln.titulo,
                            descricaoExecutiva: `Vulnerabilidade identificada em pentest: ${vuln.titulo}`,
                            descricaoTecnica: vuln.descricao,
                            criticidade: vuln.criticidade as any,
                            status: 'ABERTO',
                            origem: 'PENTEST',
                            squad: vuln.squad,
                            responsavel: vuln.responsavel || null,
                            sistema: 'Unisys',
                            ativo: 'Aplicacao',
                            tipo: 'Aplicação',
                            dataDeteccao: vuln.dataCriacao ? parseDate(vuln.dataCriacao) : new Date(),
                            dataCriacao: vuln.dataCriacao ? parseDate(vuln.dataCriacao) : new Date(),
                            createdById: req.user.id,
                            organizationId: req.organizationId || null,
                        },
                    });

                    // Create history entry
                    await prisma.vulnerabilityHistory.create({
                        data: {
                            vulnerabilityId: (await prisma.vulnerability.findFirst({
                                where: { codigoInterno },
                                select: { id: true },
                            }))!.id,
                            eventType: 'CRIACAO',
                            description: `Importado via PDF do RTC - ${vuln.tipoItem}`,
                            userId: req.user.id,
                        },
                    });

                    results.created++;
                } catch (err: any) {
                    results.errors.push(`${vuln.titulo}: ${err.message}`);
                }
            }

            res.json({
                success: true,
                message: `Importacao concluida: ${results.created} criadas, ${results.skipped} ja existentes`,
                total: parsed.length,
                ...results,
                parsed: parsed.map(v => ({
                    titulo: v.titulo,
                    criticidade: v.criticidade,
                    squad: v.squad,
                    responsavel: v.responsavel,
                })),
            });
        } catch (error: any) {
            console.error('[RTC] PDF Import Error:', error);
            res.status(500).json({ error: error.message || 'Erro ao importar PDF' });
        }
    }
}

function parseDate(dateStr: string): Date {
    // Try "27/11/2025, 16:18:29" format
    const brMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
        return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
    }
    // Try ISO format
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
}
