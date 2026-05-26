/**
 * Audit — Compliance & LGPD/BACEN/SDL CIWEB.
 *
 * Cruza findings ativos do banco com os 52 controles SDL CIWEB + LGPD/BACEN 4658
 * e devolve relatório de gaps + plano de remediação priorizado.
 *
 * Não é só consulta a regulamento — a skill computa aderência usando dados reais:
 *  - vulnerabilidades por owasp/cwe → mapeia para controle SDL/LGPD
 *  - ativos vs criticidade
 *  - histórico de reincidência
 *
 * Output rotulado como artefato auditável.
 */

import { PrismaClient } from '@prisma/client';
import { LlmService } from './llm.service';

const prisma = new PrismaClient();

export type Norma = 'lgpd' | 'bacen-4658' | 'sdl-ciweb' | 'pci-dss' | 'asvs';

export interface AuditInput {
  normas: Norma[];
  escopoAtivo?: string;
  contextoAdicional?: string;
}

export interface AuditFinding {
  controle: string;
  norma: string;
  artigo?: string;
  status: 'OK' | 'GAP' | 'PARCIAL' | 'NA';
  evidencia: string;
  vulnsRelacionadas: string[];
  ativosAfetados: string[];
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  remediacao: string;
  prazoSugerido: string;
}

export interface AuditResult {
  resumo: {
    totalControles: number;
    ok: number;
    parcial: number;
    gap: number;
    naoAplicavel: number;
    scoreAderencia: number;
  };
  porNorma: Record<string, { total: number; gaps: number; aderencia: number }>;
  findings: AuditFinding[];
  riscosCriticos: Array<{ titulo: string; descricao: string; impactoRegulatorio: string }>;
  planoRemediacao: Array<{
    ordem: number;
    titulo: string;
    controle: string;
    norma: string;
    responsavel: string;
    prazo: string;
    esforco: 'BAIXO' | 'MEDIO' | 'ALTO';
    impacto: 'BAIXO' | 'MEDIO' | 'ALTO';
  }>;
  rotuloAI: string;
  _provider?: string;
  _model?: string;
}

const NORMA_BRIEFING: Record<Norma, string> = {
  'lgpd': 'LGPD Lei 13.709/2018 — Art. 6 (princípios), 7 (bases legais), 18 (direitos titular), 37 (registro de operações), 46 (segurança), 48 (incidente).',
  'bacen-4658': 'BACEN Resolução 4.658/2018 — política cibersegurança, plano contingência, classificação risco, gestão incidente, terceirização nuvem.',
  'sdl-ciweb': '52 controles SDL CIWEB Caixa — input validation, output encoding, autenticação, autorização, criptografia, logging, deps, secrets, headers.',
  'pci-dss': 'PCI-DSS v4 — Req 6 (secure dev), Req 8 (auth), Req 10 (logging), Req 11 (testing).',
  'asvs': 'OWASP ASVS v4 — V1-V14 architecture, auth, session, access control, validation, crypto, error, data, comm, malicious, business logic, files, API, config.',
};

export class AuditService {
  constructor(private llm: LlmService) {}

  async runAudit(input: AuditInput): Promise<AuditResult> {
    const vulns = await prisma.vulnerability.findMany({
      where: {
        status: { notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] },
        ...(input.escopoAtivo ? { OR: [{ ativo: input.escopoAtivo }, { sistema: input.escopoAtivo }] } : {}),
      },
      select: {
        codigoInterno: true, jiraKey: true, titulo: true, criticidade: true,
        squad: true, ativo: true, sistema: true, cwe: true, owaspCategory: true,
        impacto: true, diasEmAberto: true, sla: true, reincidencia: true, responsavel: true,
      },
    });

    const assets = await prisma.asset.findMany({
      select: { name: true, type: true, businessCriticality: true, _count: { select: { vulnerabilities: true } } },
    });

