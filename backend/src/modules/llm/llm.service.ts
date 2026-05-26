import { PrismaClient } from '@prisma/client';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSquadMetadata } from '../analytics/squad-mapping';
import { loadLlmConfig, LlmConfig, UNISYSGUARD_CORE_CONTEXT } from './llm-config';
import { demoRespond } from './demo-provider';

const prisma = new PrismaClient();

export class LlmService {
  private cache: { data: any; timestamp: number } | null = null;
  private attackGraphCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /** Public wrapper so other skills (e.g. Zekrom) can call the configured LLM without re-implementing provider routing. */
  async callPublic(systemPrompt: string, userMessage: string): Promise<string> {
    return this.callLLM(systemPrompt, userMessage);
  }

  /** Public entrypoint. Prepends the UnisysGuard core context once, then routes. */
  private async callLLM(systemPrompt: string, userMessage: string): Promise<string> {
    const full = `${UNISYSGUARD_CORE_CONTEXT}\n\n---\nINSTRUÇÕES DA FEATURE ATUAL:\n${systemPrompt}`;
    return this.callLLMRaw(full, userMessage);
  }

  /** Provider routing without prepending core context. Used internally when context was already prepended. */
  private async callLLMRaw(systemPrompt: string, userMessage: string): Promise<string> {
    const config = loadLlmConfig();

    if (config.provider === 'demo') {
      return demoRespond(systemPrompt, userMessage);
    }

    if (!config.apiKey && config.provider !== 'ollama') {
      throw new Error(`API Key não configurada para ${config.provider}. Configure em Configurações → Integrações → IA.`);
    }

    switch (config.provider) {
      case 'groq':
        return this.callGroq(config, systemPrompt, userMessage);
      case 'openai':
        return this.callOpenAI(config, systemPrompt, userMessage);
      case 'anthropic':
        return this.callAnthropic(config, systemPrompt, userMessage);
      case 'google':
        return this.callGoogle(config, systemPrompt, userMessage);
      case 'ollama':
        return this.callOllama(config, systemPrompt, userMessage);
      case 'github':
        return this.callGithub(config, systemPrompt, userMessage);
      case 'deepseek':
        return this.callDeepSeek(config, systemPrompt, userMessage);
      default:
        throw new Error(`Provider desconhecido: ${config.provider}`);
    }
  }

