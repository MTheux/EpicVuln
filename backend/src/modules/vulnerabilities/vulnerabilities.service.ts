import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class VulnerabilitiesService {
  async findAll(filters: any) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.squad) where.squad = filters.squad;
    if (filters.criticidade) where.criticidade = filters.criticidade;

    return prisma.vulnerability.findMany({
      where,
      orderBy: { dataCriacao: 'desc' },
      include: {
        comments: { select: { id: true } },
        attachments: true,
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
      }
    });

    if (!vuln) throw new Error('Vulnerability not found');
    return vuln;
  }

  async create(data: any, userId: string) {
    const mapCriticidade = (val?: string) => {
      if (!val) return 'ALTA';
      const m: any = { 'Extrema': 'EXTREMA', 'Crítica': 'CRITICA', 'Alta': 'ALTA', 'Média': 'MEDIA', 'Baixa': 'BAIXA', 'Informativa': 'INFORMATIVA' };
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

    return prisma.$transaction(async (tx) => {
      // Remover campos que o Prisma não espera ou que preenchemos manualmente
      const { id, history, comments, attachments, jiraSyncLogs, dbId, dataDeteccao, sla, criticidade, status, origem, ambiente, notificacoesEnviadas, ...validData } = data;

      // Gerar codigoInterno no padrão VULN-TIMESTAMP
      const codigoInterno = `VULN-${Date.now()}`;

      // Converter strings de data para objetos Date, se existirem
      const parsedDataDeteccao = dataDeteccao ? new Date(dataDeteccao) : undefined;
      const parsedSla = sla ? new Date(sla) : undefined;

      const vuln = await tx.vulnerability.create({
        data: {
          ...validData,
          codigoInterno,
          criticidade: mapCriticidade(criticidade),
          status: mapStatus(status),
          origem: mapOrigem(origem),
          ambiente: mapAmbiente(ambiente),
          dataDeteccao: parsedDataDeteccao,
          sla: parsedSla,
          createdById: userId,
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

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vulnerability.update({
        where: { id },
        data
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

  async addComment(id: string, text: string, userId: string) {
    const existing = await prisma.vulnerability.findUnique({ where: { id } });
    if (!existing) throw new Error('Vulnerability not found');

    return prisma.vulnerabilityComment.create({
      data: {
        text,
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

  async importJiraJson(payload: any[], userId: string) {
    let imported = 0;
    let errors = [];

    // Mapeamentos para o Prisma
    const mapCriticidade = (prioridade: string) => {
      const mapeamento: Record<string, 'EXTREMA' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA' | 'INFORMATIVA'> = {
        'Highest': 'EXTREMA',
        'High': 'ALTA',
        'Medium': 'MEDIA',
        'Low': 'BAIXA',
        'Lowest': 'INFORMATIVA'
      };
      return mapeamento[prioridade] || 'MEDIA';
    };

    const mapStatus = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('não corrigida') || s.includes('itens pendentes')) return 'NOVO';
      if (s.includes('backlog')) return 'EM_BACKLOG';
      if (s.includes('em correção')) return 'EM_CORRECAO';
      if (s.includes('reteste')) return 'EM_RETESTE';
      if (s.includes('mitigada')) return 'MITIGADO';
      if (s.includes('aceito')) return 'RISCO_ACEITO';
      if (s.includes('fechada') || s.includes('concluída')) return 'CONCLUIDO';
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

    for (const item of payload) {
      try {
        const jiraKey = item.key;
        if (!jiraKey) continue; // Pula se não for uma issue do Jira válida

        // Evitar duplicidade cega baseada no jiraKey.
        const existing = await prisma.vulnerability.findFirst({
          where: { jiraKey }
        });

        const data: any = {
          jiraKey: item.key,
          titulo: item.resumo || 'Sem Título',
          descricaoExecutiva: item.descricao || '',
          descricaoTecnica: item.descricao || '',
          criticidade: mapCriticidade(item.prioridade),
          status: mapStatus(item.status),
          squad: item.squadResponsavel || item.squadLider || 'Não Definido',
          sistema: item.alvo || 'Não Definido',
          ativo: item.alvo || 'Não Definido',
          ambiente: mapAmbiente(item.ambiente),
          origem: mapOrigem(item.origem),
          responsavel: item.responsavel,
          impacto: item.impacto,
          recomendacao: item.recomendacao,
          tipo: item.tipo || 'Aplicação'
        };

        // Tratamento de Datas
        if (item.dataDeteccao) {
          data.dataDeteccao = new Date(item.dataDeteccao);
        }
        if (item.dataLimite) {
          data.sla = new Date(item.dataLimite);
        }

        if (existing) {
          // Atualiza registro existente
          await prisma.vulnerability.update({
            where: { id: existing.id },
            data: {
              ...data,
              updatedById: userId
            }
          });
        } else {
          // Cria novo registro
          data.codigoInterno = `VULN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          data.createdById = userId;

          await prisma.vulnerability.create({
            data
          });
        }
        imported++;
      } catch (err: any) {
        errors.push({ key: item.key, error: err.message });
      }
    }

    return { success: true, imported, errors };
  }
}