    const vulnSummary = vulns.map((v) => ({
      codigo: v.jiraKey || v.codigoInterno,
      titulo: v.titulo,
      criticidade: v.criticidade,
      owasp: v.owaspCategory,
      cwe: v.cwe,
      ativo: v.ativo || v.sistema,
      diasAberto: v.diasEmAberto,
      reincidencia: v.reincidencia,
    }));

    const normasBriefing = input.normas.map((n) => `- ${n.toUpperCase()}: ${NORMA_BRIEFING[n]}`).join('\n');

    const systemPrompt = `Você é o Audit — auditor de compliance para a Unisys/Caixa Econômica Federal.

NORMAS NO ESCOPO:
${normasBriefing}

DADOS REAIS DA PLATAFORMA:
- ${vulns.length} vulnerabilidades ativas (escopo: ${input.escopoAtivo || 'todos'})
- ${assets.length} ativos cadastrados

REGRAS:
- Use APENAS dados reais fornecidos. Nunca invente CVE/CWE/códigos.
- Para cada controle relevante das normas selecionadas, avalie status: OK (sem gaps), PARCIAL (gaps mitigáveis), GAP (não conforme), NA (não aplicável ao escopo).
- Cite as vulnsRelacionadas usando o código real (VUL-... ou jiraKey).
- Severidade do finding: CRITICA se gera risco regulatório imediato, ALTA se há vulnerabilidades CRITICAS sem mitigação, MEDIA se aderência parcial, BAIXA se nuance.
- Plano de remediação priorizado por impacto regulatório × esforço.
- Output deve ser auditável: cada finding tem evidência rastreável.
- pt-BR técnico-formal de auditoria.

Devolva APENAS JSON puro:
{
  "resumo": {
    "totalControles": número,
    "ok": número, "parcial": número, "gap": número, "naoAplicavel": número,
    "scoreAderencia": 0-100
  },
  "porNorma": { "LGPD": { "total": N, "gaps": N, "aderencia": 0-100 } },
  "findings": [
    {
      "controle": "Nome do controle",
      "norma": "LGPD|BACEN-4658|SDL-CIWEB|PCI-DSS|ASVS",
      "artigo": "Art. X ou item",
      "status": "OK|GAP|PARCIAL|NA",
      "evidencia": "Justificativa com dados",
      "vulnsRelacionadas": ["VUL-XXX"],
      "ativosAfetados": ["nome do ativo"],
      "severidade": "CRITICA|ALTA|MEDIA|BAIXA",
      "remediacao": "O que fazer",
      "prazoSugerido": "7d|30d|90d"
    }
  ],
  "riscosCriticos": [ { "titulo": "Risco", "descricao": "Detalhe", "impactoRegulatorio": "ANPD/BACEN/etc" } ],
  "planoRemediacao": [
    { "ordem": 1, "titulo": "Ação", "controle": "Controle alvo", "norma": "Norma", "responsavel": "Squad/área", "prazo": "ISO date relativo", "esforco": "BAIXO|MEDIO|ALTO", "impacto": "BAIXO|MEDIO|ALTO" }
  ],
  "rotuloAI": "Content Created By/With Use of AI — Audit Skill · ${input.normas.join(', ')} · ${new Date().toISOString().slice(0, 10)}"
}`;

    const userMessage = `VULNERABILIDADES ATIVAS:
${JSON.stringify(vulnSummary, null, 2)}

ATIVOS:
${assets.map((a) => `- ${a.name} (${a.type}, ${a.businessCriticality}, ${a._count.vulnerabilities} vulns)`).join('\n')}

CONTEXTO ADICIONAL: ${input.contextoAdicional || 'nenhum'}

Audite aderência às normas selecionadas com base nos dados acima. Priorize plano por impacto regulatório.`;

    let text = await this.llm.callPublic(systemPrompt, userMessage);
    text = text.replace(/```json/g, '').replace(/```\s*$/g, '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);

    return parsed as AuditResult;
  }
}
