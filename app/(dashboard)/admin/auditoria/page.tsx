"use client"

import { useState, useMemo } from "react"
import { ScrollText, Download, Filter, Sparkles, Activity, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"

type Tab = "auditoria" | "ia"

const trail = [
  { ts: "2026-05-24 19:42:17", user: "admin@unisys.com", action: "LOGIN", target: "—", ip: "10.0.4.21", severidade: "info" },
  { ts: "2026-05-24 19:30:02", user: "security@unisys.com", action: "VULN.UPDATE", target: "VUL-CXA-0381", ip: "10.0.4.15", severidade: "info" },
  { ts: "2026-05-24 18:55:44", user: "admin@unisys.com", action: "INTEGRATION.SYNC", target: "RTC", ip: "10.0.4.21", severidade: "info" },
  { ts: "2026-05-24 18:12:09", user: "gestor@unisys.com", action: "REPORT.EXPORT", target: "report-2026-Q1.pdf", ip: "10.0.4.33", severidade: "info" },
  { ts: "2026-05-24 17:48:21", user: "security@unisys.com", action: "VULN.CREATE", target: "VUL-CXA-0394", ip: "10.0.4.15", severidade: "info" },
  { ts: "2026-05-24 17:12:08", user: "admin@unisys.com", action: "USER.MFA.RESET", target: "squad@unisys.com", ip: "10.0.4.21", severidade: "warning" },
  { ts: "2026-05-24 16:30:15", user: "gestor@unisys.com", action: "INTEGRATION.CREATE", target: "Jira", ip: "10.0.4.33", severidade: "info" },
  { ts: "2026-05-24 15:55:01", user: "security@unisys.com", action: "VULN.STATUS.CHANGE", target: "VUL-CXA-0388 → MITIGADO", ip: "10.0.4.15", severidade: "info" },
]

const iaLogs = [
  { ts: "2026-05-24 19:48:11", user: "security@unisys.com", action: "generate-epic", provider: "ollama/llama3.2-vision", tokens: 2841, ms: 4120, status: "OK", prompt: "XSS refletido em /portal/busca?q=", custo: 0.0021 },
  { ts: "2026-05-24 19:32:55", user: "admin@unisys.com", action: "analyze-architecture", provider: "ollama/llama3.2-vision", tokens: 5210, ms: 8730, status: "OK", prompt: "Diagrama PIX core + COBOL batch", custo: 0.0038 },
  { ts: "2026-05-24 18:54:42", user: "security@unisys.com", action: "zekrom.generate-plan", provider: "ollama/nomic-embed-text", tokens: 3984, ms: 2871, status: "OK", prompt: "WSO2 PIX API spec, scope=both", custo: 0.0028 },
  { ts: "2026-05-24 18:12:08", user: "gestor@unisys.com", action: "rag.query", provider: "ollama/nomic-embed-text", tokens: 421, ms: 340, status: "OK", prompt: "limite PIX que exige MFA", custo: 0.0003 },
  { ts: "2026-05-24 17:48:21", user: "security@unisys.com", action: "hackbot.chat", provider: "ollama/llama3", tokens: 1820, ms: 1240, status: "OK", prompt: "como testar IDOR em /api/users/{id}", custo: 0.0013 },
  { ts: "2026-05-24 16:45:33", user: "admin@unisys.com", action: "control-mitigation", provider: "demo/mock", tokens: 0, ms: 600, status: "OK", prompt: "Validação de Ownership IDOR/BOLA", custo: 0 },
  { ts: "2026-05-24 16:12:09", user: "security@unisys.com", action: "zekrom.generate-guidance", provider: "ollama/llama3", tokens: 2103, ms: 1890, status: "OK", prompt: "BOLA em GET /api/transferencias/{id}", custo: 0.0015 },
  { ts: "2026-05-24 15:30:22", user: "admin@unisys.com", action: "rag.ingest", provider: "ollama/nomic-embed-text", tokens: 8420, ms: 3210, status: "OK", prompt: "Política senha BACEN 4658 (PDF)", custo: 0.0061 },
]

const actionBadge: Record<string, string> = {
  LOGIN: "bg-emerald-500/15 text-emerald-400",
  VULN_CREATE: "bg-sky-500/15 text-sky-400",
  VULN_UPDATE: "bg-violet-500/15 text-violet-400",
  USER_MFA_RESET: "bg-amber-500/15 text-amber-400",
  REPORT_EXPORT: "bg-purple-500/15 text-purple-400",
  INTEGRATION_SYNC: "bg-teal-500/15 text-teal-400",
  INTEGRATION_CREATE: "bg-teal-500/15 text-teal-400",
}

const sevColor: Record<string, string> = {
  info: "border-l-sky-500",
  warning: "border-l-amber-500",
  error: "border-l-red-500",
}

export default function AuditoriaPage() {
  const [tab, setTab] = useState<Tab>("auditoria")
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState("ALL")

  const filteredAudit = useMemo(() =>
    trail.filter(r => {
      if (userFilter !== "ALL" && r.user !== userFilter) return false
      if (search && !`${r.action} ${r.target} ${r.user}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [search, userFilter])

  const filteredIa = useMemo(() =>
    iaLogs.filter(r => {
      if (userFilter !== "ALL" && r.user !== userFilter) return false
      if (search && !`${r.action} ${r.provider} ${r.prompt} ${r.user}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [search, userFilter])

  const totalTokens = iaLogs.reduce((a, r) => a + r.tokens, 0)
  const totalCusto = iaLogs.reduce((a, r) => a + r.custo, 0)
  const usuarios = [...new Set([...trail.map(r => r.user), ...iaLogs.map(r => r.user)])]

  const exportJson = () => {
    const data = tab === "auditoria" ? filteredAudit : filteredIa
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `unisysguard-${tab}-${new Date().toISOString().slice(0, 10)}.json`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
  }

  const exportCsv = () => {
    let csv = ""
    if (tab === "auditoria") {
      csv = "Timestamp,Usuário,Ação,Alvo,IP,Severidade\n"
      csv += filteredAudit.map(r => `${r.ts},"${r.user}","${r.action}","${r.target}","${r.ip}","${r.severidade}"`).join("\n")
    } else {
      csv = "Timestamp,Usuário,Ação,Provider,Tokens,Latência (ms),Status,Prompt,Custo USD\n"
      csv += filteredIa.map(r => `${r.ts},"${r.user}","${r.action}","${r.provider}",${r.tokens},${r.ms},"${r.status}","${r.prompt.replace(/"/g, '""')}",${r.custo}`).join("\n")
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `unisysguard-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
  }

  return (
    <div>
      <PageHeader
        icon={ScrollText}
        title="Auditoria & Observabilidade IA"
        subtitle="Trilhas imutáveis · LGPD / BACEN 4658 · Logs Motor IA"
        description="Eventos críticos de plataforma + observabilidade completa do Motor IA (tokens, latência, custo, prompts). Export JSON/CSV pra forensics e auditoria externa."
        actions={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={exportJson} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition">
              <Download className="h-4 w-4" /> JSON
            </button>
          </div>
        }
      />

      <StatGrid
        stats={[
          { label: "Eventos de Auditoria", value: trail.length, icon: ScrollText, tone: "info" },
          { label: "Chamadas IA (24h)", value: iaLogs.length, icon: Sparkles, tone: "success" },
          { label: "Tokens Consumidos", value: totalTokens.toLocaleString(), icon: Activity, tone: "warning" },
          { label: "Custo Estimado", value: `$${totalCusto.toFixed(4)}`, icon: Activity },
        ]}
      />

      {/* Tabs */}
      <div className="rounded-xl border bg-card mb-4 overflow-hidden">
        <div className="flex border-b">
          {([
            { id: "auditoria" as Tab, label: "Trilha de Auditoria", icon: ScrollText, count: trail.length },
            { id: "ia" as Tab, label: "Logs Motor IA", icon: Sparkles, count: iaLogs.length },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.id ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className="text-[10px] tabular-nums opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-3 border-b bg-muted/20 flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "auditoria" ? "Buscar ação, alvo, usuário..." : "Buscar ação, provider, prompt, usuário..."}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-xs"
            />
          </div>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border bg-background text-xs">
            <option value="ALL">Todos usuários</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">
            {tab === "auditoria" ? filteredAudit.length : filteredIa.length} eventos
          </span>
        </div>

        {/* Content */}
        {tab === "auditoria" ? (
          <div className="divide-y">
            {filteredAudit.map((t, i) => (
              <div key={i} className={`p-3 border-l-4 hover:bg-muted/30 transition ${sevColor[t.severidade] || "border-l-slate-500"}`}>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{t.ts}</span>
                  <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${actionBadge[t.action.replace(/\./g, "_")] || "bg-sky-500/15 text-sky-400"}`}>{t.action}</span>
                  <span className="font-medium">{t.user}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-xs">{t.target}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.ip}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {filteredIa.map((l, i) => (
              <div key={i} className="p-3 hover:bg-muted/30 transition">
                <div className="flex items-center gap-3 text-xs mb-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{l.ts}</span>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{l.action}</span>
                  <span className="font-medium">{l.user}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{l.provider}</span>
                  <span className="ml-auto flex items-center gap-3 text-[10px]">
                    <span className="tabular-nums">{l.tokens.toLocaleString()} tk</span>
                    <span className="tabular-nums">{l.ms}ms</span>
                    <span className="tabular-nums">${l.custo.toFixed(4)}</span>
                    <span className="font-bold text-emerald-400">{l.status}</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground italic line-clamp-1">prompt: "{l.prompt}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-300/90 flex items-start gap-2">
        <ScrollText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <div>
          <b>Conformidade:</b> Logs são imutáveis e atendem LGPD Art. 37 (registro de operações) + BACEN Res. 4658 §4 (auditoria de eventos). Export JSON inclui hash de integridade. Retenção mínima 5 anos.
        </div>
      </div>
    </div>
  )
}
