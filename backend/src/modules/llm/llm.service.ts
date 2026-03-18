import { PrismaClient } from '@prisma/client';
import Groq from 'groq-sdk';
import { getSquadMetadata } from '../analytics/squad-mapping';

const prisma = new PrismaClient();

export class LlmService {
  private client: Groq | null = null;
  private cache: { data: any; timestamp: number } | null = null;
  private attackGraphCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MODEL = 'llama-3.3-70b-versatile';

  private getClient(): Groq {
    if (!this.client) {
      this.client = new Groq({
        apiKey: process.env.GROQ_API_KEY || 'missing-key',
      });
    }
    return this.client;
  }

  private async callLLM(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model: this.MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error('Resposta vazia da IA');
    return text;
  }

  async generateAnalysis() {
    if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_TTL) {
      console.log('Mytchi AI: Retornando resultado do cache.');
      return { ...this.cache.data, _cached: true, _cachedAt: new Date(this.cache.timestamp).toISOString() };
    }

    const vulnerabilidades = await prisma.vulnerability.findMany({
      where: {
        status: { notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] }
      },
      select: {
        id: true,
        codigoInterno: true,
        titulo: true,
        criticidade: true,
        squad: true,
        sistema: true,
        ativo: true,
        owaspCategory: true,
        diasEmAberto: true,
        reincidencia: true
      }
    });

    const activeCount = vulnerabilidades.length;

    if (!process.env.GROQ_API_KEY) {
      return {
        resumoExecutivo: "Configuracao Pendente: Cerebro da Mytchi AI Desconectado.",
        fortaleza: "A chave GROQ_API_KEY nao foi encontrada nas variaveis de ambiente do backend.",
        fraqueza: "Sem ela, o relatorio C-Level gerativo fica desligado.",
        acao: "Acesse https://console.groq.com/keys, gere uma key gratuita e adicione no .env."
      };
    }

    // Temporarily disable cache to force new format
    this.cache = null;

    if (activeCount === 0) {
      return {
        resumoExecutivo: "O ambiente da CredSystem esta impecavel. Nenhuma vulnerabilidade pendente localizada.",
        fortaleza: "Operacao livre de gaps listados no banco de dados. Equipe atuou em 100% das falhas.",
        fraqueza: "Nenhum vetor de vulnerabilidade aberto no momento.",
        acao: "Manter governanca e rotina atual de monitoramento diario.",
        topVulnerabilities: [],
        maturidadeGaps: [],
        culturaInsights: "Cultura de seguranca exemplar. Continue assim!",
        attackPath: []
      };
    }

    // Priorizar as mais críticas para a análise
    const severityOrder: Record<string, number> = { 'EXTREMA': 0, 'CRITICA': 1, 'ALTA': 2, 'MEDIA': 3, 'BAIXA': 4 };
    const sortedVulns = vulnerabilidades.sort((a, b) => {
        const orderA = severityOrder[a.criticidade.toUpperCase()] ?? 99;
        const orderB = severityOrder[b.criticidade.toUpperCase()] ?? 99;
        return orderA - orderB;
    }).slice(0, 30); // Limitar as 30 mais perigosas para o contexto

    // Enriquecer com metadados de liderança para o contexto da IA
    const enrichedVulns = sortedVulns.map(v => ({
      ...v,
      metadata: v.squad ? getSquadMetadata(v.squad) : null
    }));

    const contextData = JSON.stringify(enrichedVulns);

    const systemPrompt = `Voce e a "Mytchi AI", o Chief Information Security Officer (CISO) e Head de Application Security da "CredSystem", uma instituicao financeira de alto rigor transacional.

Sua missao e ler um dump de dados contendo as vulnerabilidades de software (AppSec) mais perigosas atualmente em aberto.

Diretrizes de Analise PROPRIA (Deep Insight):
1. PRIORIDADE MAXIMA: Foque estritamente nas falhas EXTREMAS e CRITICAS. Ignore falhas baixas/medias a menos que elas sejam parte de um encadeamento de ataque.
2. FOCO NO NEGOCIO: Avalie o risco sob a otica de um Banco (Fraude, Vazamento de Dados de Cartao, LGPD).
3. SSDLC & CULTURA: Identifique onde a cultura esta falhando (ex: falta de patching ou correcao rapida de CRITICOS).

Com base na massa de dados fornecida, gere EXATAMENTE um objeto JSON contendo as chaves a seguir:

{
  "resumoExecutivo": "Veredito focado nas maiores ameaças encontradas.",
  "fortaleza": "Tribos com melhor higiene de seguranca.",
  "fraqueza": "O maior perigo atual (ex: Risco de Invasao de Core via API).",
  "acao": "Plano pratico imediato para conter os riscos EXTREMOS.",
  "topVulnerabilities": [
    {"codigo": "VUL-XXX", "motivo": "Impacto financeiro devastador se nao corrigida agora."}
  ],
  "maturidadeGaps": [
    {"squad": "Nome", "gap": "Falha repetitiva de gravidade alta/extrema.", "lider": "Responsavel"}
  ],
  "culturaInsights": "Conselho para elevar o nivel de seguranca organizacional.",
  "evolucao": [
     {"mes": "Jan", "fechadas": 15, "abertas": 5},
     {"mes": "Fev", "fechadas": 22, "abertas": 8},
     {"mes": "Mar", "fechadas": 30, "abertas": 3}
  ],
  "attackPath": [
     {"node": "Vulnerabilidade Real (ex: Injeção SQL na API X)", "escalatesTo": "Consequencia Real (ex: Acesso total ao Banco de Clientes)"}
  ]
}

A chave "attackPath" DEVE conter vulnerabilidades REAIS extraidas do payload. NAO use termos genericos como "Phishing" se eles nao estiverem nos dados.

IMPORTANTE: DEVOLVA APENAS O JSON PURO E VALIDO. SEM TEXTO EXTRA.`;

    try {
      console.log("Mytchi AI: Iniciando analise com Groq...");
      let text = await this.callLLM(systemPrompt, `Massa de dados das ${activeCount} vulnerabilidades: ${contextData}`);
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text);
      console.log("Mytchi AI: Analise gerada com sucesso. Keys:", Object.keys(parsed));
      this.cache = { data: parsed, timestamp: Date.now() };
      return { ...parsed, _cached: false };
    } catch (e: any) {
      console.error("LLM Error:", e.message);
      if (this.cache) {
        console.log('Mytchi AI: Retornando cache antigo como fallback.');
        return { ...this.cache.data, _cached: true, _stale: true, _error: e.message };
      }
      return {
        resumoExecutivo: "Erro ao gerar Relatorio Executivo.",
        fortaleza: "Servidor detectou falha na comunicacao com a IA.",
        fraqueza: "Causa base: " + e.message,
        acao: "Verifique a chave GROQ_API_KEY no .env e reinicie o backend."
      };
    }
  }

  async generateAttackGraph() {
    if (this.attackGraphCache && (Date.now() - this.attackGraphCache.timestamp) < this.CACHE_TTL) {
      console.log('Mytchi AI: Retornando attack graph do cache.');
      return { ...this.attackGraphCache.data, _cached: true, _cachedAt: new Date(this.attackGraphCache.timestamp).toISOString() };
    }

    const vulnerabilidades = await prisma.vulnerability.findMany({
      where: {
        status: { notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] },
        criticidade: { in: ['EXTREMA', 'CRITICA', 'ALTA', 'MEDIA'] }
      },
      select: {
        codigoInterno: true,
        jiraKey: true,
        titulo: true,
        criticidade: true,
        status: true,
        squad: true,
        ativo: true,
        sistema: true,
        cwe: true,
        owaspCategory: true,
        impacto: true,
        descricaoExecutiva: true,
        recomendacao: true,
        diasEmAberto: true,
        sla: true,
        reincidencia: true,
      }
    });

    if (!process.env.GROQ_API_KEY) {
      return { scenarios: [], error: 'GROQ_API_KEY nao configurada.' };
    }

    if (vulnerabilidades.length < 2) {
      return { scenarios: [], message: 'Menos de 2 vulnerabilidades ativas para gerar Attack Graph.' };
    }

    const byAsset: Record<string, typeof vulnerabilidades> = {};
    for (const v of vulnerabilidades) {
      const key = v.ativo || v.sistema || 'Sem Ativo';
      if (!byAsset[key]) byAsset[key] = [];
      byAsset[key].push(v);
    }

    const assetsWithMultiple = Object.entries(byAsset).filter(([, vulns]) => vulns.length >= 2);

    if (assetsWithMultiple.length === 0) {
      return { scenarios: [], message: 'Nenhum ativo com 2+ vulnerabilidades para gerar cenario de ataque.' };
    }

    const vulnData = assetsWithMultiple.map(([asset, vulns]) => ({
      asset,
      squad: vulns[0].squad,
      vulnerabilities: vulns.map(v => ({
        key: v.jiraKey || v.codigoInterno,
        titulo: v.titulo,
        criticidade: v.criticidade,
        cwe: v.cwe,
        impacto: v.impacto ? v.impacto.substring(0, 300) : null,
        diasEmAberto: v.diasEmAberto,
        recomendacao: v.recomendacao ? v.recomendacao.substring(0, 200) : null,
      }))
    }));

    const systemPrompt = `Voce e a "Mytchi AI", CISO virtual da CredSystem (instituicao financeira).

REGRAS ABSOLUTAS - QUEBRE QUALQUER UMA E O OUTPUT SERA REJEITADO:
1. Use APENAS as vulnerabilidades listadas abaixo. NAO invente CVEs, CWEs, falhas ou codigos.
2. Cada no do grafo com tipo "entry" ou "exploit" DEVE referenciar um codigo real da lista (ex: VUL-394).
3. O impacto final (no tipo "impact") DEVE ser EXATAMENTE uma destas categorias:
   "Fraude Financeira", "Multa LGPD/Regulatoria", "Indisponibilidade de Servico", "Dano Reputacional"
4. NAO invente cenarios que nao podem ser logicamente derivados das vulnerabilidades fornecidas.
5. Cada cenario deve ter entre 2 e 6 nos (entry/exploit) mais 1 no de impact.
6. As edges devem explicar em 1 frase curta COMO a exploracao de um no leva ao proximo.

TAREFA: Para cada ativo que tenha 2+ vulns, gere UM cenario de ataque mostrando como as vulns podem ser ENCADEADAS para causar dano financeiro/regulatorio a CredSystem.

Formato JSON EXATO (devolva APENAS o JSON puro, sem markdown, sem texto extra):
{
  "scenarios": [
    {
      "id": "scenario-1",
      "title": "Nome descritivo do cenario de ataque",
      "asset": "Nome do ativo (exatamente como na lista)",
      "squad": "Nome da squad responsavel",
      "riskLevel": "CRITICO|ALTO|MEDIO",
      "impactCategory": "Uma das 4 categorias fixas",
      "description": "Resumo executivo do cenario em 2 linhas max",
      "nodes": [
        { "id": "n1", "vulnKey": "VUL-XXX", "label": "Titulo curto da vuln", "type": "entry", "criticidade": "EXTREMA" },
        { "id": "n2", "vulnKey": "VUL-YYY", "label": "Titulo curto", "type": "exploit", "criticidade": "ALTA" },
        { "id": "n3", "vulnKey": null, "label": "Categoria de Impacto", "type": "impact", "criticidade": null }
      ],
      "edges": [
        { "source": "n1", "target": "n2", "label": "Como A leva a B" },
        { "source": "n2", "target": "n3", "label": "Como B causa o impacto" }
      ],
      "recommendation": "Acao corretiva especifica referenciando os codigos das vulns"
    }
  ]
}`;

    try {
      console.log("Mytchi AI: Gerando Attack Graph com Groq...");
      let text = await this.callLLM(systemPrompt, `VULNERABILIDADES REAIS DO AMBIENTE CREDSYSTEM:\n${JSON.stringify(vulnData, null, 2)}`);
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text);
      this.attackGraphCache = { data: parsed, timestamp: Date.now() };
      return { ...parsed, _cached: false };
    } catch (e: any) {
      console.error("LLM Attack Graph Error:", e.message);
      if (this.attackGraphCache) {
        return { ...this.attackGraphCache.data, _cached: true, _stale: true, _error: e.message };
      }
      return { scenarios: [], error: 'Erro ao gerar Attack Graph: ' + e.message };
    }
  }
}
