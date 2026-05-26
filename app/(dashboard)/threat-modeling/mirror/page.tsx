"use client"

import { useState } from "react"
import {
  Glasses,
  Loader2,
  AlertTriangle,
  Sparkles,
  Upload,
  Database,
  Target,
  Workflow,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  CircleAlert,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { AIDisclosure } from "@/components/ai-disclosure"
import { authHeaders } from "@/lib/auth"

type Framework = "stride" | "pasta" | "linddun"

interface Ameaca {
  categoria: string
  titulo: string
  descricao: string
  mitigacao: string
  referencia?: string
}

interface Componente {
  nome: string
  descricao: string
  ameacas: Ameaca[]
}

interface RagSnippet {
  docName: string
  snippet: string
  similarity: number
}

interface MirrorResult {
  framework: Framework
  ragContext: RagSnippet[]
  resumo: string
  componentes: Componente[]
  attackTree: {
    raiz: string
    nos: Array<{ id: string; tipo: string; titulo: string; componente: string; tecnica: string }>
    arestas: Array<{ de: string; para: string; como: string }>
    mitigacaoChave: string
  }
  mitigacoesPrioritarias: Array<{
    titulo: string
    componente: string
    esforco: "BAIXO" | "MEDIO" | "ALTO"
    impacto: "BAIXO" | "MEDIO" | "ALTO"
    comoFazer: string
    referencia?: string
  }>
  conformidade: Array<{
    norma: string
    requisito: string
    aderencia: "OK" | "GAP" | "PARCIAL"
    evidencia?: string
  }>
  _provider?: string
  _model?: string
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

const FRAMEWORK_META: Record<Framework, { label: string; desc: string; cls: string; cats: string[] }> = {
  stride: { label: "STRIDE", desc: "Spoofing · Tampering · Repudiation · Info Disclosure · DoS · Elevation", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", cats: ["S", "T", "R", "I", "D", "E"] },
  pasta: { label: "PASTA", desc: "Process for Attack Simulation and Threat Analysis · 7 estágios", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300", cats: ["Business", "Technical", "Operational"] },
  linddun: { label: "LINDDUN", desc: "Privacy threats · alinhado a LGPD/GDPR", cls: "border-purple-500/40 bg-purple-500/10 text-purple-300", cats: ["L", "I", "N", "D", "D", "U", "N"] },
}

const aderenciaIcon = (a: "OK" | "GAP" | "PARCIAL") =>
  a === "OK" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
  a === "GAP" ? <XCircle className="h-3.5 w-3.5 text-red-400" /> :
  <CircleAlert className="h-3.5 w-3.5 text-amber-400" />

const aderenciaCls = (a: "OK" | "GAP" | "PARCIAL") =>
  a === "OK" ? "border-emerald-500/30 bg-emerald-500/5" :
  a === "GAP" ? "border-red-500/30 bg-red-500/5" :
  "border-amber-500/30 bg-amber-500/5"

export default function MirrorPage() {
  const [contexto, setContexto] = useState("")
  const [framework, setFramework] = useState<Framework>("stride")
  const [file, setFile] = useState<File | null>(null)
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MirrorResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    if (!contexto.trim()) {
      setErr("Descreva a arquitetura (componentes, fluxos, dados sensíveis).")
      return
    }
    setLoading(true)
    setErr(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append("contexto", contexto)
      fd.append("framework", framework)
      fd.append("topK", String(topK))
      if (file) fd.append("diagrama", file)
      const r = await fetch(`${apiUrl()}/api/llm/mirror/model`, {
        method: "POST",
        credentials: "include",
        headers: { ...authHeaders() },
        body: fd,
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

  return (
    <div>
      <PageHeader
        icon={Glasses}
        title="Mirror"
        subtitle="Threat Modeling com RAG"
        badge="IA"
        description="Aplica STRIDE / PASTA / LINDDUN em arquitetura usando a Base de Conhecimento (LGPD, BACEN, SDL CIWEB, OWASP) via RAG real. Gera ameaças por componente, attack tree, mitigações priorizadas e conformidade."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Input */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Framework</label>
            <div className="space-y-2">
              {(["stride", "pasta", "linddun"] as Framework[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFramework(f)}
                  className={`w-full text-left rounded-lg border p-2.5 transition ${
                    framework === f ? FRAMEWORK_META[f].cls : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="text-xs font-bold">{FRAMEWORK_META[f].label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{FRAMEWORK_META[f].desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contexto da arquitetura</label>
            <textarea
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex: API SIACI de transferência PIX. Frontend Next.js, backend ASP.NET Core, batch COBOL no mainframe Z, autenticação via WSO2 OAuth2. Dados pessoais (CPF, conta) trafegam em todos os fluxos."
              rows={6}
              className="w-full text-xs bg-background border rounded-lg p-2 mt-1 resize-y"
            />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diagrama (opcional)</label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-[11px] w-full"
              />
              {file && <p className="text-[10px] text-emerald-400 mt-1">✓ {file.name}</p>}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top-K RAG</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={10}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs font-mono w-8 text-right">{topK}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Quantos chunks da Base de Conhecimento usar como contexto.</p>
          </div>

          <button
            onClick={run}
            disabled={loading || !contexto.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Modelando..." : `Modelar com ${FRAMEWORK_META[framework].label}`}
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
              <Glasses className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Descreva a arquitetura, escolha framework e (opcional) anexe o diagrama.
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Mirror consulta o RAG, aplica o framework e devolve ameaças, attack tree e conformidade.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">Mirror em ação...</p>
              <p className="text-[11px] text-muted-foreground mt-1">Consultando RAG, identificando componentes, aplicando {FRAMEWORK_META[framework].label}.</p>
            </div>
          )}

          {result && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Glasses className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Threat model · {FRAMEWORK_META[result.framework].label}</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {result.componentes?.length || 0} componentes · {result.ragContext?.length || 0} chunks RAG
                      </p>
                    </div>
                  </div>
                  {result._provider && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      {result._provider}/{result._model}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{result.resumo}</p>
                <div className="mt-3 pt-3 border-t">
                  <AIDisclosure />
                </div>
              </div>

              {/* RAG context */}
              {result.ragContext?.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-2">
                    <Database className="h-3.5 w-3.5" /> Contexto da Base de Conhecimento ({result.ragContext.length})
                  </h3>
                  <div className="space-y-2">
                    {result.ragContext.map((c, i) => (
                      <div key={i} className="rounded-lg border bg-background/50 p-2.5 text-[11px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">RAG#{i + 1} · {c.docName}</span>
                          <span className="text-[10px] font-mono text-emerald-400">sim {c.similarity.toFixed(2)}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed line-clamp-3">{c.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Componentes & ameaças */}
              {result.componentes?.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-emerald-400" /> Componentes & ameaças
                  </h3>
                  <div className="space-y-3">
                    {result.componentes.map((c, i) => (
                      <div key={i} className="rounded-lg border bg-background/50 p-3">
                        <div className="font-semibold text-sm mb-1">{c.nome}</div>
                        <p className="text-[11px] text-muted-foreground mb-2">{c.descricao}</p>
                        <div className="space-y-1.5">
                          {c.ameacas.map((a, j) => (
                            <div key={j} className="rounded border bg-card p-2 text-[11px]">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-wider">
                                  {a.categoria}
                                </span>
                                <span className="font-semibold">{a.titulo}</span>
                                {a.referencia && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">
                                    {a.referencia}
                                  </span>
                                )}
                              </div>
                              <p className="text-foreground/85 mb-1">{a.descricao}</p>
                              <p className="text-emerald-300/90 text-[10px]"><b>Mitigação:</b> {a.mitigacao}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attack Tree */}
              {result.attackTree && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-red-400" /> Attack Tree → {result.attackTree.raiz}
                  </h3>
                  <div className="space-y-2">
                    {result.attackTree.nos.map((n, i) => (
                      <div key={n.id} className={`rounded-lg border p-3 text-[11px] ${
                        n.tipo === "entry" ? "border-sky-500/30 bg-sky-500/5" :
                        n.tipo === "exploit" ? "border-amber-500/30 bg-amber-500/5" :
                        "border-red-500/30 bg-red-500/5"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-background/70 border">
                            {n.tipo}
                          </span>
                          <span className="font-semibold">{n.titulo}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{n.componente}</span>
                        </div>
                        <p className="text-foreground/85">{n.tecnica}</p>
                        {i < result.attackTree.arestas.length && result.attackTree.arestas[i] && (
                          <div className="mt-1.5 pt-1.5 border-t border-dashed text-[10px] text-muted-foreground italic">
                            ↓ {result.attackTree.arestas[i].como}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px]">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-semibold text-emerald-400">Mitigação chave</span>
                    </div>
                    <p className="text-foreground/90">{result.attackTree.mitigacaoChave}</p>
                  </div>
                </div>
              )}

              {/* Mitigações priorizadas */}
              {result.mitigacoesPrioritarias?.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Mitigações priorizadas
                  </h3>
                  <div className="space-y-2">
                    {result.mitigacoesPrioritarias.map((m, i) => (
                      <div key={i} className="rounded-lg border bg-background/50 p-3 text-[11px]">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">{m.titulo}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                            esforço: {m.esforco}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                            impacto: {m.impacto}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{m.componente}</span>
                        </div>
                        <p className="text-foreground/85">{m.comoFazer}</p>
                        {m.referencia && (
                          <p className="text-[10px] text-sky-400 mt-1 font-mono">{m.referencia}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conformidade */}
              {result.conformidade?.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Conformidade regulatória</h3>
                  <div className="space-y-2">
                    {result.conformidade.map((c, i) => (
                      <div key={i} className={`rounded-lg border p-3 text-[11px] ${aderenciaCls(c.aderencia)}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {aderenciaIcon(c.aderencia)}
                          <span className="font-semibold">{c.norma}</span>
                          <span className="text-muted-foreground">· {c.requisito}</span>
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ml-auto ${
                            c.aderencia === "OK" ? "bg-emerald-500/15 text-emerald-400" :
                            c.aderencia === "GAP" ? "bg-red-500/15 text-red-400" :
                            "bg-amber-500/15 text-amber-400"
                          }`}>
                            {c.aderencia}
                          </span>
                        </div>
                        {c.evidencia && <p className="text-foreground/85 mt-1.5">{c.evidencia}</p>}
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
