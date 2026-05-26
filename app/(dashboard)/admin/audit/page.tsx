"use client"

import { useState } from "react"
import {
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
  CircleAlert,
  Download,
  ShieldAlert,
  FileSpreadsheet,
  ListChecks,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { AIDisclosure } from "@/components/ai-disclosure"
import { authHeaders } from "@/lib/auth"

type Norma = "lgpd" | "bacen-4658" | "sdl-ciweb" | "pci-dss" | "asvs"

interface AuditFinding {
  controle: string
  norma: string
  artigo?: string
  status: "OK" | "GAP" | "PARCIAL" | "NA"
  evidencia: string
  vulnsRelacionadas: string[]
  ativosAfetados: string[]
  severidade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
  remediacao: string
  prazoSugerido: string
}

interface AuditResult {
  resumo: {
    totalControles: number
    ok: number
    parcial: number
    gap: number
    naoAplicavel: number
    scoreAderencia: number
  }
  porNorma: Record<string, { total: number; gaps: number; aderencia: number }>
  findings: AuditFinding[]
  riscosCriticos: Array<{ titulo: string; descricao: string; impactoRegulatorio: string }>
  planoRemediacao: Array<{
    ordem: number
    titulo: string
    controle: string
    norma: string
    responsavel: string
    prazo: string
    esforco: "BAIXO" | "MEDIO" | "ALTO"
    impacto: "BAIXO" | "MEDIO" | "ALTO"
  }>
  rotuloAI: string
  _provider?: string
  _model?: string
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

const NORMAS_META: Record<Norma, { label: string; cls: string }> = {
  "lgpd": { label: "LGPD", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  "bacen-4658": { label: "BACEN 4658", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  "sdl-ciweb": { label: "SDL CIWEB", cls: "border-purple-500/40 bg-purple-500/10 text-purple-300" },
  "pci-dss": { label: "PCI-DSS", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  "asvs": { label: "OWASP ASVS", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
}

const statusBadge = (s: "OK" | "GAP" | "PARCIAL" | "NA") =>
  s === "OK" ? <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span> :
  s === "GAP" ? <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> GAP</span> :
  s === "PARCIAL" ? <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 inline-flex items-center gap-1"><CircleAlert className="h-3 w-3" /> PARCIAL</span> :
  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400">N/A</span>

const sevBadge = (s: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA") => {
  const cls = s === "CRITICA" ? "bg-red-500/20 text-red-300" :
              s === "ALTA" ? "bg-amber-500/20 text-amber-300" :
              s === "MEDIA" ? "bg-yellow-500/20 text-yellow-300" :
              "bg-emerald-500/20 text-emerald-300"
  return <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${cls}`}>{s}</span>
}

export default function AuditPage() {
  const [normas, setNormas] = useState<Norma[]>(["lgpd", "bacen-4658", "sdl-ciweb"])
  const [escopoAtivo, setEscopoAtivo] = useState("")
  const [contextoAdicional, setContextoAdicional] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const toggleNorma = (n: Norma) => {
    setNormas((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n])
  }

  const run = async () => {
    if (normas.length === 0) {
      setErr("Selecione ao menos uma norma.")
      return
    }
    setLoading(true)
    setErr(null)
    setResult(null)
    try {
      const r = await fetch(`${apiUrl()}/api/llm/audit/run`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ normas, escopoAtivo: escopoAtivo || undefined, contextoAdicional: contextoAdicional || undefined }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Falha")
      setResult(data)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const exportJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Audit"
        subtitle="Compliance · LGPD · BACEN · SDL CIWEB"
        badge="IA"
        description="Audita aderência aos controles SDL CIWEB Caixa + LGPD + BACEN 4658 + PCI-DSS + OWASP ASVS. Cruza findings ativos com controles esperados, aponta gaps com evidências e gera plano de remediação priorizado."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Input */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Normas no escopo</label>
            <div className="space-y-1.5">
              {(Object.keys(NORMAS_META) as Norma[]).map((n) => (
                <button
                  key={n}
                  onClick={() => toggleNorma(n)}
                  className={`w-full text-left rounded-lg border p-2 text-xs transition flex items-center gap-2 ${
                    normas.includes(n) ? NORMAS_META[n].cls : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  {normas.includes(n) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded border" />}
                  <span className="font-semibold">{NORMAS_META[n].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escopo (ativo opcional)</label>
            <input
              value={escopoAtivo}
              onChange={(e) => setEscopoAtivo(e.target.value)}
              placeholder="Ex: siaci-financeiro-api"
              className="w-full text-xs bg-background border rounded-lg p-2 mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Filtra vulnerabilidades por nome de ativo ou sistema.</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contexto adicional</label>
            <textarea
              value={contextoAdicional}
              onChange={(e) => setContextoAdicional(e.target.value)}
              placeholder="Ex: pré-auditoria externa em junho, foco em LGPD pós-DPO"
              rows={3}
              className="w-full text-xs bg-background border rounded-lg p-2 mt-1 resize-none"
            />
          </div>

          <button
            onClick={run}
            disabled={loading || normas.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Auditando..." : "Rodar auditoria"}
          </button>

          {err && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {err}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="lg:col-span-8 space-y-4">
          {!result && !loading && (
            <div className="rounded-xl border-2 border-dashed border-border bg-card/30 p-12 text-center">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Selecione normas e (opcional) escopo, depois rode a auditoria.
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Audit cruza vulns ativas + ativos com controles regulatórios e devolve plano priorizado.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">Audit em execução...</p>
              <p className="text-[11px] text-muted-foreground mt-1">Carregando portfólio, mapeando controles, gerando findings.</p>
            </div>
          )}

          {result && (
            <>
              {/* Resumo */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Score de aderência: {result.resumo.scoreAderencia}/100</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {result.resumo.totalControles} controles avaliados · {result.resumo.gap} GAP · {result.resumo.parcial} PARCIAL · {result.resumo.ok} OK
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportJson}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-muted/50 text-[11px] font-semibold"
                    >
                      <Download className="h-3 w-3" /> JSON
                    </button>
                    {result._provider && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {result._provider}/{result._model}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score bars */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-center">
                    <div className="text-xl font-bold text-emerald-400">{result.resumo.ok}</div>
                    <div className="text-[9px] uppercase tracking-wider text-emerald-300/70">OK</div>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-center">
                    <div className="text-xl font-bold text-amber-400">{result.resumo.parcial}</div>
                    <div className="text-[9px] uppercase tracking-wider text-amber-300/70">Parcial</div>
                  </div>
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-center">
                    <div className="text-xl font-bold text-red-400">{result.resumo.gap}</div>
                    <div className="text-[9px] uppercase tracking-wider text-red-300/70">Gap</div>
                  </div>
                  <div className="rounded-lg border border-slate-500/30 bg-slate-500/5 p-2 text-center">
                    <div className="text-xl font-bold text-slate-400">{result.resumo.naoAplicavel}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-300/70">N/A</div>
                  </div>
                </div>

                {/* Per norma */}
                <div className="space-y-1.5">
                  {Object.entries(result.porNorma).map(([norma, d]) => (
                    <div key={norma} className="flex items-center gap-2 text-[11px]">
                      <span className="font-semibold w-24 truncate">{norma}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${d.aderencia >= 80 ? "bg-emerald-500" : d.aderencia >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${d.aderencia}%` }}
                        />
                      </div>
                      <span className="font-mono text-muted-foreground w-12 text-right">{d.aderencia}%</span>
                      <span className="text-[10px] text-red-400 w-12 text-right">{d.gaps} gap</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <AIDisclosure />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground font-mono">{result.rotuloAI}</div>
              </div>

              {/* Riscos críticos */}
              {result.riscosCriticos?.length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5" /> Riscos críticos
                  </h3>
                  <div className="space-y-2">
                    {result.riscosCriticos.map((r, i) => (
                      <div key={i} className="rounded-lg border border-red-500/30 bg-background/30 p-3 text-[11px]">
                        <div className="font-semibold text-red-300 mb-1">{r.titulo}</div>
                        <p className="text-foreground/85 mb-1">{r.descricao}</p>
                        <p className="text-[10px] text-red-400/80 italic">Impacto regulatório: {r.impactoRegulatorio}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings */}
              {result.findings?.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Findings ({result.findings.length})
                  </h3>
                  <div className="space-y-2">
                    {result.findings.map((f, i) => (
                      <div key={i} className="rounded-lg border bg-background/50 p-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {statusBadge(f.status)}
                          {sevBadge(f.severidade)}
                          <span className="font-semibold text-xs">{f.controle}</span>
                          <span className="text-[10px] text-muted-foreground">
                            · {f.norma}{f.artigo ? ` · ${f.artigo}` : ""}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono ml-auto">prazo {f.prazoSugerido}</span>
                        </div>
                        <p className="text-[11px] text-foreground/85 mb-1">{f.evidencia}</p>
                        <p className="text-[11px] text-emerald-300/90"><b>Remediação:</b> {f.remediacao}</p>
                        {(f.vulnsRelacionadas?.length > 0 || f.ativosAfetados?.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t">
                            {f.vulnsRelacionadas?.map((v) => (
                              <span key={v} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">{v}</span>
                            ))}
                            {f.ativosAfetados?.map((a) => (
                              <span key={a} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plano remediação */}
              {result.planoRemediacao?.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ListChecks className="h-3.5 w-3.5 text-emerald-400" /> Plano de remediação priorizado
                  </h3>
                  <div className="space-y-2">
                    {result.planoRemediacao.map((p) => (
                      <div key={p.ordem} className="rounded-lg border bg-background/50 p-3 text-[11px] flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">
                          {p.ordem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold mb-0.5">{p.titulo}</div>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                            <span className="font-mono">{p.controle}</span>
                            <span>· {p.norma}</span>
                            <span>· {p.responsavel}</span>
                            <span className="ml-auto text-emerald-400 font-mono">prazo {p.prazo}</span>
                            <span className="text-purple-400 font-mono">esforço {p.esforco}</span>
                            <span className="text-amber-400 font-mono">impacto {p.impacto}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
