/**
 * Burp Zekrom ↔ Checklist OWASP — heurísticas client-side de cobertura.
 *
 * Lê requests importados do Burp (salvos em localStorage chave aisec_burp_history)
 * e mapeia para item IDs do checklist OWASP WSTG via regex em URL/params/payloads/headers.
 *
 * Nada vai pra IA — tudo determinístico no browser pra resposta instantânea.
 */

export interface BurpRequest {
  method: string
  url: string                       // path + query
  fullUrl?: string                  // com host
  paramNames: string[]              // nomes de query + body params
  paramValues: string[]             // valores brutos (pra detectar payloads)
  status?: number
  headers?: Record<string, string>
}

export interface CoverageEvidence {
  itemId: string                    // ID do checklist item (ex: "iv-sqli-types")
  reason: string                    // por que matchou
  count: number                     // quantos requests baterem essa regra
  samples: Array<{ method: string; url: string; snippet: string }>
}

export interface CoverageStats {
  totalRequests: number
  uniqueEndpoints: number
  importedAt: string
  itemsCovered: number
}

/** Salva no localStorage e dispara storage event pra outras tabs */
export function saveBurpHistory(requests: BurpRequest[], meta?: { source?: string }): void {
  if (typeof window === "undefined") return
  const payload = {
    importedAt: new Date().toISOString(),
    source: meta?.source || "manual",
    requests,
  }
  localStorage.setItem("aisec_burp_history", JSON.stringify(payload))
}

export function loadBurpHistory(): { importedAt: string; source: string; requests: BurpRequest[] } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("aisec_burp_history")
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function clearBurpHistory(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("aisec_burp_history")
}

/* ============================================================================
   Regras heurísticas — cada regra mapeia BurpRequest → item do checklist OWASP
   ============================================================================ */

interface Rule {
  itemId: string
  test: (r: BurpRequest) => string | null   // retorna razão ou null
}

