/**
 * Forge — Code Modernization Assistant.
 *
 * Recebe código legado (COBOL, ASP.NET Framework / VB.NET / WebForms) e devolve:
 *  - versão equivalente em ASP.NET Core / C# moderno
 *  - testes unitários xUnit
 *  - diff de segurança (vulns corrigidas + introduzidas/atenção)
 *  - mapa de pontos refatorados (controle SDL CIWEB aplicado)
 *
 * Compliance Unisys AI P1.0:
 *  - Assistive only — dev faz review obrigatório antes de merge
 *  - Output rotulado "Content Created By/With Use of AI"
 *  - Não submete código proprietário Caixa a provider external sem CISO opt-in
 */

import { LlmService } from './llm.service';

export type LegacyLang = 'cobol' | 'aspnet-framework' | 'vb-net' | 'webforms' | 'classic-asp' | 'auto';

export interface ForgeInput {
  sourceCode: string;
  legacyLang: LegacyLang;
  targetFramework?: 'aspnet-core-8' | 'aspnet-core-6';
  contexto?: string;
  withTests?: boolean;
}

export interface ForgeResult {
  detectedLang: string;
  targetFramework: string;
  modernizedCode: string;
  unitTests: string;
  securityDiff: Array<{
    type: 'fixed' | 'introduced' | 'attention';
    title: string;
    legacyPattern?: string;
    modernPattern?: string;
    owasp?: string;
    cwe?: string;
    description: string;
  }>;
  refactoringMap: Array<{
    section: string;
    legacyApproach: string;
    modernApproach: string;
    sdlControl?: string;
    rationale: string;
  }>;
  caveats: string[];
  reviewChecklist: string[];
  _provider?: string;
  _model?: string;
}

export class ForgeService {
  constructor(private llm: LlmService) {}

  async modernize(input: ForgeInput): Promise<ForgeResult> {
    const lang = input.legacyLang === 'auto' ? this.detectLang(input.sourceCode) : input.legacyLang;
    const target = input.targetFramework || 'aspnet-core-8';

    const systemPrompt = `Você é o Forge — assistente de modernização de código legado para a Unisys/Caixa.

ENTRADA: snippet de código legado (${lang}).
SAÍDA: equivalente em ${target} (.NET 8 / C# 12) + testes xUnit + diff de segurança + mapa de refactoring.

REGRAS:
- pt-BR técnico.
- Mantenha equivalência funcional.
- Aplique SDL CIWEB Caixa: prepared statements, autorização server-side, encoding, HttpOnly cookies, validação de input.
- Use padrões idiomáticos modernos: minimal API ou Controllers, dependency injection, async/await, Entity Framework Core, ILogger, IOptions, ProblemDetails.
- Mapeie cada ponto refatorado para o controle SDL aplicável (OWASP, ASVS, CWE).
- Identifique vulnerabilidades corrigidas (SQLi, XSS, IDOR, weak crypto) e qualquer ponto que precise atenção pós-migração.
- Testes xUnit cobrindo happy path + 2 edge cases mínimos.
- NÃO invente APIs. Se o código legado tem dependência externa proprietária, deixe ${'`'}TODO Caixa-specific${'`'} no lugar.
- NÃO autorize merge sozinho — dev sempre revisa.

Devolva APENAS JSON puro (sem markdown):
{
  "detectedLang": "cobol|aspnet-framework|vb-net|webforms|classic-asp",
  "targetFramework": "${target}",
  "modernizedCode": "código C# completo entre triple backticks",
  "unitTests": "código xUnit entre triple backticks",
  "securityDiff": [
    {
      "type": "fixed|introduced|attention",
      "title": "Nome curto",
      "legacyPattern": "Padrão legado (ex: SqlCommand com concat)",
      "modernPattern": "Padrão moderno (ex: SqlParameter)",
      "owasp": "Ex: A03:2021",
      "cwe": "Ex: CWE-89",
      "description": "Detalhe técnico"
    }
  ],
  "refactoringMap": [
    {
      "section": "Nome do bloco (ex: Validação de input)",
      "legacyApproach": "Como o legado fazia",
      "modernApproach": "Como o moderno faz",
      "sdlControl": "Controle SDL CIWEB aplicado",
      "rationale": "Por quê"
    }
  ],
  "caveats": ["Limitação ou TODO 1", "Limitação 2"],
  "reviewChecklist": ["O que o dev precisa verificar manualmente"]
}`;

    const userMessage = `LINGUAGEM DETECTADA/INFORMADA: ${lang}
CONTEXTO ADICIONAL: ${input.contexto || 'nenhum'}
INCLUIR TESTES UNITÁRIOS xUnit: ${input.withTests !== false ? 'sim' : 'não'}

CÓDIGO LEGADO:
\`\`\`${lang}
${input.sourceCode}
\`\`\`

Modernize para ${target}. Gere modernizedCode + unitTests + securityDiff + refactoringMap + caveats + reviewChecklist.`;

    let text = await this.llm.callPublic(systemPrompt, userMessage);
    text = text.replace(/```json/g, '').replace(/```\s*$/g, '').trim();
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : text);
    return parsed as ForgeResult;
  }

  private detectLang(code: string): string {
    const c = code.toLowerCase();
    if (/identification\s+division|procedure\s+division|working-storage|perform\s+until/.test(c)) return 'cobol';
    if (/<%@\s*page|<asp:|runat="server"|codebehind=/.test(c)) return 'webforms';
    if (/<%\s|response\.write|<script\s+runat=/.test(c)) return 'classic-asp';
    if (/imports\s+system|dim\s+\w+\s+as\s+|end\s+sub|end\s+function/.test(c)) return 'vb-net';
    if (/using\s+system\.web|httpcontext\.current|webconfigurationmanager/.test(c)) return 'aspnet-framework';
    return 'aspnet-framework';
  }
}
