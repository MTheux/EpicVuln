"use client"

import { useState, useMemo } from "react"
import { ListChecks, Filter, Download, X, Sparkles, Loader2, AlertCircle, Copy, CheckCircle2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"
import { AIDisclosure } from "@/components/ai-disclosure"
import checklist from "@/lib/sdl-checklist.json"
import { authHeaders } from "@/lib/auth"

type Req = {
  id: string
  cat: string
  titulo: string
  owasp: string | null
  asvs: string | null
  cwe: string | null
  sev: string | null
}

const reqs = (checklist as Req[]).filter((r) => !/mobile/i.test(r.cat))

const sevColor: Record<string, string> = {
  Crítico: "bg-red-500/15 text-red-400 border-red-500/30",
  Alto: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Médio: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Baixo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

const catColor: Record<string, string> = {
  "Controle de Acesso": "text-violet-400",
  "Falhas Criptográficas": "text-purple-400",
  "Injeção": "text-red-400",
  "Design Inseguro": "text-pink-400",
  "Configuração Incorreta": "text-orange-400",
  "Componentes Vulneráveis": "text-amber-400",
  "Falhas de Identificação": "text-yellow-400",
  "Integridade de Software": "text-lime-400",
  "Falhas de Log e Monitoramento": "text-emerald-400",
  "SSRF": "text-teal-400",
  "API Security": "text-sky-400",
  "LGPD": "text-blue-400",
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

interface Mitigation {
  descricaoExpandida: string
  codigoMitigacao: string
  comoTestar: string
  errosComuns: string[]
}

export default function ReqsPage() {
  const [sevFilter, setSevFilter] = useState<string>("ALL")
  const [catFilter, setCatFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [selectedReq, setSelectedReq] = useState<Req | null>(null)
  const [mitigation, setMitigation] = useState<Mitigation | null>(null)
  const [loadingMit, setLoadingMit] = useState(false)
  const [errMit, setErrMit] = useState<string | null>(null)
  const [stack, setStack] = useState<"ASP.NET Core / C#" | "Node.js / Express">("ASP.NET Core / C#")
  const [copied, setCopied] = useState(false)

  const categorias = useMemo(() => [...new Set(reqs.map((r) => r.cat))], [])

  const filtered = useMemo(() => {
    return reqs.filter((r) => {
      if (sevFilter !== "ALL" && r.sev !== sevFilter) return false
      if (catFilter !== "ALL" && r.cat !== catFilter) return false
      if (search && !`${r.id} ${r.titulo} ${r.owasp} ${r.cwe}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [sevFilter, catFilter, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Req[]>()
    for (const r of filtered) {
      if (!map.has(r.cat)) map.set(r.cat, [])
      map.get(r.cat)!.push(r)
    }
    return [...map.entries()]
  }, [filtered])

  const stats = useMemo(() => {
    const s = { total: reqs.length, critico: 0, alto: 0, medio: 0, baixo: 0 }
    reqs.forEach((r) => {
      if (r.sev === "Crítico") s.critico++
      else if (r.sev === "Alto") s.alto++
      else if (r.sev === "Médio") s.medio++
      else s.baixo++
    })
    return s
  }, [])

  const openReq = async (r: Req, targetStack: string = stack) => {
    setSelectedReq(r)
    setMitigation(null)
    setErrMit(null)
    setLoadingMit(true)
    try {
      const resp = await fetch(`${apiUrl()}/api/llm/control-mitigation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          id: r.id, titulo: r.titulo, categoria: r.cat,
          owasp: r.owasp, asvs: r.asvs, cwe: r.cwe, sev: r.sev,
          stack: targetStack,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "Falha")
      setMitigation(data)
    } catch (e: any) {
      setErrMit(e.message)
    } finally {
      setLoadingMit(false)
    }
  }

  const switchStack = (s: typeof stack) => {
    setStack(s)
    if (selectedReq) openReq(selectedReq, s)
  }

  const copyCode = () => {
    if (!mitigation) return
    const code = mitigation.codigoMitigacao.replace(/```\w*\n?/g, "").replace(/```\s*$/g, "")
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const exportCsv = () => {
    const header = "ID,Categoria,Título,OWASP,ASVS,CWE,Severidade\n"
    const rows = filtered.map((r) =>
      [r.id, r.cat, r.titulo, r.owasp || "", r.asvs || "", r.cwe || "", r.sev || ""]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "sdl-ciweb-requisitos.csv"
    a.click()
  }

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title="Requisitos de Segurança"
        subtitle="Checklist SDL CIWEB v3.0 — Caixa Econômica Federal"
        description="52 controles derivados do SDL Caixa/Unisys, mapeados a OWASP Web 2021 + API 2023, ASVS e CWE. Clique em qualquer controle para descrição expandida + código de mitigação gerado pelo Motor IA."
        actions={
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <StatGrid
        stats={[
          { label: "Total", value: stats.total, icon: ListChecks },
          { label: "Críticos", value: stats.critico, icon: ListChecks, tone: "danger" },
          { label: "Altos", value: stats.alto, icon: ListChecks, tone: "warning" },
          { label: "Médios + Baixos", value: stats.medio + stats.baixo, icon: ListChecks, tone: "info" },
        ]}
      />

      <div className="rounded-xl border bg-card p-3 mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID, título, OWASP, CWE..."
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border bg-background text-xs"
        />
        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border bg-background text-xs">
          <option value="ALL">Toda Severidade</option>
          <option value="Crítico">Crítico</option>
          <option value="Alto">Alto</option>
          <option value="Médio">Médio</option>
          <option value="Baixo">Baixo</option>
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border bg-background text-xs">
          <option value="ALL">Toda Categoria ({categorias.length})</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {reqs.length}</span>
      </div>

      <div className="space-y-4">
        {grouped.map(([cat, items]) => (
          <div key={cat} className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className={`font-semibold text-sm ${catColor[cat] || "text-foreground"}`}>{cat}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{items.length} controles</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-2 pl-4 font-medium w-20">ID</th>
                  <th className="text-left p-2 font-medium">Controle</th>
                  <th className="text-left p-2 font-medium">OWASP</th>
                  <th className="text-left p-2 font-medium w-24">ASVS</th>
                  <th className="text-left p-2 font-medium w-24">CWE</th>
                  <th className="text-right p-2 pr-4 font-medium w-24">Severidade</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} onClick={() => openReq(r)} className="border-t hover:bg-emerald-500/[0.04] transition cursor-pointer group">
                    <td className="p-2 pl-4 font-mono text-xs font-semibold group-hover:text-emerald-400">{r.id}</td>
                    <td className="p-2 text-xs">{r.titulo}</td>
                    <td className="p-2"><span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">{r.owasp || "—"}</span></td>
                    <td className="p-2 font-mono text-[10px] text-muted-foreground">{r.asvs || "—"}</td>
                    <td className="p-2 font-mono text-[10px] text-muted-foreground">{r.cwe || "—"}</td>
                    <td className="p-2 pr-4 text-right">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${sevColor[r.sev || ""] || ""}`}>
                        {r.sev || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Modal mitigação */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedReq(null)}>
          <div className="bg-card border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b p-5 z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-400">{selectedReq.id}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${sevColor[selectedReq.sev || ""] || ""}`}>
                      {selectedReq.sev}
                    </span>
                    {selectedReq.owasp && <span className="text-[10px] font-mono bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded">{selectedReq.owasp}</span>}
                    {selectedReq.asvs && <span className="text-[10px] font-mono bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded">{selectedReq.asvs}</span>}
                    {selectedReq.cwe && <span className="text-[10px] font-mono bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">{selectedReq.cwe}</span>}
                  </div>
                  <h2 className="text-lg font-bold">{selectedReq.titulo}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedReq.cat}</p>
                </div>
                <button onClick={() => setSelectedReq(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <AIDisclosure purpose="Geração de mitigação técnica (descrição expandida + código) pelo Motor IA" compact={false} />

              {/* Stack selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Stack alvo:</span>
                {(["ASP.NET Core / C#", "Node.js / Express"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => switchStack(s)}
                    disabled={loadingMit}
                    className={`text-[11px] font-semibold px-2 py-1 rounded transition ${stack === s ? "bg-emerald-500 text-white" : "border bg-background hover:bg-muted"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {loadingMit && (
                <div className="rounded-lg border bg-background p-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Motor IA gerando descrição + código de mitigação...</p>
                </div>
              )}

              {errMit && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-3 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errMit}</span>
                </div>
              )}

              {mitigation && (
                <>
                  <Section title="Descrição Expandida" icon={Sparkles}>
                    <p className="text-sm text-foreground/90 leading-relaxed">{mitigation.descricaoExpandida}</p>
                  </Section>

                  <Section title="Código de Mitigação" icon={Sparkles}
                    action={
                      <button onClick={copyCode} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition">
                        {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    }
                  >
                    <pre className="bg-background border rounded-lg p-3 overflow-x-auto text-[11px] font-mono whitespace-pre-wrap">
                      {mitigation.codigoMitigacao.replace(/```\w*\n?/g, "").replace(/```\s*$/g, "")}
                    </pre>
                  </Section>

                  <Section title="Como Testar" icon={Sparkles}>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{mitigation.comoTestar}</p>
                  </Section>

                  {mitigation.errosComuns?.length > 0 && (
                    <Section title="Erros Comuns" icon={AlertCircle}>
                      <ul className="space-y-1.5 text-sm">
                        {mitigation.errosComuns.map((e, i) => (
                          <li key={i} className="flex items-start gap-2 text-foreground/90">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  <div className="text-[10px] text-emerald-400/70 italic pt-2 border-t">
                    Content Created By/With Use of AI · Pentester/Dev valida antes de aplicar · Unisys AI P1.0
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
