/**
 * Live Portfolio Context (LPC) — busca no banco vulnerabilidades ativas
 * relevantes pra uma query/contexto e devolve um bloco pronto pra injetar
 * em system prompt.
 *
 * Princípio: toda chamada IA da plataforma sabe quais vulns existem ATIVAS
 * antes de responder. Sem RAG semântico (sem LLM aqui) — pura busca relacional
 * rankeada por keyword e categoria.
 *
 * Compliance: dados ficam locais. Só o resumo (título + endpoint + payload de
 * evidência + recomendação) vai no prompt — sem PII do cliente final.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PortfolioMatch {
  codigoInterno: string;
  jiraKey: string | null;
  titulo: string;
  criticidade: string;
  owaspCategory: string | null;
  cwe: string | null;
  ativo: string;
  sistema: string;
  endpoint: string | null;
  metodoHttp: string | null;
  parametroAfetado: string | null;
  evidenciaTextual: string | null;
  recomendacao: string | null;
  impacto: string | null;
  status: string;
  score: number;
  matchReasons: string[];
}

export interface PortfolioContextResult {
  matches: PortfolioMatch[];
  total: number;
  query: string;
  promptBlock: string;
}

const STATUS_ACTIVE = ['NOVO', 'ABERTO', 'EM_CORRECAO', 'EM_RETESTE'];

/** Extrai termos de busca relevantes da query. */
function extractKeywords(q: string): {
  vulnCodes: string[];
  owaspIds: string[];
  cwes: string[];
  vulnTypes: string[];
  assets: string[];
  paths: string[];
  generic: string[];
} {
  const text = (q || '').toLowerCase();
  return {
    vulnCodes: Array.from(new Set([...(q || '').matchAll(/(VUL-CXA-\d+|EPICO-\d+)/gi)].map((m) => m[1].toUpperCase()))),
    owaspIds: Array.from(new Set([...(q || '').matchAll(/(?:A\d{2}:\d{4}|API\d+:\d{4})/gi)].map((m) => m[0].toUpperCase()))),
    cwes: Array.from(new Set([...(q || '').matchAll(/CWE-\d+/gi)].map((m) => m[0].toUpperCase()))),
    vulnTypes: [
      ...(/(\bxss\b|cross.site script)/.test(text) ? ['xss'] : []),
      ...(/(\bsqli\b|sql.?injection)/.test(text) ? ['sql injection'] : []),
      ...(/(\bidor\b|insecure direct object)/.test(text) ? ['idor'] : []),
      ...(/(\bbola\b|object.level.auth)/.test(text) ? ['bola'] : []),
      ...(/(\bcsrf\b|cross.site request)/.test(text) ? ['csrf'] : []),
      ...(/(\bssrf\b|server.side request)/.test(text) ? ['ssrf'] : []),
      ...(/(\brce\b|remote code|command inject)/.test(text) ? ['rce', 'command inject'] : []),
      ...(/(\blfi\b|path traversal|directory traversal)/.test(text) ? ['traversal'] : []),
      ...(/(\bjwt\b|alg.none|algorithm confusion)/.test(text) ? ['jwt'] : []),
      ...(/(open.redirect)/.test(text) ? ['redirect'] : []),
      ...(/(mass.assignment)/.test(text) ? ['mass assignment'] : []),
      ...(/(brute.force|credential stuff)/.test(text) ? ['brute', 'auth'] : []),
      ...(/(hardcoded|secret leak|api.key)/.test(text) ? ['hardcoded', 'secret', 'key'] : []),
    ],
    assets: Array.from(new Set([...(q || '').matchAll(/siaci-[a-z0-9-]+/gi)].map((m) => m[0].toLowerCase()))),
    paths: Array.from(new Set([...(q || '').matchAll(/\/(api|portal|admin|auth|usuarios|transferencias|pix|docs|proxy|conta|usuario|debug)\/[a-z0-9_/{}-]*/gi)].map((m) => m[0]))),
    generic: text.split(/[^\w-]+/).filter((w) => w.length >= 4 && !['como','para','sobre','vuln','vulnerabilidade','exploit','testar','endpoint','request','response','headers','payload'].includes(w)).slice(0, 6),
  };
}