const RULES: Rule[] = [
  // ===== SQL Injection =====
  { itemId: "iv-sqli-types",
    test: (r) => r.paramValues.some((v) => /'\s*(or|and|union)\s|sleep\s*\(|--\s|\bxp_cmdshell\b/i.test(v)) ? "payload SQLi clássico em parâmetro" : null },
  { itemId: "iv-sqli-blind",
    test: (r) => r.paramValues.some((v) => /sleep\s*\(\s*\d+|benchmark\s*\(/i.test(v)) ? "payload SQLi time-based" : null },
  { itemId: "iv-sqli-auth",
    test: (r) => /\/(login|signin|auth)/i.test(r.url) && r.paramValues.some((v) => /'\s*or\s+'?1'?\s*=\s*'?1|admin'\s*--/i.test(v)) ? "payload SQLi em endpoint de auth" : null },

  // ===== XSS =====
  { itemId: "iv-xss-reflected",
    test: (r) => r.paramValues.some((v) => /<script[^>]*>|onerror\s*=|onload\s*=|<svg[^>]*on|javascript:/i.test(v)) ? "payload XSS em parâmetro refletido" : null },
  { itemId: "iv-xss-dom",
    test: (r) => r.paramValues.some((v) => /#.*<script|innerHTML|document\.write/i.test(v)) ? "padrão DOM XSS no fragmento/parâmetro" : null },

  // ===== CSRF =====
  { itemId: "se-csrf-token",
    test: (r) => {
      if (!["POST", "PUT", "DELETE", "PATCH"].includes(r.method.toUpperCase())) return null
      const h = Object.fromEntries(Object.entries(r.headers || {}).map(([k, v]) => [k.toLowerCase(), v]))
      const hasCsrf = h["x-csrf-token"] || h["x-xsrf-token"] || h["csrf-token"] || h["x-csrftoken"]
      const hasOriginRef = h["origin"] || h["referer"]
      return !hasCsrf ? `${r.method} state-changing sem header CSRF token` : (!hasOriginRef ? `${r.method} sem Origin/Referer` : null)
    },
  },

  // ===== IDOR / BOLA =====
  { itemId: "id-idor",
    test: (r) => r.method.toUpperCase() === "GET" && /\/\d{2,}(?:\/|$|\?)/.test(r.url) ? "GET com ID numérico exposto no path" : null },
  { itemId: "az-bola",
    test: (r) => /\/api\//i.test(r.url) && /\/\d{2,}|\/[a-f0-9-]{8,}/i.test(r.url) ? "endpoint API com identifier no path" : null },
  { itemId: "az-idor-tricks",
    test: (r) => /\?(user_?id|account|owner|tenant)=/i.test(r.url) ? "ID de usuário/tenant em query param" : null },

  // ===== Open Redirect =====
  { itemId: "cs-redirect",
    test: (r) => /[?&](redirect|next|url|return|callback|continue|dest|destination)=/i.test(r.url) ? "parâmetro de redirect detectado" : null },

  // ===== Path Traversal / LFI =====
  { itemId: "az-traversal-os",
    test: (r) => r.paramValues.some((v) => /\.\.\/|\.\.\\|\/etc\/passwd|\\windows\\win/i.test(v)) ? "payload path traversal clássico" : null },
  { itemId: "az-traversal-enc",
    test: (r) => r.paramValues.some((v) => /%2e%2e%2f|%252e%252e|\.\.%c0%af/i.test(v)) ? "payload traversal URL-encoded" : null },
  { itemId: "az-lfi",
    test: (r) => r.paramValues.some((v) => /file:\/\/|php:\/\/|expect:\/\//i.test(v)) ? "payload LFI/wrapper" : null },

  // ===== SSRF =====
  { itemId: "iv-ssrf",
    test: (r) => r.paramValues.some((v) => /(localhost|127\.0\.0\.1|169\.254\.169\.254|0\.0\.0\.0|metadata\.google\.|file:\/\/|gopher:\/\/)/i.test(v)) ? "payload SSRF (interno/metadata/gopher)" : null },

  // ===== Command Injection =====
  { itemId: "iv-cmd",
    test: (r) => r.paramValues.some((v) => /[;|`&]|\$\(|&&|\|\||`\w/i.test(v) && v.length > 3) ? "payload com metacaracteres shell" : null },

  // ===== JWT =====
  { itemId: "au-jwt-alg",
    test: (r) => {
      const auth = Object.entries(r.headers || {}).find(([k]) => k.toLowerCase() === "authorization")?.[1]
      if (!auth || !String(auth).toLowerCase().startsWith("bearer ")) return null
      const token = String(auth).split(" ")[1]
      const parts = token?.split(".")
      if (parts?.length === 3) {
        try {
          const h = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")))
          if (h.alg === "none" || h.alg === "None") return "JWT com alg=none detectado"
        } catch {}
        return "JWT Bearer testado em request"
      }
      return null
    },
  },
  { itemId: "au-jwt-claims",
    test: (r) => Object.entries(r.headers || {}).some(([k, v]) => k.toLowerCase() === "authorization" && String(v).startsWith("Bearer ey")) ? "JWT enviado — validar claims (iss/aud/exp)" : null },

  // ===== Brute force / lockout =====
  { itemId: "au-lockout",
    test: (r) => /\/(login|signin|auth)/i.test(r.url) && r.method.toUpperCase() === "POST" ? "POST em endpoint de auth — testar lockout" : null },
  { itemId: "ot-rate",
    test: (r) => /\/(login|otp|password|reset|2fa)/i.test(r.url) ? "endpoint sensível — verificar rate-limit" : null },

  // ===== BAC =====
  { itemId: "id-roles",
    test: (r) => /\/(admin|management|manager|root|sudo|internal|backoffice)/i.test(r.url) ? "endpoint administrativo acessado" : null },
  { itemId: "az-vertical",
    test: (r) => /\/admin/i.test(r.url) ? "candidato a privilege escalation vertical" : null },
  { itemId: "az-bfla",
    test: (r) => r.method.toUpperCase() === "DELETE" || /\/(delete|remove|destroy)/i.test(r.url) ? "operação destrutiva — verificar autorização" : null },

  // ===== Mass Assignment =====
  { itemId: "iv-mass-assignment",
    test: (r) => ["POST", "PUT", "PATCH"].includes(r.method.toUpperCase()) && r.paramNames.some((n) => /\b(role|isadmin|admin|owner|balance|saldo|tier|premium|verified)\b/i.test(n)) ? "body POST contém campo sensível" : null },

  // ===== Header injection / CRLF =====
  { itemId: "iv-hhi",
    test: (r) => r.paramValues.some((v) => /[\r\n]|%0d%0a|%0a/i.test(v)) ? "payload com CRLF detectado" : null },
  { itemId: "iv-hpp",
    test: (r) => {
      const dup = r.paramNames.filter((n, i) => r.paramNames.indexOf(n) !== i)
      return dup.length > 0 ? `parâmetros duplicados: ${dup.slice(0, 3).join(", ")}` : null
    },
  },

  // ===== Recon items (sempre acionados quando há tráfego suficiente) =====
  { itemId: "ig-source",
    test: (r) => r.method.toUpperCase() === "GET" && /\.html?$|\/$|\/index/i.test(r.url) ? "HTML root acessado" : null },
  { itemId: "ig-headers",
    test: (r) => Object.keys(r.headers || {}).length > 0 ? "headers HTTP capturados" : null },
  { itemId: "ig-paths",
    test: (r) => r.status === 404 || r.status === 403 ? `resposta ${r.status} — útil pra discovery` : null },

  // ===== CORS =====
  { itemId: "cf-cors",
    test: (r) => Object.entries(r.headers || {}).some(([k]) => k.toLowerCase() === "origin") ? "header Origin enviado — testar CORS" : null },
  { itemId: "cs-cors",
    test: (r) => Object.entries(r.headers || {}).some(([k]) => k.toLowerCase() === "origin") ? "Origin header presente" : null },

  // ===== Methods =====
  { itemId: "cf-methods",
    test: (r) => ["OPTIONS", "TRACE", "CONNECT"].includes(r.method.toUpperCase()) ? `método ${r.method} usado — verificar se deveria estar habilitado` : null },

  // ===== API recon =====
  { itemId: "ig-api-spec",
    test: (r) => /\/(openapi|swagger|api-docs|graphql)(\.json|\.yaml|$)/i.test(r.url) ? "spec da API acessada" : null },
  { itemId: "ig-api-versions",
    test: (r) => /\/api\/v\d+\//i.test(r.url) ? "endpoint versionado /v{N}/ acessado" : null },

  // ===== Numeric tampering (business logic) =====
  { itemId: "bl-numeric",
    test: (r) => r.paramValues.some((v) => /^-?\d+$/.test(v) && (parseInt(v, 10) < 0 || parseInt(v, 10) > 999999)) ? "valor numérico fora de faixa típica" : null },
  { itemId: "bl-tamper",
    test: (r) => r.paramNames.some((n) => /\b(price|valor|amount|quantity|qty)\b/i.test(n)) ? "campo financeiro/quantidade no body" : null },
]

/** Roda todas as regras contra o histórico e devolve evidências agrupadas por itemId. */
export function computeCoverage(history: BurpRequest[]): { evidences: CoverageEvidence[]; stats: CoverageStats } {
  const map = new Map<string, CoverageEvidence>()
  for (const r of history) {
    for (const rule of RULES) {
      const reason = rule.test(r)
      if (!reason) continue
      let ev = map.get(rule.itemId)
      if (!ev) {
        ev = { itemId: rule.itemId, reason, count: 0, samples: [] }
        map.set(rule.itemId, ev)
      }
      ev.count++
      if (ev.samples.length < 3) {
        ev.samples.push({
          method: r.method,
          url: r.url,
          snippet: r.paramValues.find((v) => /['"<>;|`]/.test(v)) || `${r.paramNames.slice(0, 3).join(", ")}`,
        })
      }
    }
  }
  const evidences = Array.from(map.values()).sort((a, b) => b.count - a.count)
  const uniqueEndpoints = new Set(history.map((r) => `${r.method} ${r.url.split("?")[0]}`)).size
  return {
    evidences,
    stats: {
      totalRequests: history.length,
      uniqueEndpoints,
      importedAt: new Date().toISOString(),
      itemsCovered: evidences.length,
    },
  }
}

/** Gera Markdown de evidência metodológica pronto pra colar em descrição/relatório. */
export function generateEvidenceMarkdown(opts: {
  evidences: CoverageEvidence[]
  stats: CoverageStats
  itemsLookup: Map<string, { text: string; category: string; ref?: string }>
  notableGaps?: string[]
}): string {
  const { evidences, stats, itemsLookup, notableGaps = [] } = opts
  const date = new Date(stats.importedAt).toLocaleString("pt-BR")

  let md = `## Cobertura metodológica OWASP — pentest AISEC\n\n`
  md += `**Fonte:** Burp Zekrom (export importado em ${date})\n`
  md += `**Volume:** ${stats.totalRequests} requests · ${stats.uniqueEndpoints} endpoints únicos\n`
  md += `**Cobertura:** ${stats.itemsCovered} controles OWASP WSTG com evidência\n\n`

  md += `### Testes cobertos com evidência\n\n`
  if (evidences.length === 0) {
    md += `_Nenhum item do checklist matchou com o tráfego importado. Considere ampliar o escopo do Burp._\n\n`
  } else {
    for (const e of evidences) {
      const item = itemsLookup.get(e.itemId)
      const label = item ? `${item.category} · ${item.text}` : e.itemId
      const ref = item?.ref ? ` (${item.ref})` : ""
      md += `- ✓ **${e.itemId}**${ref} — ${label}\n`
      md += `  └ ${e.count} request${e.count > 1 ? "s" : ""} · ${e.reason}\n`
    }
    md += `\n`
  }

  if (notableGaps.length > 0) {
    md += `### Gaps notáveis (sem evidência no histórico)\n\n`
    for (const id of notableGaps) {
      const item = itemsLookup.get(id)
      if (!item) continue
      md += `- ○ **${id}** — ${item.category} · ${item.text}\n`
    }
    md += `\n`
  }

  md += `---\n`
  md += `_Gerado automaticamente pelo AISEC · Burp Zekrom ↔ Checklist OWASP._\n`
  md += `_Cobertura é heurística (regex em URL/params/payloads/headers). Pentester valida manualmente._\n`
  return md
}

/** Lista de items que costumam ser críticos — usados como notableGaps quando não cobertos. */
export const NOTABLE_ITEMS = [
  "se-csrf-token", "au-jwt-alg", "iv-ssrf", "iv-cmd", "az-traversal-os",
  "id-idor", "iv-mass-assignment", "cs-redirect", "au-lockout", "iv-sqli-types",
]
