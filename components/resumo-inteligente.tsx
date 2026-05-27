"use client"

import { useState, useEffect } from "react"
import { Sparkles, RefreshCw, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { authHeaders } from "@/lib/auth"

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

interface PortfolioMatch {
  codigoInterno: string
  titulo: string
  criticidade: string
  ativo: string
  score: number
}

const CACHE_KEY = "aisec_resumo_inteligente"
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

/**
 * Resumo Inteligente — card destacado no Dashboard que usa HackBot + LPC
 * pra gerar 1 parágrafo do estado atual do portfólio + próxima melhor ação.
 *
 * Eco do "Resumo inteligente Sentrybots" do Hitss DevSecOps Hub.
 */
export function ResumoInteligente() {
  const [loading, setLoading] = useState(true)
  const [resumo, setResumo] = useState<string>("")
  const [matches, setMatches] = useState<PortfolioMatch[]>([])
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchResumo = async (force = false) => {
    // Cache hit
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { ts, resumo: cachedResumo, matches: cachedMatches } = JSON.parse(cached)
          if (Date.now() - ts < CACHE_TTL) {
            setResumo(cachedResumo)
            setMatches(cachedMatches || [])
            setGeneratedAt(ts)
            setLoading(false)
            return
          }
        }
      } catch {}
    }

    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${apiUrl()}/api/llm/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content:
              "Gere um RESUMO INTELIGENTE do estado atual do portfólio de vulnerabilidades AISEC em 1 parágrafo (3-4 frases). " +
              "Cite quantidade de vulns ativas, principais categorias OWASP, ativos mais pressionados, " +
              "e termine com uma sugestão de PRÓXIMA AÇÃO específica citando VUL-CXA-XXXX. " +
              "Tom executivo, direto, sem listas — texto corrido para um card de dashboard. Máx 400 chars.",
          }],
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Falha ao gerar resumo")
      const text = data.message || ""
      const pcMatches = (data.portfolioContext?.matches || []) as PortfolioMatch[]
      setResumo(text)
      setMatches(pcMatches.slice(0, 4))
      const ts = Date.now()
      setGeneratedAt(ts)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts, resumo: text, matches: pcMatches.slice(0, 4) }))
      } catch {}
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResumo()
  }, [])

  return (
    <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-purple-500/[0.04] to-sky-500/[0.04] p-5 mb-6 overflow-hidden">
      {/* Glow decorations */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-purple-500/30 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-300/80">
                Resumo inteligente AISEC
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                IA · LPC
              </span>
            </div>
            <h2 className="text-base font-bold mt-0.5">Estado do portfólio · próxima ação</h2>
          </div>
          <button
            onClick={() => fetchResumo(true)}
            disabled={loading}
            title="Re-gerar resumo"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-background/50 hover:bg-muted transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>

        {loading && !resumo && (
          <div className="space-y-2">
            <div className="h-3 bg-muted/30 rounded animate-pulse w-full" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-11/12" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-2/3" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300/90">{error}</div>
        )}

        {!loading && resumo && (
          <>
            <p className="text-sm leading-relaxed text-foreground/90">{resumo}</p>

            {matches.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-500/15 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-bold">
                  Vulns citadas:
                </span>
                {matches.map((m) => (
                  <Link
                    key={m.codigoInterno}
                    href="/vulnerabilidades"
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition"
                    title={`${m.titulo} · ${m.criticidade}`}
                  >
                    {m.codigoInterno}
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      m.criticidade === "CRITICA" ? "bg-red-500" :
                      m.criticidade === "ALTA" ? "bg-amber-500" :
                      m.criticidade === "MEDIA" ? "bg-yellow-500" : "bg-emerald-500"
                    }`} />
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <div className="text-[10px] text-muted-foreground">
                {generatedAt && `Gerado ${Math.round((Date.now() - generatedAt) / 60000)}min atrás · `}
                Content Created By/With Use of AI · Unisys AI P1.0
              </div>
              <Link
                href="/inteligencia"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
              >
                Abrir HackBot <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
