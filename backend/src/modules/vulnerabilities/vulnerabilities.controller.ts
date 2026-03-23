import { Request, Response } from 'express';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class VulnerabilitiesController {
    private service: VulnerabilitiesService;

    constructor() {
        this.service = new VulnerabilitiesService();
    }

    async findAll(req: AuthRequest, res: Response) {
        try {
            const result = await this.service.findAll(req.query, req.organizationId);
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
      const vulnerability = await this.service.create(req.body, req.user.id, req.organizationId);
      res.status(201).json(vulnerability);
    } catch (error: any) {
      console.error("Erro na criacao:", error);
      res.status(500).json({ error: 'Erro ao criar vulnerabilidade' });
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

      const result = await this.service.importJiraJson(payload, req.user.id, req.organizationId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro na importação de JSON do Jira:", error);
      res.status(500).json({ error: 'Erro ao importar dados' });
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

      // XXE prevention: reject XML with DOCTYPE or ENTITY declarations
      if (/<!DOCTYPE/i.test(xmlBody) || /<!ENTITY/i.test(xmlBody)) {
        res.status(400).json({ error: 'XML com DOCTYPE ou ENTITY nao permitido por seguranca' });
        return;
      }

      const xml2js = require('xml2js');
      const parser = new xml2js.Parser({ explicitArray: false, trim: true });
      const parsed = await parser.parseStringPromise(xmlBody);

      // Helper to find a field ignoring case
      const getFieldIgnoringCase = (obj: any, fieldName: string): any => {
        if (!obj) return undefined;
        const keys = Object.keys(obj);
        const foundKey = keys.find(k => k.toLowerCase() === fieldName.toLowerCase());
        return foundKey ? obj[foundKey] : undefined;
      };

      const getText = (field: any): string => {
        if (!field) return '';
        if (typeof field === 'string') return field.trim();
        if (field._) return field._.trim();
        if (field['#text']) return field['#text'].trim();
        return String(field).trim();
      };

      let rawItems: any[] = [];
      let format: 'rss' | 'epics' | 'unknown' = 'unknown';

      // 1. Check for RSS (<rss><channel><item>)
      const rss = getFieldIgnoringCase(parsed, 'rss');
      const channel = getFieldIgnoringCase(rss, 'channel');
      const rssItem = getFieldIgnoringCase(channel, 'item');

      if (rssItem) {
        rawItems = Array.isArray(rssItem) ? rssItem : [rssItem];
        format = 'rss';
      } 
      // 2. Check for Epics/Epic (<Epics><Epic> or <Epic>)
      else {
        const epics = getFieldIgnoringCase(parsed, 'Epics');
        const epic = getFieldIgnoringCase(epics || parsed, 'Epic');
        if (epic) {
          rawItems = Array.isArray(epic) ? epic : [epic];
          format = 'epics';
        }
      }

      if (rawItems.length === 0) {
        res.status(400).json({ error: 'Formato XML não reconhecido ou vazio. Use XML Jira RSS ou formato <Epics><Epic>.' });
        return;
      }

      console.log(`[Import] Detectado formato: ${format} com ${rawItems.length} itens brutos.`);

      let items: any[] = [];

      if (format === 'epics') {
        items = rawItems.map((epic: any) => ({
          key: getText(getFieldIgnoringCase(epic, 'Key')),
          url: getText(getFieldIgnoringCase(epic, 'URL')),
          resumo: getText(getFieldIgnoringCase(epic, 'Resumo') || getFieldIgnoringCase(epic, 'Summary') || getFieldIgnoringCase(epic, 'Title')),
          descricao: getText(getFieldIgnoringCase(epic, 'Descricao') || getFieldIgnoringCase(epic, 'Description')),
          prioridade: getText(getFieldIgnoringCase(epic, 'Prioridade') || getFieldIgnoringCase(epic, 'Priority')) || 'Medium',
          statusCorrecao: getText(getFieldIgnoringCase(epic, 'StatusCorrecao') || getFieldIgnoringCase(epic, 'Status')) || 'Não Corrigida',
          statusWorkflow: getText(getFieldIgnoringCase(epic, 'StatusWorkflow')) || '',
          squadResponsavel: getText(getFieldIgnoringCase(epic, 'SquadResponsavel') || getFieldIgnoringCase(epic, 'Squad')),
          alvo: getText(getFieldIgnoringCase(epic, 'Alvo') || getFieldIgnoringCase(epic, 'Asset') || getFieldIgnoringCase(epic, 'System')),
          ambiente: getText(getFieldIgnoringCase(epic, 'Ambiente')) || 'Produção',
          origem: getText(getFieldIgnoringCase(epic, 'Origem')) || 'Pentest',
          tipo: getText(getFieldIgnoringCase(epic, 'Tipo')) || 'Aplicação',
          impacto: getText(getFieldIgnoringCase(epic, 'Impacto')),
          recomendacao: getText(getFieldIgnoringCase(epic, 'Recomendacao')),
          dataCriacao: getText(getFieldIgnoringCase(epic, 'DataDaCriacao') || getFieldIgnoringCase(epic, 'Created')),
          dataDeteccao: getText(getFieldIgnoringCase(epic, 'DataDaDeteccao')),
          dataLimite: getText(getFieldIgnoringCase(epic, 'DataLimite') || getFieldIgnoringCase(epic, 'DueDate')),
          responsavel: getText(getFieldIgnoringCase(epic, 'Responsavel') || getFieldIgnoringCase(epic, 'Assignee')),
          criador: getText(getFieldIgnoringCase(epic, 'Relator') || getFieldIgnoringCase(epic, 'Creator')),
        }));
      } else {
        // Parse formato Jira RSS
        const getCustomField = (item: any, fieldName: string): string => {
          const fieldsObj = getFieldIgnoringCase(item, 'customfields');
          const fields = getFieldIgnoringCase(fieldsObj, 'customfield');
          if (!fields) return '';
          const arr = Array.isArray(fields) ? fields : [fields];
          const field = arr.find((f: any) => {
            const name = getFieldIgnoringCase(f, 'customfieldname') || '';
            return String(name).toLowerCase().includes(fieldName.toLowerCase());
          });
          if (!field) return '';
          const valsObj = getFieldIgnoringCase(field, 'customfieldvalues');
          const vals = getFieldIgnoringCase(valsObj, 'customfieldvalue');
          if (!vals) return '';
          if (typeof vals === 'string') return vals;
          if (vals._) return vals._;
          if (Array.isArray(vals)) return vals.map((v: any) => typeof v === 'string' ? v : v._ || v).join(', ');
          return String(vals);
        };

        items = rawItems.map((item: any) => {
          const title = getText(getFieldIgnoringCase(item, 'title'));
          const summary = getText(getFieldIgnoringCase(item, 'summary'));
          
          return {
            key: getText(getFieldIgnoringCase(item, 'key')),
            url: getText(getFieldIgnoringCase(item, 'link')),
            resumo: summary || title.replace(/^\[.*?\]\s*/, '') || '',
            descricao: getText(getFieldIgnoringCase(item, 'description')),
            prioridade: getText(getFieldIgnoringCase(item, 'priority')) || 'Medium',
            status: getCustomField(item, 'Status') || getText(getFieldIgnoringCase(item, 'status')) || 'Não Corrigida',
            squadResponsavel: getCustomField(item, 'Squad Respons') || getCustomField(item, 'Team'),
            alvo: getCustomField(item, 'Alvo') || getCustomField(item, 'Asset'),
            ambiente: getCustomField(item, 'Ambiente') || 'Produção',
            origem: getCustomField(item, 'Origem') || 'Pentest',
            tipo: getCustomField(item, 'Tipo') || 'Aplicação',
            recomendacao: getCustomField(item, 'Recomenda'),
            dataCriacao: getCustomField(item, 'Data da Cria') || getText(getFieldIgnoringCase(item, 'created')) || '',
            dataDeteccao: getCustomField(item, 'Data da Detec') || getText(getFieldIgnoringCase(item, 'created')) || '',
            dataLimite: getText(getFieldIgnoringCase(item, 'due')) || '',
            responsavel: getText(getFieldIgnoringCase(item, 'assignee')) || '',
            criador: getText(getFieldIgnoringCase(item, 'reporter')) || '',
          };
        });
      }

      if (items.length === 0) {
        res.status(400).json({ error: 'Nenhuma vulnerabilidade válida encontrada no XML.' });
        return;
      }

      console.log(`[Import] Sucesso: ${items.length} itens mapeados.`);
      const result = await this.service.importJiraJson(items, req.user.id, req.organizationId);
      res.status(200).json(result);

    } catch (error: any) {
      console.error("Erro na importação de XML:", error);
      res.status(500).json({ error: 'Erro ao processar XML' });
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
            const { text, type } = req.body;
            if (!text) {
                res.status(400).json({ error: 'Text is required' });
                return;
            }
            const result = await this.service.addComment(id, text, userId, type);
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

            // Path traversal prevention
            if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
                res.status(400).json({ error: 'Nome de arquivo invalido' });
                return;
            }

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
