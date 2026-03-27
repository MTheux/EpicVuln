import { prisma } from '../../app';
import { SettingsService } from '../settings/settings.service';

const settingsService = new SettingsService();

export class VulnerabilitiesService {
  private async calculateSlaDate(criticidade: string, dataDeteccao: Date = new Date()): Promise<Date> {
    const slaConfig = await settingsService.getSlaConfig();
    const slaDays = slaConfig[criticidade] ?? 90;
    const slaDate = new Date(dataDeteccao);
    slaDate.setDate(slaDate.getDate() + slaDays);
    return slaDate;
  }

  async findAll(filters: any, organizationId?: string) {
    const where: any = {};

    if (organizationId) where.organizationId = organizationId;
    if (filters.status) where.status = filters.status;
    if (filters.squad) where.squad = filters.squad;
    if (filters.criticidade) where.criticidade = filters.criticidade;

    return prisma.vulnerability.findMany({
      where,
      orderBy: { dataCriacao: 'desc' },
      include: {
        comments: { select: { id: true } },
        attachments: true,
        asset: { select: { id: true, name: true, type: true, businessCriticality: true } },
      }
    });
  }

  async findOne(id: string) {
    const vuln = await prisma.vulnerability.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } }
        },
        attachments: true,
        jiraSyncLogs: true,
        asset: { select: { id: true, name: true, type: true, businessCriticality: true } },
      }
    });

    if (!vuln) throw new Error('Vulnerability not found');
    return vuln;
  }

  async create(data: any, userId: string, organizationId?: string) {
    const mapCriticidade = (val?: string) => {
      if (!val) return 'ALTA';
      const m: any = { 'Extrema': 'CRITICA', 'Crítica': 'CRITICA', 'Alta': 'ALTA', 'Média': 'MEDIA', 'Baixa': 'BAIXA', 'Informativa': 'INFORMATIVA' };
      return m[val] || 'ALTA';
    };
    const mapStatus = (val?: string) => {
      if (!val) return 'NOVO';
      const m: any = { 'Nova': 'NOVO', 'Aberta': 'ABERTO', 'Em Backlog': 'EM_BACKLOG', 'Em Correção': 'EM_CORRECAO', 'Em Reteste': 'EM_RETESTE', 'Mitigada': 'MITIGADO', 'Concluída': 'CONCLUIDO', 'Risco Aceito': 'RISCO_ACEITO', 'Fechada': 'FECHADO' };
      return m[val] || 'NOVO';
    };
    const mapOrigem = (val?: string) => {
      if (!val) return 'MANUAL';
      const m: any = { 'Pentest': 'PENTEST', 'DAST': 'DAST', 'SAST': 'SAST', 'SCA': 'SCA', 'Bug Bounty': 'BUG_BOUNTY', 'Manual': 'MANUAL', 'Monitoramento': 'MONITORAMENTO', 'Code Review': 'CODE_REVIEW' };
      return m[val] || 'MANUAL';
    };
    const mapAmbiente = (val?: string) => {
      if (!val) return 'PRODUCAO';
      const m: any = { 'PRD': 'PRODUCAO', 'HML': 'HOMOLOGACAO', 'DEV': 'DESENVOLVIMENTO', 'STG': 'STAGING', 'Produção': 'PRODUCAO', 'Homologação': 'HOMOLOGACAO', 'Desenvolvimento': 'DESENVOLVIMENTO' };
      return m[val] || 'PRODUCAO';
    };
    const mapComplexidade = (val?: string) => {
      if (!val) return 'MEDIA';
      const m: any = { 'Baixa': 'BAIXA', 'Média': 'MEDIA', 'Alta': 'ALTA', 'Baxia': 'BAIXA', 'Media': 'MEDIA' };
      return m[val] || 'MEDIA';
    };

    return prisma.$transaction(async (tx) => {
      // Remover campos que o Prisma não espera ou que preenchemos manualmente
      const { id, history, comments, attachments, jiraSyncLogs, dbId, dataDeteccao, sla, criticidade, status, origem, ambiente, complexidade, complexidadeCorrecao, notificacoesEnviadas, ...validData } = data;

      // Gerar codigoInterno no padrão VULN-TIMESTAMP
      const codigoInterno = `VULN-${Date.now()}`;

      // Converter strings de data para objetos Date, se existirem
      const parsedDataDeteccao = dataDeteccao ? new Date(dataDeteccao) : new Date();
      const mappedCriticidade = mapCriticidade(criticidade);
      const parsedSla = sla ? new Date(sla) : await this.calculateSlaDate(mappedCriticidade, parsedDataDeteccao);

      const vuln = await tx.vulnerability.create({
        data: {
          ...validData,
          codigoInterno,
          criticidade: mapCriticidade(criticidade),
          status: mapStatus(status),
          origem: mapOrigem(origem),
          ambiente: mapAmbiente(ambiente),
          complexidade: mapComplexidade(complexidade),
          complexidadeCorrecao: mapComplexidade(complexidadeCorrecao),
          dataDeteccao: parsedDataDeteccao,
          sla: parsedSla,
          createdById: userId,
          organizationId: organizationId || undefined,
        }
      });

      // Registrar histórico de criação separadamente
      await tx.vulnerabilityHistory.create({
        data: {
          vulnerabilityId: vuln.id,
          eventType: 'CRIACAO',
          description: 'Vulnerabilidade registrada no sistema',
          userId,
        }
      });

      return vuln;
    });
  }

  async update(id: string, data: any, userId: string) {
    const existing = await prisma.vulnerability.findUnique({ where: { id } });
    if (!existing) throw new Error('Vulnerability not found');

    // Mass assignment protection: only allow whitelisted fields
    const allowedFields = [
      'titulo', 'descricaoExecutiva', 'descricaoTecnica', 'criticidade', 'status',
      'squad', 'sistema', 'ativo', 'ambiente', 'origem', 'responsavel', 'gestor',
      'impacto', 'recomendacao', 'tipo', 'complexidade', 'complexidadeCorrecao',
      'cwe', 'owaspCategory', 'tags', 'sla', 'dataDeteccao', 'jiraKey', 'assetId',
    ];
    const sanitizedData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        sanitizedData[key] = data[key];
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vulnerability.update({
        where: { id },
        data: sanitizedData
      });

      if (data.status && data.status !== existing.status) {
        await tx.vulnerabilityHistory.create({
          data: {
            vulnerabilityId: id,
            eventType: 'STATUS_ALTERADO',
            description: `Status alterado de ${existing.status} para ${data.status}`,
            previousValue: existing.status,
            newValue: data.status,
            userId,
          }
        });
      }

      return updated;
    });
  }

  async addComment(id: string, text: string, userId: string, type?: string) {
    const existing = await prisma.vulnerability.findUnique({ where: { id } });
    if (!existing) throw new Error('Vulnerability not found');

    const allowedTypes = ['observacao', 'decisao', 'tecnico', 'update'];
    const commentType = type && allowedTypes.includes(type) ? type : null;

    return prisma.vulnerabilityComment.create({
      data: {
        text,
        type: commentType,
        vulnerabilityId: id,
        authorId: userId,
      },
      include: {
        author: { select: { name: true } }
      }
    });
  }

  async delete(id: string) {
    const existing = await prisma.vulnerability.findUnique({ where: { id } });
    if (!existing) throw new Error('Vulnerability not found');

    return prisma.$transaction(async (tx) => {
      await tx.vulnerabilityHistory.deleteMany({ where: { vulnerabilityId: id } });
      await tx.vulnerabilityComment.deleteMany({ where: { vulnerabilityId: id } });
      await tx.vulnerabilityAttachment.deleteMany({ where: { vulnerabilityId: id } });
      return tx.vulnerability.delete({ where: { id } });
    });
  }

  // Limpa todas as vulnerabilidades do banco
  async deleteAll() {
    return prisma.$transaction(async (tx) => {
      await tx.jiraSyncLog.deleteMany({});
      await tx.vulnerabilityHistory.deleteMany({});
      await tx.vulnerabilityComment.deleteMany({});
      await tx.vulnerabilityAttachment.deleteMany({});
      const result = await tx.vulnerability.deleteMany({});
      return { deleted: result.count };
    });
  }

  // Upload Seguro de Evidências
  async addAttachment(id: string, file: Express.Multer.File) {
    const existing = await prisma.vulnerability.findUnique({ where: { id } });
    if (!existing) throw new Error('Vulnerability not found');

    return prisma.vulnerabilityAttachment.create({
      data: {
        vulnerabilityId: id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        path: file.path,
        size: file.size,
      }
    });
  }

  async getAttachment(id: string, filename: string) {
    const attachment = await prisma.vulnerabilityAttachment.findFirst({
      where: {
        vulnerabilityId: id,
        filename,
      }
    });

    if (!attachment) throw new Error('Attachment not found');

    return {
      path: attachment.path,
      mimeType: attachment.mimeType,
      originalName: attachment.originalName
    };
  }

  async importJsonData(payload: any[], userId: string, organizationId?: string) {
    let imported = 0;
    let errors = [];

    // Mapeamentos para o Prisma
    const mapCriticidade = (prioridade: string) => {
      const mapeamento: Record<string, 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA' | 'INFORMATIVA'> = {
        'Highest': 'CRITICA',
        'High': 'ALTA',
        'Medium': 'MEDIA',
        'Low': 'BAIXA',
        'Lowest': 'INFORMATIVA'
      };
      return mapeamento[prioridade] || 'MEDIA';
    };

    // Mapeia status combinando o campo customizado (Corrigida/Não Corrigida) + workflow
    const mapStatus = (statusCorrecao: string, statusWorkflow?: string) => {
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const sc = norm(statusCorrecao || '');
      const sw = norm(statusWorkflow || '');

      // Campo customizado "Corrigida" = concluído
      if (sc.includes('corrigida') && !sc.includes('nao corrigida')) return 'CONCLUIDO';

      // Workflow status mapping
      if (sw.includes('concluido') || sw.includes('concluida')) return 'CONCLUIDO';
      if (sw.includes('validacoes') || sw.includes('validacao') || sw.includes('seguranca')) return 'EM_RETESTE';
      if (sw.includes('backlog andamento') || sw.includes('andamento')) return 'EM_CORRECAO';
      if (sw.includes('appsec')) return 'EM_BACKLOG';
      if (sw.includes('backlog')) return 'EM_BACKLOG';

      // Campo customizado "Não Corrigida"
      if (sc.includes('nao corrigida') || sc.includes('itens pendentes')) return 'NOVO';

      // Fallbacks legados
      if (sc.includes('mitigada')) return 'MITIGADO';
      if (sc.includes('aceito')) return 'RISCO_ACEITO';
      if (sc.includes('fechada')) return 'CONCLUIDO';

      return 'NOVO';
    };

    const mapOrigem = (origem: string) => {
      const mapeamento = ['PENTEST', 'DAST', 'SAST', 'SCA', 'BUG_BOUNTY', 'MANUAL', 'MONITORAMENTO', 'CODE_REVIEW'];
      const orig = origem ? origem.toUpperCase().replace(' ', '_') : 'MANUAL';
      return mapeamento.includes(orig) ? orig : 'MANUAL';
    };

    const mapAmbiente = (ambiente: string) => {
      const amb = ambiente ? ambiente.toUpperCase() : 'PRODUCAO';
      if (amb === 'HOMOLOGAÇÃO' || amb === 'HOMOLOG' || amb === 'HOMOLOGACAO') return 'HOMOLOGACAO';
      if (amb === 'DESENVOLVIMENTO' || amb === 'DEV') return 'DESENVOLVIMENTO';
      return 'PRODUCAO';
    };

    console.log(`[Service] Iniciando processamento de ${payload.length} itens para importação.`);
    let skipped = 0;

    for (const item of payload) {
      try {
        const jiraKey = item.key;
        if (!jiraKey) {
          skipped++;
          continue;
        }

        // Evitar duplicidade baseada na key
        const existing = await prisma.vulnerability.findFirst({
          where: { jiraKey }
        });

        // Extrair CWE do título se presente (ex: [CWE-798])
        const cweMatch = (item.resumo || '').match(/\[CWE-(\d+)\]/);
        const cwe = cweMatch ? `CWE-${cweMatch[1]}` : undefined;

        // Calcular dias em aberto baseado na data de criação
        const dataCriacaoOrigem = item.dataCriacao ? new Date(item.dataCriacao) : new Date();
        const now = new Date();
        let diasEmAberto = 0;
        
        if (!isNaN(dataCriacaoOrigem.getTime())) {
          diasEmAberto = Math.floor((now.getTime() - dataCriacaoOrigem.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Garantir que diasEmAberto não seja NaN nem negativo para o banco
        if (isNaN(diasEmAberto) || diasEmAberto < 0) diasEmAberto = 0;

        // Extrair Alvo do campo ou do título (ex: [APP MAIS! IOS] -> App Mais IOS)
        let alvo = item.alvo || '';
        if (!alvo && item.resumo) {
          const alvoMatch = (item.resumo || '').match(/^\[([^\]]+)\]/);
          if (alvoMatch) alvo = alvoMatch[1].trim();
        }

        const data: any = {
          jiraKey: item.key,
          titulo: item.resumo || 'Sem Título',
          descricaoExecutiva: item.resumo || item.impacto || item.descricao || 'Importado via JSON',
          descricaoTecnica: item.descricao || 'Nenhuma descrição detalhada disponível.',
          criticidade: mapCriticidade(item.prioridade),
          status: mapStatus(item.statusCorrecao || item.status || '', item.statusWorkflow || ''),
          squad: item.squadResponsavel || item.squadLider || 'Não Definido',
          sistema: alvo || item.squadResponsavel || 'Não Definido',
          ativo: alvo || item.squadResponsavel || 'Não Definido',
          ambiente: mapAmbiente(item.ambiente),
          origem: mapOrigem(item.origem),
          responsavel: item.responsavel || '',
          gestor: item.criador || item.relator || '',
          impacto: item.impacto || '',
          recomendacao: item.recomendacao || '',
          tipo: item.tipo || 'Aplicação',
          diasEmAberto: Math.round(diasEmAberto),
          complexidade: 'MEDIA',
          complexidadeCorrecao: 'MEDIA',
        };

        // Campos opcionais
        if (cwe) data.cwe = cwe;
        if (item.categorias) data.tags = [item.categorias];

        // Tratamento de Datas — usar datas da origem, não a data de import
        if (item.dataCriacao) {
          const d = new Date(item.dataCriacao);
          if (!isNaN(d.getTime())) data.dataCriacao = d;
        }
        if (item.dataDeteccao) {
          const d = new Date(item.dataDeteccao);
          if (!isNaN(d.getTime())) data.dataDeteccao = d;
        }
        if (item.atualizadoEm) {
          const d = new Date(item.atualizadoEm);
          if (!isNaN(d.getTime())) data.ultimaAtualizacao = d;
        }
        if (item.dataLimite) {
          const d = new Date(item.dataLimite);
          if (!isNaN(d.getTime())) data.sla = d;
        }

        // Se não tiver SLA, calcula baseado na criticidade
        if (!data.sla) {
          data.sla = await this.calculateSlaDate(data.criticidade, data.dataDeteccao || data.dataCriacao || new Date());
        }

        if (existing) {
          await prisma.vulnerability.update({
            where: { id: existing.id },
            data: {
              ...data,
              updatedById: userId
            }
          });
        } else {
          // Usar key como codigoInterno (mais útil que VULN-timestamp)
          data.codigoInterno = item.key;
          data.createdById = userId;
          if (organizationId) data.organizationId = organizationId;

          await prisma.vulnerability.create({
            data: data as any
          });
        }
        imported++;
      } catch (err: any) {
        console.error(`[Service] Erro ao importar item ${item.key}:`, err.message);
        errors.push({ key: item.key, error: err.message });
      }
    }

    console.log(`[Service] Importação Finalizada: ${imported} importados, ${skipped} pulados (sem chave), ${errors.length} erros.`);
    return { success: true, imported, errors };

  }
}