/** Busca top-N vulnerabilidades ativas que matcham a query. */
export async function getRelevantPortfolio(
  query: string,
  opts: { topK?: number; minScore?: number; organizationId?: string } = {},
): Promise<PortfolioContextResult> {
  const topK = opts.topK ?? 5;
  const minScore = opts.minScore ?? 1;
  const k = extractKeywords(query);

  // Single broad query — fetch ALL active vulns from org and rank in-memory.
  // Dataset is small (~30) so this is trivially fast.
  const where: any = { status: { in: STATUS_ACTIVE } };
  if (opts.organizationId) where.organizationId = opts.organizationId;

  const all = await prisma.vulnerability.findMany({
    where,
    select: {
      codigoInterno: true, jiraKey: true, titulo: true, criticidade: true,
      owaspCategory: true, cwe: true, ativo: true, sistema: true,
      endpoint: true, metodoHttp: true, parametroAfetado: true,
      evidenciaTextual: true, recomendacao: true, impacto: true, status: true,
      descricaoTecnica: true,
    },
    take: 200,
  });

  const scored: PortfolioMatch[] = all.map((v) => {
    const reasons: string[] = [];
    let score = 0;

    // Code exact match — strongest
    if (k.vulnCodes.includes(v.codigoInterno) || (v.jiraKey && k.vulnCodes.includes(v.jiraKey.toUpperCase()))) {
      score += 100;
      reasons.push(`código exato`);
    }
    // OWASP / CWE exact
    if (v.owaspCategory && k.owaspIds.some((o) => v.owaspCategory!.toUpperCase().includes(o))) {
      score += 25; reasons.push(`OWASP ${v.owaspCategory}`);
    }
    if (v.cwe && k.cwes.some((c) => v.cwe!.toUpperCase().includes(c))) {
      score += 25; reasons.push(`${v.cwe}`);
    }
    // Vuln type keywords match in title/desc
    const blob = `${v.titulo} ${v.descricaoTecnica || ''} ${v.owaspCategory || ''}`.toLowerCase();
    for (const t of k.vulnTypes) {
      if (blob.includes(t)) { score += 15; reasons.push(`tipo "${t}"`); break; }
    }
    // Asset/sistema match
    for (const a of k.assets) {
      if (v.ativo.toLowerCase().includes(a) || (v.sistema || '').toLowerCase().includes(a)) {
        score += 20; reasons.push(`ativo ${v.ativo}`); break;
      }
    }
    // Endpoint path match
    for (const p of k.paths) {
      const ep = (v.endpoint || '').toLowerCase();
      if (ep && (ep.includes(p.toLowerCase()) || p.toLowerCase().includes(ep))) {
        score += 18; reasons.push(`endpoint ${v.endpoint}`); break;
      }
    }
    // Generic keyword overlap with title
    let generics = 0;
    for (const w of k.generic) {
      if (v.titulo.toLowerCase().includes(w)) generics++;
    }
    if (generics > 0) { score += Math.min(generics * 3, 10); reasons.push(`${generics} keyword(s)`); }

    return {
      codigoInterno: v.codigoInterno,
      jiraKey: v.jiraKey,
      titulo: v.titulo,
      criticidade: v.criticidade,
      owaspCategory: v.owaspCategory,
      cwe: v.cwe,
      ativo: v.ativo,
      sistema: v.sistema,
      endpoint: v.endpoint,
      metodoHttp: v.metodoHttp,
      parametroAfetado: v.parametroAfetado,
      evidenciaTextual: v.evidenciaTextual,
      recomendacao: v.recomendacao,
      impacto: v.impacto,
      status: v.status,
      score,
      matchReasons: reasons,
    };
  });

  const matches = scored
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    matches,
    total: matches.length,
    query,
    promptBlock: buildPromptBlock(matches),
  };
}

/** Constrói o bloco de texto pra colar no system prompt. */
function buildPromptBlock(matches: PortfolioMatch[]): string {
  if (matches.length === 0) return '';
  const lines: string[] = [];
  lines.push('─────────────────────────────────────────────────────────');
  lines.push(`PORTFÓLIO ATIVO — ${matches.length} vulnerabilidade(s) relevante(s) cadastrada(s) no AISEC:`);
  lines.push('─────────────────────────────────────────────────────────');
  for (const m of matches) {
    lines.push('');
    lines.push(`[${m.codigoInterno}${m.jiraKey ? ` · ${m.jiraKey}` : ''}] ${m.criticidade} · ${m.status}`);
    lines.push(`Título: ${m.titulo}`);
    if (m.owaspCategory) lines.push(`OWASP: ${m.owaspCategory}${m.cwe ? ` · ${m.cwe}` : ''}`);
    if (m.endpoint) lines.push(`Endpoint: ${m.metodoHttp || ''} ${m.endpoint}${m.parametroAfetado ? ` (param: ${m.parametroAfetado})` : ''}`);
    lines.push(`Ativo/Sistema: ${m.ativo} · ${m.sistema}`);
    if (m.evidenciaTextual) {
      const ev = m.evidenciaTextual.length > 800 ? m.evidenciaTextual.slice(0, 800) + '\n[...evidência truncada — consulte /vulnerabilidades/' + m.codigoInterno + ' pro completo]' : m.evidenciaTextual;
      lines.push(`Evidência/PoC já cadastrada:\n${ev}`);
    }
    if (m.recomendacao) {
      const rec = m.recomendacao.length > 400 ? m.recomendacao.slice(0, 400) + ' [...]' : m.recomendacao;
      lines.push(`Recomendação cadastrada: ${rec}`);
    }
    lines.push(`Match: ${m.matchReasons.join(' · ')} (score ${m.score})`);
  }
  lines.push('─────────────────────────────────────────────────────────');
  lines.push('INSTRUÇÃO: ao responder, PRIORIZE os payloads/PoCs/recomendações já cadastrados acima.');
  lines.push('Cite o código (VUL-CXA-XXXX) quando reusar. Não invente — se o portfólio não cobre, diga que não há vuln cadastrada matchando e gere resposta genérica.');
  lines.push('─────────────────────────────────────────────────────────');
  return lines.join('\n');
}