  /**
   * DeepSeek — OpenAI-compatible API at https://api.deepseek.com/v1
   * External provider — CISO opt-in obrigatório por estar fora de jurisdição Unisys-approved.
   */
  private async callDeepSeek(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`DeepSeek error ${r.status}: ${err}`);
    }
    const data: any = await r.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Resposta vazia do DeepSeek');
    return text;
  }

  /**
   * GitHub Models — Unisys-approved provider, OpenAI-compatible API.
   * Endpoint: https://models.inference.ai.azure.com
   * Auth: GitHub PAT with `models:read` scope.
   */
  private async callGithub(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = config.baseUrl || 'https://models.inference.ai.azure.com';
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`GitHub Models error ${r.status}: ${errText}`);
    }
    const data: any = await r.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Resposta vazia do GitHub Models');
    return text;
  }

  private async callGroq(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const client = new Groq({ apiKey: config.apiKey });
    const response = await client.chat.completions.create({
      model: config.model,
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

  private async callOpenAI(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const client = new OpenAI({ apiKey: config.apiKey });
    const response = await client.chat.completions.create({
      model: config.model,
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

  private async callAnthropic(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = response.content[0];
    if (block.type !== 'text' || !block.text) throw new Error('Resposta vazia da IA');
    return block.text;
  }

  private async callGoogle(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model, systemInstruction: systemPrompt });
    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    if (!text) throw new Error('Resposta vazia da IA');
    return text;
  }

  private async callOllama(config: LlmConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const data: any = await response.json();
    return data.message?.content || '';
  }

  // Vision-capable call. Falls back to text-only for providers without vision.
  private async callLLMWithImage(
    systemPrompt: string,
    userMessage: string,
    imageBase64: string | null,
    imageMime: string | null,
  ): Promise<string> {
    const config = loadLlmConfig();

    if (config.provider === 'demo') {
      return demoRespond(systemPrompt, userMessage + (imageBase64 ? '\n[imagem fornecida — demo provider ignora]' : ''));
    }

    // Prepend UnisysGuard core context for vision calls too
    systemPrompt = `${UNISYSGUARD_CORE_CONTEXT}\n\n---\nINSTRUÇÕES DA FEATURE ATUAL:\n${systemPrompt}`;

    if (!imageBase64 || !imageMime) {
      // Already prepended — call raw routing to avoid double-prepend
      return this.callLLMRaw(systemPrompt, userMessage);
    }
    const dataUrl = `data:${imageMime};base64,${imageBase64}`;

    if (config.provider === 'openai' && config.apiKey) {
      const client = new OpenAI({ apiKey: config.apiKey });
      const r = await client.chat.completions.create({
        model: config.model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: dataUrl } },
            ] as any,
          },
        ],
      });
      return r.choices[0]?.message?.content || '';
    }

    if (config.provider === 'anthropic' && config.apiKey) {
      const client = new Anthropic({ apiKey: config.apiKey });
      const r = await client.messages.create({
        model: config.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageMime as any, data: imageBase64 } },
              { type: 'text', text: userMessage },
            ] as any,
          },
        ],
      });
      const block = r.content[0] as any;
      return block?.text || '';
    }

    if (config.provider === 'google' && config.apiKey) {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({ model: config.model, systemInstruction: systemPrompt });
      const r = await model.generateContent([
        { inlineData: { data: imageBase64, mimeType: imageMime } },
        userMessage,
      ] as any);
      return r.response.text();
    }

    if (config.provider === 'ollama') {
      const baseUrl = config.baseUrl || 'http://localhost:11434';
      const r = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage, images: [imageBase64] },
          ],
        }),
      });
      if (!r.ok) throw new Error(`Ollama vision error: ${r.status}`);
      const data: any = await r.json();
      return data.message?.content || '';
    }

    if (config.provider === 'github' && config.apiKey) {
      // GitHub Models supports vision via OpenAI-compatible image_url with data URL.
      const baseUrl = config.baseUrl || 'https://models.inference.ai.azure.com';
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userMessage },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });
      if (!r.ok) throw new Error(`GitHub Models vision error: ${r.status} ${await r.text()}`);
      const data: any = await r.json();
      return data.choices?.[0]?.message?.content || '';
    }

    // Provider without vision (e.g. Groq) — degrade to text-only via raw call (context already prepended)
    return this.callLLMRaw(
      systemPrompt,
      userMessage + '\n\n[NOTA: Imagem fornecida ignorada — provider atual não suporta vision. Configure OpenAI/Anthropic/Gemini/Ollama-vision em Configurações.]',
    );
  }

  async generateEpic(input: {
    alvo: string;
    descricao: string;
    tipo: 'WEB' | 'API';
    imageBase64: string | null;
    imageMime: string | null;
  }) {
    const config = loadLlmConfig();
    if (!config.apiKey && config.provider !== 'ollama') {
      return { error: 'IA não configurada. Vá em Configurações → Integrações → IA.' };
    }

    const systemPrompt = `Você é o UnisysGuard, especialista em pentest Web e API que escreve épicos RTC para a Caixa Econômica Federal.

Sua tarefa: a partir de uma evidência (print da PoC) + alvo + descrição breve do pentester, gerar um épico RTC completo e técnico.

REGRAS:
- Português pt-BR formal-técnico, sem gírias.
- Use APENAS o que está descrito + visível na imagem. Não invente CVEs, CWEs ou impactos que não derivem da evidência.
- Descreva impacto no negócio bancário (PIX, transferência, dados de cliente, LGPD, BACEN 4658).
- Mitigação prática, citando controle (input validation, autorização server-side, etc).
- Classifique OWASP corretamente: ${input.tipo === 'API' ? 'OWASP API Security Top 10 2023' : 'OWASP Web Top 10 2021'}.
- Criticidade: CRITICA, ALTA, MEDIA ou BAIXA.

Devolva APENAS o JSON puro, sem markdown:
{
  "titulo": "[Tipo Vuln] Alvo - Resumo curto (max 100 chars)",
  "criticidade": "CRITICA|ALTA|MEDIA|BAIXA",
  "owasp": "Ex: A01:2021 Broken Access Control | API1:2023 BOLA",
  "endpoint": "URL/endpoint exato afetado",
  "descricaoTecnica": "Descrição técnica detalhada do que foi explorado, passos da PoC, payload usado.",
  "impacto": "Impacto no negócio bancário Caixa. Quantifique quando possível (acesso a N contas, perda financeira potencial, etc).",
  "mitigacao": "Recomendação técnica concreta. Cite controle, framework e exemplo.",
  "riscos": "Riscos residuais e cenários de escalação se não corrigir."
}`;

    const userMessage = `ALVO: ${input.alvo}
TIPO: ${input.tipo}
DESCRIÇÃO BREVE DO PENTESTER: ${input.descricao}

${input.imageBase64 ? 'EVIDÊNCIA: a imagem anexa mostra a PoC. Analise-a para enriquecer a descrição técnica.' : 'EVIDÊNCIA: nenhuma imagem anexada — baseie-se apenas na descrição.'}`;

    try {
      let text = await this.callLLMWithImage(systemPrompt, userMessage, input.imageBase64, input.imageMime);
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text);
      return { ...parsed, _provider: config.provider, _model: config.model };
    } catch (e: any) {
      return { error: 'Erro ao gerar épico: ' + e.message };
    }
  }

  async analyzeArchitecture(input: {
    contexto: string;
    imageBase64: string | null;
    imageMime: string | null;
  }) {
    const config = loadLlmConfig();
    if (!config.apiKey && config.provider !== 'ollama') {
      return { error: 'IA não configurada. Vá em Configurações → Integrações → IA.' };
    }
    if (!input.imageBase64) {
      return { error: 'Faça upload do diagrama de arquitetura.' };
    }

    const systemPrompt = `Você é o UnisysGuard, arquiteto de segurança especialista em STRIDE para sistemas bancários da Caixa Econômica Federal.

Sua tarefa: analisar um diagrama de arquitetura (foto/print) e produzir:
1. Componentes identificados no diagrama.
2. Ameaças STRIDE por componente (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
3. Árvore de ataque concreta mostrando como uma cadeia de exploração levaria a impacto bancário.

REGRAS:
- Use APENAS componentes visíveis na imagem.
- Cada ameaça deve ter título técnico curto + descrição + mitigação.
- Árvore de ataque deve ter de 3 a 6 nós, encadeando entry → exploit → impacto.
- Impacto deve ser bancário concreto (fraude PIX, vazamento LGPD, indisponibilidade, etc).
- pt-BR técnico.

Devolva APENAS JSON puro:
{
  "resumo": "Resumo executivo da arquitetura e principal risco identificado (2-3 frases)",
  "componentes": [
    {
      "nome": "Nome do componente visível",
      "descricao": "Função técnica",
      "ameacas": [
        { "stride": "S|T|R|I|D|E", "titulo": "Titulo curto", "descricao": "Detalhe", "mitigacao": "Controle recomendado" }
      ]
    }
  ],
  "attackTree": {
    "raiz": "Impacto final (ex: 'Fraude PIX em massa')",
    "nos": [
      { "id": "n1", "tipo": "entry", "titulo": "Ponto de entrada", "componente": "Nome componente", "tecnica": "Como ataca" },
      { "id": "n2", "tipo": "exploit", "titulo": "Movimentação lateral", "componente": "Nome componente", "tecnica": "Como escala" },
      { "id": "n3", "tipo": "impact", "titulo": "Impacto final", "componente": "Nome componente", "tecnica": "Como concretiza" }
    ],
    "arestas": [
      { "de": "n1", "para": "n2", "como": "Como passa de A para B" },
      { "de": "n2", "para": "n3", "como": "Como concretiza o impacto" }
    ],
    "mitigacaoChave": "Controle único que quebra a cadeia toda se aplicado"
  },
  "vulnerabilidadesDestaque": [
    { "titulo": "Nome curto", "componente": "Onde", "severidade": "CRITICA|ALTA|MEDIA|BAIXA", "descricao": "Detalhe técnico", "owasp": "Ex: API1:2023 ou A01:2021" }
  ],
  "mitigacoesPrioritarias": [
    { "titulo": "Ação curta", "componente": "Onde aplicar", "esforco": "BAIXO|MEDIO|ALTO", "impacto": "ALTO|MEDIO|BAIXO", "comoFazer": "Passo concreto" }
  ],
  "dicas": [
    "Dica prática 1 (curta)",
    "Dica prática 2",
    "Dica prática 3"
  ]
}`;

    const userMessage = `CONTEXTO ADICIONAL DO PENTESTER: ${input.contexto || 'nenhum'}

Analise o diagrama anexo aplicando STRIDE rigorosamente. Considere que é uma arquitetura da Caixa Econômica Federal — alvos típicos: PIX, transferências, dados pessoais (LGPD), batch COBOL, mainframe Z.`;

    try {
      let text = await this.callLLMWithImage(systemPrompt, userMessage, input.imageBase64, input.imageMime);
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text);
      return { ...parsed, _provider: config.provider, _model: config.model };
    } catch (e: any) {
      return { error: 'Erro ao analisar arquitetura: ' + e.message };
    }
  }

  async generateAnalysis() {
    if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_TTL) {
      console.log('EpicVuln AI: Retornando resultado do cache.');
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
        status: true,
        squad: true,
        sistema: true,
        ativo: true,
        owaspCategory: true,
        diasEmAberto: true,
        reincidencia: true,
        sla: true,
        responsavel: true,
        cwe: true,
      }
    });

    const activeCount = vulnerabilidades.length;
    const config = loadLlmConfig();

    if (!config.apiKey && config.provider !== 'ollama') {
      return {
        resumoExecutivo: "Configuração Pendente: IA não configurada.",
        fortaleza: "Nenhum provider de IA está configurado.",
        fraqueza: "Sem a API Key, o relatório C-Level gerativo fica desligado.",
        acao: "Vá em Configurações → Integrações → Inteligência Artificial e configure seu provider."
      };
    }

    this.cache = null;

    // 1. Risk portfolio data
    let riskData: any = null;
    try {
      const riskService = new (await import('../risk/risk.service')).RiskService();
      riskData = await riskService.getPortfolioRisk();
    } catch {}

    // 2. DORA metrics
    let doraData: any = null;
    try {
      const reportsService = new (await import('../reports/reports.service')).ReportsService();
      doraData = await reportsService.getDoraMetrics();
    } catch {}

    // 3. Assets with business criticality
    const assets = await prisma.asset.findMany({
      select: {
        id: true, name: true, type: true, businessCriticality: true, status: true,
        _count: { select: { vulnerabilities: true } }
      }
    });

    // 4. Company profile from SystemSettings
    let companyProfile: any = null;
    try {
      const setting = await prisma.systemSettings.findUnique({ where: { key: 'company_profile' } });
      if (setting) companyProfile = JSON.parse(setting.value);
    } catch {}

    if (activeCount === 0) {
      return {
        resumoExecutivo: `O ambiente da ${companyProfile?.name || 'empresa'} esta impecavel. Nenhuma vulnerabilidade pendente localizada.`,
        fortaleza: "Operacao livre de gaps listados no banco de dados. Equipe atuou em 100% das falhas.",
        fraqueza: "Nenhum vetor de vulnerabilidade aberto no momento.",
        acao: "Manter governanca e rotina atual de monitoramento diario.",
        topVulnerabilities: [],
        maturidadeGaps: [],
        culturaInsights: "Cultura de seguranca exemplar. Continue assim!",
        attackPath: []
      };
    }

    const severityOrder: Record<string, number> = { 'CRITICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BAIXA': 3 };
    const sortedVulns = vulnerabilidades.sort((a, b) => {
      const orderA = severityOrder[a.criticidade.toUpperCase()] ?? 99;
      const orderB = severityOrder[b.criticidade.toUpperCase()] ?? 99;
      return orderA - orderB;
    }).slice(0, 30);

    const enrichedVulns = sortedVulns.map(v => ({
      ...v,
      metadata: v.squad ? getSquadMetadata(v.squad) : null
    }));

    // 5. History events for trend analysis
    let recentHistory: any[] = [];
    try {
      recentHistory = await prisma.vulnerabilityHistory.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: { eventType: true, createdAt: true, newValue: true }
      });
    } catch {}

    // 6. Squad performance aggregation
    const squadPerformance: Record<string, { total: number; criticas: number; corrigidas: number; reincidentes: number; diasTotal: number }> = {};
    for (const v of vulnerabilidades) {
      const s = v.squad || 'Sem Squad';
      if (!squadPerformance[s]) squadPerformance[s] = { total: 0, criticas: 0, corrigidas: 0, reincidentes: 0, diasTotal: 0 };
      squadPerformance[s].total++;
      if (['CRITICA'].includes(v.criticidade.toUpperCase())) squadPerformance[s].criticas++;
      if (v.reincidencia > 0) squadPerformance[s].reincidentes++;
      squadPerformance[s].diasTotal += v.diasEmAberto || 0;
    }

    // Count closed vulns per squad
    const closedVulns = await prisma.vulnerability.findMany({
      where: { status: { in: ['CONCLUIDO', 'FECHADO', 'MITIGADO'] } },
      select: { squad: true }
    });
    for (const v of closedVulns) {
      const s = v.squad || 'Sem Squad';
      if (squadPerformance[s]) squadPerformance[s].corrigidas++;
    }

    // 7. CWE/OWASP category distribution
    const cweCounts: Record<string, number> = {};
    const owaspCounts: Record<string, number> = {};
    for (const v of vulnerabilidades) {
      if (v.owaspCategory) owaspCounts[v.owaspCategory] = (owaspCounts[v.owaspCategory] || 0) + 1;
    }

    // 8. SLA breach details
    const slaBreach = vulnerabilidades.filter(v => {
      if (!v.sla) return false;
      return new Date(v.sla) < new Date();
    });

    const fullContext = {
      vulnerabilidades: enrichedVulns,
      riskPortfolio: riskData ? {
        score: riskData.score,
        totalAssets: riskData.totalAssets,
        totalOpenVulns: riskData.totalOpenVulns,
      } : null,
      doraMetrics: doraData ? {
        mttrOverall: doraData.mttr?.overall,
        mttrBySeverity: doraData.mttr?.bySeverity,
        mttrBySquad: doraData.mttr?.bySquad,
        reincidenciaRate: doraData.reincidencia?.overall,
        taxaCorrecao30d: doraData.taxaCorrecao?.last30d?.rate,
        taxaCorrecao90d: doraData.taxaCorrecao?.last90d?.rate,
        slaComplianceOverall: doraData.slaCompliance?.overall,
        slaBySquad: doraData.slaCompliance?.bySquad,
      } : null,
      assets: assets.map(a => ({
        name: a.name, type: a.type,
        businessCriticality: a.businessCriticality,
        vulnCount: a._count.vulnerabilities,
      })),
      companyProfile: companyProfile,
      squadPerformance,
      owaspDistribution: owaspCounts,
      slaBreachCount: slaBreach.length,
      slaBreachBySeverity: {
        critica: slaBreach.filter(v => v.criticidade.toUpperCase() === 'CRITICA').length,
        alta: slaBreach.filter(v => v.criticidade.toUpperCase() === 'ALTA').length,
      },
      recentActivityCount: recentHistory.length,
    };

    const contextData = JSON.stringify(fullContext);

    const systemPrompt = `Voce e o motor de inteligencia do EpicVuln, atuando como CISO virtual e Head de Application Security.

CONTEXTO DA EMPRESA:
${companyProfile ? `
- Nome: ${companyProfile.name || 'Nao configurado'}
- Setor: ${companyProfile.sector || 'Financeiro'}
- Descricao: ${companyProfile.description || 'Instituicao financeira'}
- Tamanho: ${companyProfile.size || 'Nao informado'}
` : '- Empresa nao configurada (perfil padrao)'}

METRICAS OPERACIONAIS:
${riskData ? `- Risk Score do Portfolio: ${riskData.score}/100 (0=seguro, 100=critico)` : ''}
${doraData?.mttr ? `- MTTR Global: ${doraData.mttr.overall} dias` : ''}
${doraData?.mttr?.bySeverity ? `- MTTR por Severidade: ${JSON.stringify(doraData.mttr.bySeverity)}` : ''}
${doraData?.mttr?.bySquad ? `- MTTR por Squad: ${JSON.stringify(doraData.mttr.bySquad)}` : ''}
${doraData?.reincidencia ? `- Taxa de Reincidencia: ${doraData.reincidencia.overall}%` : ''}
${doraData?.taxaCorrecao?.last30d ? `- Taxa de Correcao (30d): ${doraData.taxaCorrecao.last30d.rate}% (${doraData.taxaCorrecao.last30d.fechadas} fechadas / ${doraData.taxaCorrecao.last30d.abertas} abertas)` : ''}
${doraData?.taxaCorrecao?.last90d ? `- Taxa de Correcao (90d): ${doraData.taxaCorrecao.last90d.rate}%` : ''}
${doraData?.slaCompliance ? `- SLA Compliance Global: ${doraData.slaCompliance.overall}%` : ''}
${doraData?.slaCompliance?.bySquad ? `- SLA por Squad: ${JSON.stringify(doraData.slaCompliance.bySquad)}` : ''}
- SLA Vencidos: ${slaBreach.length} (Criticas: ${slaBreach.filter(v => v.criticidade.toUpperCase() === 'CRITICA').length})

PERFORMANCE POR SQUAD:
${Object.entries(squadPerformance).map(([squad, data]) => `- ${squad}: ${data.total} ativas, ${data.criticas} criticas, ${data.corrigidas} corrigidas, ${data.reincidentes} reincidentes, MTTR medio: ${data.total > 0 ? Math.round(data.diasTotal / data.total) : 0}d`).join('\n')}

DISTRIBUICAO OWASP:
${Object.entries(owaspCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cat, count]) => `- ${cat}: ${count}`).join('\n') || '- Sem categorias OWASP'}

ATIVOS CRITICOS:
${assets.filter(a => (a.businessCriticality as string) === 'CRITICAL' || (a.businessCriticality as string) === 'HIGH').map(a => `- ${a.name} (${a.type}, criticidade: ${a.businessCriticality}, ${a._count.vulnerabilities} vulns)`).join('\n') || '- Nenhum ativo de alta criticidade cadastrado'}

TODOS OS ATIVOS:
${assets.map(a => `- ${a.name} (${a.type}, ${a.businessCriticality || 'sem criticidade'}, ${a._count.vulnerabilities} vulns)`).join('\n') || '- Nenhum ativo'}

DIRETRIZES DE ANALISE:
1. PRECISAO: Use APENAS dados reais fornecidos. Nunca invente metricas, codigos ou valores. Se um dado nao esta disponivel, diga "dado nao disponivel".
2. FOCO SETORIAL: Adapte a analise ao setor da empresa. Financeiro: fraude, PCI-DSS, LGPD, BACEN. Saude: HIPAA, dados pacientes. Varejo: PCI, e-commerce.
3. METRICAS CONCRETAS: Sempre cite numeros reais (Risk Score X/100, MTTR de Y dias, Z vulns criticas).
4. SQUADS: Compare performance entre squads usando MTTR, SLA compliance e taxa de reincidencia reais.
5. ATIVOS: Priorize falhas em ativos com criticidade CRITICAL e HIGH. APIs sao altissima criticidade.
6. PROJECAO MATEMATICA: Use taxa de correcao e MTTR reais para projetar risco futuro. Se taxa de correcao 30d < 50%, o backlog esta crescendo.
7. CULTURA DEVSECOPS: Avalie maturidade com base em: reincidencia (alta = falta de root cause analysis), SLA (baixo = falta de prioridade), MTTR (alto = processo lento).
8. KILL CHAIN: Crie uma cadeia de ataque REALISTA baseada nas vulns reais. Cada "node" DEVE ser uma vulnerabilidade real do payload.

Gere EXATAMENTE um objeto JSON com estas chaves:

{
  "resumoExecutivo": "Veredito direto com metricas concretas. Risk Score, MTTR, SLA compliance, vulns criticas. Maximo 5 frases como se estivesse apresentando ao board.",
  "fortaleza": "Squads e areas com melhor performance. Cite metricas REAIS de MTTR, SLA, taxa de correcao. Destaque o que esta funcionando bem.",
  "fraqueza": "Maior perigo atual. Quantifique: X vulns criticas em ativos de alta criticidade, Y SLAs vencidos, squad Z com MTTR de W dias. Impacto potencial de negocio.",
  "acao": "Plano pratico com 3-5 acoes PRIORIZADAS e ESPECIFICAS. Cada acao deve ter: o que fazer, qual squad, qual prazo sugerido. Ex: 'Squad X deve corrigir VUL-123 (API exposta) em 7 dias'.",
  "topVulnerabilities": [
    {"codigo": "VUL-XXX", "motivo": "Impacto especifico no negocio com metrica", "ativoAfetado": "Nome real do ativo", "diasAberto": 45}
  ],
  "maturidadeGaps": [
    {"squad": "Nome real", "gap": "Problema especifico com metrica real", "lider": "Responsavel", "mttr": 45, "slaCompliance": 60}
  ],
  "projecaoRisco": {
    "dias30": "Cenario em 30 dias baseado na taxa de correcao atual. Quantifique: se continuar assim, havera X vulns criticas. Cite compliance em risco.",
    "dias90": "Cenario em 90 dias. Impacto regulatorio, financeiro e operacional projetado com base nos dados."
  },
  "culturaInsights": "Analise profunda da maturidade DevSecOps. Compare squads, cite metricas DORA, identifique padroes de reincidencia e gaps de processo.",
  "evolucao": [
    {"mes": "Jan", "fechadas": 15, "abertas": 5}
  ],
  "attackPath": [
    {"node": "Titulo REAL de uma vulnerabilidade do payload", "escalatesTo": "Consequencia REAL e especifica para o negocio"}
  ]
}

REGRAS ABSOLUTAS:
- DEVOLVA APENAS O JSON PURO. SEM TEXTO EXTRA. SEM markdown. SEM \`\`\`.
- Use SOMENTE dados reais do payload. Nunca invente codigos VUL, nomes de squad ou metricas.
- O attackPath DEVE ter entre 3 e 5 etapas, cada uma referenciando uma vulnerabilidade REAL.
- topVulnerabilities deve ter entre 3 e 5 itens, priorizados por risco de negocio.
- maturidadeGaps deve ter entre 2 e 4 itens com metricas reais.`;

    try {
      const cfg = loadLlmConfig();
      console.log(`EpicVuln AI: Iniciando analise com ${cfg.provider}/${cfg.model}...`);
      let text = await this.callLLM(systemPrompt, `Dados completos de seguranca (${activeCount} vulnerabilidades ativas, ${assets.length} ativos, metricas DORA incluidas):\n${contextData}`);
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text);
      console.log("EpicVuln AI: Analise gerada com sucesso. Keys:", Object.keys(parsed));
      this.cache = { data: parsed, timestamp: Date.now() };
      return { ...parsed, _cached: false, _provider: cfg.provider, _model: cfg.model };
    } catch (e: any) {
      console.error("LLM Error:", e.message);
      if (this.cache) {
        console.log('EpicVuln AI: Retornando cache antigo como fallback.');
        return { ...this.cache.data, _cached: true, _stale: true, _error: e.message };
      }
      return {
        resumoExecutivo: "Erro ao gerar Relatório Executivo.",
        fortaleza: "Servidor detectou falha na comunicação com a IA.",
        fraqueza: "Causa base: " + e.message,
        acao: "Verifique as configurações de IA em Configurações → Integrações."
      };
    }
  }

  async generateAttackGraph() {
    if (this.attackGraphCache && (Date.now() - this.attackGraphCache.timestamp) < this.CACHE_TTL) {
      console.log('EpicVuln AI: Retornando attack graph do cache.');
      return { ...this.attackGraphCache.data, _cached: true, _cachedAt: new Date(this.attackGraphCache.timestamp).toISOString() };
    }

    const vulnerabilidades = await prisma.vulnerability.findMany({
      where: {
        status: { notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] },
        criticidade: { in: ['CRITICA', 'ALTA', 'MEDIA'] }
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

    const config = loadLlmConfig();
    if (!config.apiKey && config.provider !== 'ollama') {
      return { scenarios: [], error: 'IA não configurada. Vá em Configurações → Integrações.' };
    }

    if (vulnerabilidades.length < 2) {
      return { scenarios: [], message: 'Menos de 2 vulnerabilidades ativas para gerar Attack Graph.' };
    }

    // Get assets for better context
    const assetsForGraph = await prisma.asset.findMany({
      select: { name: true, type: true, businessCriticality: true },
      where: { vulnerabilities: { some: {} } }
    });

    let companyProfileGraph: any = null;
    try {
      const setting = await prisma.systemSettings.findUnique({ where: { key: 'company_profile' } });
      if (setting) companyProfileGraph = JSON.parse(setting.value);
    } catch {}

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

    const systemPrompt = `Voce e o motor de inteligencia do EpicVuln, CISO virtual e especialista em Application Security.

CONTEXTO: ${companyProfileGraph?.name || 'Empresa'}. ${companyProfileGraph?.description || 'Organizacao com ativos digitais.'}. Setor: ${companyProfileGraph?.sector || 'Nao informado'}.
ATIVOS CADASTRADOS: ${assetsForGraph.map(a => `${a.name} (${a.type}, ${a.businessCriticality})`).join(', ') || 'Nenhum'}

REGRAS ABSOLUTAS:
1. Use APENAS as vulnerabilidades listadas abaixo. NAO invente CVEs, CWEs, falhas ou codigos.
2. Cada no do grafo com tipo "entry" ou "exploit" DEVE referenciar um codigo real da lista.
3. O impacto final DEVE ser EXATAMENTE uma destas categorias:
   "Fraude Financeira", "Multa LGPD/Regulatoria", "Indisponibilidade de Servico", "Dano Reputacional"
4. NAO invente cenarios que nao podem ser derivados das vulnerabilidades fornecidas.
5. Cada cenario deve ter entre 2 e 6 nos (entry/exploit) mais 1 no de impact.

Formato JSON EXATO (devolva APENAS o JSON puro):
{
  "scenarios": [
    {
      "id": "scenario-1",
      "title": "Nome descritivo do cenario",
      "asset": "Nome do ativo",
      "squad": "Nome da squad",
      "riskLevel": "CRITICO|ALTO|MEDIO",
      "impactCategory": "Uma das 4 categorias",
      "description": "Resumo em 2 linhas",
      "nodes": [
        { "id": "n1", "vulnKey": "VUL-XXX", "label": "Titulo curto", "type": "entry", "criticidade": "CRITICA" },
        { "id": "n2", "vulnKey": "VUL-YYY", "label": "Titulo curto", "type": "exploit", "criticidade": "ALTA" },
        { "id": "n3", "vulnKey": null, "label": "Categoria de Impacto", "type": "impact", "criticidade": null }
      ],
      "edges": [
        { "source": "n1", "target": "n2", "label": "Como A leva a B" },
        { "source": "n2", "target": "n3", "label": "Como B causa o impacto" }
      ],
      "recommendation": "Acao corretiva"
    }
  ]
}`;

    try {
      console.log(`EpicVuln AI: Gerando Attack Graph com ${config.provider}/${config.model}...`);
      let text = await this.callLLM(systemPrompt, `VULNERABILIDADES REAIS:\n${JSON.stringify(vulnData, null, 2)}`);
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(text);
      this.attackGraphCache = { data: parsed, timestamp: Date.now() };
      return { ...parsed, _cached: false, _provider: config.provider, _model: config.model };
    } catch (e: any) {
      console.error("LLM Attack Graph Error:", e.message);
      if (this.attackGraphCache) {
        return { ...this.attackGraphCache.data, _cached: true, _stale: true, _error: e.message };
      }
      return { scenarios: [], error: 'Erro ao gerar Attack Graph: ' + e.message };
    }
  }
}
