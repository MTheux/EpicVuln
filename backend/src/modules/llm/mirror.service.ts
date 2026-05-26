/**
 * Mirror — Threat Modeling com RAG.
 *
 * Recebe descrição da arquitetura (texto ou diagrama em base64) + framework escolhido
 * (STRIDE, PASTA, LINDDUN) e devolve threat model completo enriquecido com:
 *  - top-K chunks da Base de Conhecimento (LGPD, BACEN, SDL CIWEB, OWASP)
 *  - lista de ameaças por componente
 *  - attack tree
 *  - mitigações priorizadas
 *
 * Compliance: usa RAG real (pgvector). Sem RAG, cai pra modo "knowledge-light".
 */

import { LlmService } from './llm.service';
import { querySimilar } from '../rag/rag.service';

export type Framework = 'stride' | 'pasta' | 'linddun';

export interface MirrorInput {
  contexto: string;
  framework: Framework;
  imageBase64?: string | null;
  imageMime?: string | null;
  topK?: number;
}

export interface MirrorResult {
  framework: Framework;
  ragContext: Array<{ docName: string; snippet: string; similarity: number }>;
  resumo: string;
  componentes: Array<{
    nome: string;
    descricao: string;
    ameacas: Array<{
      categoria: string;
      titulo: string;
      descricao: string;
      mitigacao: string;
      referencia?: string;
    }>;
  }>;
  attackTree: {
    raiz: string;
    nos: Array<{ id: string; tipo: 'entry' | 'exploit' | 'impact'; titulo: string; componente: string; tecnica: string }>;
    arestas: Array<{ de: string; para: string; como: string }>;
    mitigacaoChave: string;
  };
  mitigacoesPrioritarias: Array<{
    titulo: string;
    componente: string;
    esforco: 'BAIXO' | 'MEDIO' | 'ALTO';
    impacto: 'BAIXO' | 'MEDIO' | 'ALTO';
    comoFazer: string;
    referencia?: string;
  }>;
  conformidade: Array<{
    norma: string;
    requisito: string;
    aderencia: 'OK' | 'GAP' | 'PARCIAL';
    evidencia?: string;
  }>;
  _provider?: string;
  _model?: string;
}

const FRAMEWORK_BRIEFING: Record<Framework, string> = {
  stride: `STRIDE — categorias: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege. Use a sigla na categoria das ameaças.`,
  pasta: `PASTA (Process for Attack Simulation and Threat Analysis) — 7 estágios. Foco em business impact, threat scenarios, vuln analysis, attack modeling, risk analysis. Categoria das ameaças: Business / Technical / Operational.`,
  linddun: `LINDDUN — privacy threats: Linkability, Identifiability, Non-repudiation, Detectability, Disclosure of information, Unawareness, Non-compliance. Use a sigla. Casa com LGPD/GDPR.`,
};

export class MirrorService {
  constructor(private llm: LlmService) {}

  async modelThreats(input: MirrorInput): Promise<MirrorResult> {
    const ragCtx = await this.fetchRagContext(input.contexto, input.topK ?? 5);

    const systemPrompt = `Você é o Mirror — modelagem de ameaças para a Unisys/Caixa Econômica Federal.

FRAMEWORK SELECIONADO: ${input.framework.toUpperCase()}
${FRAMEWORK_BRIEFING[input.framework]}

CONTEXTO RAG (Base de Conhecimento — use como referência, cite quando aplicável):
${ragCtx.length > 0
  ? ragCtx.map((c, i) => `[#${i + 1}] ${c.docName} (sim ${c.similarity.toFixed(2)}):\n${c.snippet}`).join('\n\n')
  : '[Base de Conhecimento vazia — opere em modo knowledge-light]'}

REGRAS:
- pt-BR técnico bancário.
- Cada ameaça precisa ter categoria do framework + título + descrição + mitigação.
- Referencie chunks do RAG quando relevante (formato "RAG#1", "RAG#3" no campo referencia).
- Componentes APENAS o que está descrito no contexto + visível na imagem (se houver).
- Attack tree de 3 a 6 nós: entry → exploit → impact.
- Mitigações priorizadas com esforço × impacto.
- Conformidade: cruze com LGPD/BACEN 4658/PCI-DSS quando aplicável.

Devolva APENAS JSON puro:
{
  "framework": "${input.framework}",
  "resumo": "Resumo executivo (2-3 frases)",
  "componentes": [
    {
      "nome": "Componente",
      "descricao": "Função",
      "ameacas": [
        { "categoria": "S|T|R|I|D|E ou Business/Technical/Operational ou L|I|N|D|D|U|N", "titulo": "Curto", "descricao": "Detalhe", "mitigacao": "Controle", "referencia": "RAG#N ou OWASP/ASVS/CWE" }
      ]
    }
  ],
  "attackTree": {
    "raiz": "Impacto final",
    "nos": [
      { "id": "n1", "tipo": "entry|exploit|impact", "titulo": "Curto", "componente": "Nome", "tecnica": "Como" }
    ],
    "arestas": [ { "de": "n1", "para": "n2", "como": "Como passa" } ],
    "mitigacaoChave": "Controle que quebra a cadeia"
  },
  "mitigacoesPrioritarias": [
    { "titulo": "Ação", "componente": "Onde", "esforco": "BAIXO|MEDIO|ALTO", "impacto": "BAIXO|MEDIO|ALTO", "comoFazer": "Passo", "referencia": "RAG#N ou framework" }
  ],
  "conformidade": [
    { "norma": "LGPD|BACEN 4658|PCI-DSS|ASVS", "requisito": "Artigo/item", "aderencia": "OK|GAP|PARCIAL", "evidencia": "Detalhe" }
  ]
}`;

    const userMessage = `CONTEXTO DA ARQUITETURA:
${input.contexto}

${input.imageBase64 ? 'DIAGRAMA: imagem anexa.' : 'DIAGRAMA: nenhum.'}

Aplique ${input.framework.toUpperCase()} rigorosamente, usando o RAG como referência. Considere alvo Caixa: PIX, transferência, dados pessoais (LGPD), batch COBOL, mainframe Z, WSO2.`;

    let text: string;
    if (input.imageBase64 && input.imageMime) {
      const llmAny = this.llm as any;
      text = await llmAny.callLLMWithImage(systemPrompt, userMessage, input.imageBase64, input.imageMime);
    } else {
      text = await this.llm.callPublic(systemPrompt, userMessage);
    }
    text = text.replace(/```json/g, '').replace(/```\s*$/g, '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);

    return {
      ...parsed,
      framework: input.framework,
      ragContext: ragCtx.map((c) => ({ docName: c.docName, snippet: c.snippet.slice(0, 300), similarity: c.similarity })),
    } as MirrorResult;
  }

  private async fetchRagContext(query: string, topK: number) {
    try {
      const results = await querySimilar({ query, topK });
      return results.map((r) => ({ docName: r.docName, snippet: r.content, similarity: r.similarity }));
    } catch {
      return [];
    }
  }
}
