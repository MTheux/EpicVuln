import { Request, Response } from 'express';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class VulnerabilitiesController {
    private service: VulnerabilitiesService;

    constructor() {
        this.service = new VulnerabilitiesService();
    }

    async findAll(req: Request, res: Response) {
        try {
            const result = await this.service.findAll(req.query);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async findOne(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const result = await this.service.findOne(id);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'Vulnerability not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const vulnerability = await this.service.create(req.body, req.user.id);
      res.status(201).json(vulnerability);
    } catch (error: any) {
      console.error("Erro na criação:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async importJira(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const payload = req.body;
      if (!Array.isArray(payload)) {
        res.status(400).json({ error: 'Expected an array of vulnerabilities' });
        return;
      }

      const result = await this.service.importJiraJson(payload, req.user.id);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro na importação de JSON do Jira:", error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  async importXml(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const xmlBody = req.body?.xml;
      if (!xmlBody || typeof xmlBody !== 'string') {
        res.status(400).json({ error: 'Expected { xml: "<xml string>" } in body' });
        return;
      }

      const xml2js = require('xml2js');
      const parser = new xml2js.Parser({ explicitArray: false, trim: true });
      const parsed = await parser.parseStringPromise(xmlBody);

      let rawItems: any[] = [];

      if (parsed.rss?.channel?.item) {
        rawItems = Array.isArray(parsed.rss.channel.item)
          ? parsed.rss.channel.item
          : [parsed.rss.channel.item];
      } else {
        res.status(400).json({ error: 'Formato XML não reconhecido. Exporte como XML/RSS do Jira.' });
        return;
      }

      // Helper: extract custom field value by name from Jira XML
      const getCustomField = (item: any, fieldName: string): string => {
        const fields = item.customfields?.customfield;
        if (!fields) return '';
        const arr = Array.isArray(fields) ? fields : [fields];
        const field = arr.find((f: any) => {
          const name = f.customfieldname || '';
          return name.toLowerCase().includes(fieldName.toLowerCase());
        });
        if (!field) return '';
        const vals = field.customfieldvalues?.customfieldvalue;
        if (!vals) return '';
        if (typeof vals === 'string') return vals;
        if (vals._ ) return vals._;
        if (Array.isArray(vals)) return vals.map((v: any) => typeof v === 'string' ? v : v._ || v).join(', ');
        return String(vals);
      };

      const items = rawItems.map((item: any) => ({
        key: item.key?._ || item.key || '',
        url: item.link || '',
        resumo: item.summary || item.title?.replace(/^\[.*?\]\s*/, '') || '',
        descricao: item.description || '',
        prioridade: item.priority?._ || item.priority || 'Medium',
        status: getCustomField(item, 'Status') || item.status?._ || item.status || 'Não Corrigida',
        squadResponsavel: getCustomField(item, 'Squad Respons'),
        alvo: getCustomField(item, 'Alvo'),
        ambiente: getCustomField(item, 'Ambiente') || 'Produção',
        origem: getCustomField(item, 'Origem') || 'Pentest',
        tipo: getCustomField(item, 'Tipo') || 'Aplicação',
        impacto: getCustomField(item, 'Impacto'),
        recomendacao: getCustomField(item, 'Recomenda'),
        dataCriacao: getCustomField(item, 'Data da Cria') || item.created || '',
        dataDeteccao: getCustomField(item, 'Data da Detec') || item.created || '',
        dataLimite: item.due || '',
        atualizadoEm: item.updated || '',
        responsavel: item.assignee?._ || item.assignee || '',
        criador: item.reporter?._ || item.reporter || '',
      }));

      if (items.length === 0) {
        res.status(400).json({ error: 'Nenhuma vulnerabilidade encontrada no XML.' });
        return;
      }

      console.log(`XML Import: Parsed ${items.length} items from Jira RSS XML`);
      const result = await this.service.importJiraJson(items, req.user.id);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro na importação de XML:", error);
      res.status(500).json({ error: error.message || 'Erro ao processar XML' });
    }
  }

    async update(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const id = req.params.id as string;
            const result = await this.service.update(id, req.body, userId);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'Vulnerability not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }

    async addComment(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const id = req.params.id as string;
            const { text } = req.body;
            if (!text) {
                res.status(400).json({ error: 'Text is required' });
                return;
            }
            const result = await this.service.addComment(id, text, userId);
            res.status(201).json(result);
        } catch (error: any) {
            if (error.message === 'Vulnerability not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }

    async delete(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            await this.service.delete(id);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'Vulnerability not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteAll(req: Request, res: Response) {
        try {
            const result = await this.service.deleteAll();
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async uploadEvidence(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const file = req.file;

            if (!file) {
                res.status(400).json({ error: 'No file uploaded or invalid extension' });
                return;
            }

            const result = await this.service.addAttachment(id, file);
            res.status(201).json(result);
        } catch (error: any) {
            console.error(error);
            if (error.message === 'Vulnerability not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }

    async downloadEvidence(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const filename = req.params.filename as string;

            const fileData = await this.service.getAttachment(id, filename);
            
            // Proteção forte contra RCE:
            // Força mime text/plain para arquivos perigosos
            const isDangerous = filename.toLowerCase().endsWith('.php') || filename.toLowerCase().endsWith('.html');
            if (isDangerous) {
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Content-Disposition', 'inline');
            } else {
                res.setHeader('Content-Type', fileData.mimeType);
            }

            res.sendFile(fileData.path);
        } catch (error: any) {
            if (error.message === 'Attachment not found') res.status(404).json({ error: error.message });
            else res.status(500).json({ error: 'Internal server error' });
        }
    }
}
