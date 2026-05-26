"use client"

import { useState } from "react"
import { GitBranch, RefreshCw, ExternalLink, Code, ShieldAlert, Bug, X, Loader2, CheckCircle2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"

const repos = [
  { nome: "siaci-originacao-frontend", produto: "SIACI — Originação", linguagem: "ASP.NET / C#", branch: "main", vulns: 5, lastScan: "há 2h" },
  { nome: "siaci-originacao-api", produto: "SIACI — Originação", linguagem: "ASP.NET Core", branch: "main", vulns: 6, lastScan: "há 2h" },
  { nome: "siaci-originacao-cobol", produto: "SIACI — Originação", linguagem: "COBOL", branch: "release/2026-Q1", vulns: 4, lastScan: "há 6h" },
  { nome: "siaci-financeiro-api", produto: "SIACI — Financeiro", linguagem: "ASP.NET Core", branch: "main", vulns: 7, lastScan: "há 1h" },
  { nome: "siaci-financeiro-cobol", produto: "SIACI — Financeiro", linguagem: "COBOL", branch: "main", vulns: 4, lastScan: "há 3h" },
  { nome: "siaci-portal-publico", produto: "SIACI — Portais e Serviços", linguagem: "ASP.NET / C#", branch: "main", vulns: 5, lastScan: "há 1d" },
  { nome: "siaci-portal-api", produto: "SIACI — Portais e Serviços", linguagem: "ASP.NET Core", branch: "main", vulns: 4, lastScan: "há 5h" },
  { nome: "siaci-evolucao-lab", produto: "SIACI — Evolução", linguagem: "ASP.NET Core", branch: "develop", vulns: 1, lastScan: "há 30min" },
  { nome: "siaci-shared-components", produto: "SIACI — Recursos e Componentes", linguagem: "ASP.NET / C#", branch: "main", vulns: 1, lastScan: "há 4h" },
]

const linguagemColor: Record<string, string> = {
  "ASP.NET / C#": "bg-violet-500/15 text-violet-400",
  "ASP.NET Core": "bg-purple-500/15 text-purple-400",
  COBOL: "bg-amber-500/15 text-amber-400",
}

export default function RepositoriosPage() {
  const [sonarOpen, setSonarOpen] = useState(false)
  const [sonarUrl, setSonarUrl] = useState("https://sonar.unisys.caixa.gov.br")
  const [sonarToken, setSonarToken] = useState("")
  const [sonarProject, setSonarProject] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [syncOk, setSyncOk] = useState(false)

  const doSync = async () => {
    if (!sonarUrl || !sonarToken) return
    setSyncing(true)
    setSyncOk(false)
    // demo simulation
    setTimeout(() => {
      setSyncing(false)
      setSyncOk(true)
    }, 1500)
  }

  return (
    <div>
      <PageHeader
        icon={GitBranch}
        title="Repositórios"
        subtitle="Inventário técnico via GitLab Caixa + IBM RTC + SonarQube"
        description="Cada repositório é a unidade versionada analisada por scanners. SonarQube é o SAST oficial Unisys/Caixa — sincronize abaixo."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setSonarOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#4E9BCD" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="#4E9BCD"/></svg>
              Sincronizar SonarQube
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition">
              <RefreshCw className="h-4 w-4" /> Sync GitLab/RTC
            </button>
          </div>
        }
      />

      <StatGrid
        stats={[
          { label: "Repositórios", value: repos.length, icon: GitBranch },
          { label: "Linguagens", value: 3, icon: Code, trend: "ASP.NET, C#, COBOL" },
          { label: "Vulnerabilidades", value: repos.reduce((a, r) => a + r.vulns, 0), icon: ShieldAlert, tone: "warning" },
          { label: "Scans Hoje", value: 23, icon: Bug, tone: "info" },
        ]}
      />

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Repositórios sincronizados</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Fontes: GitLab Caixa + IBM RTC + SonarQube</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Repositório</th>
                <th className="text-left p-3 font-medium">Produto</th>
                <th className="text-left p-3 font-medium">Linguagem</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-center p-3 font-medium">Vulns</th>
                <th className="text-right p-3 font-medium">Último Scan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {repos.map((r) => (
                <tr key={r.nome} className="border-t hover:bg-muted/30 transition cursor-pointer">
                  <td className="p-3 font-mono text-xs font-medium">{r.nome}</td>
                  <td className="p-3 text-muted-foreground text-xs">{r.produto}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${linguagemColor[r.linguagem]}`}>
                      {r.linguagem}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{r.branch}</td>
                  <td className="p-3 text-center font-semibold tabular-nums">{r.vulns}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">{r.lastScan}</td>
                  <td className="p-3">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SonarQube sync modal */}
      {sonarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSonarOpen(false)}>
          <div className="bg-card border rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#4E9BCD" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="#4E9BCD"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold">Sincronizar com SonarQube</h3>
                  <p className="text-xs text-muted-foreground">SAST oficial Unisys/Caixa</p>
                </div>
              </div>
              <button onClick={() => setSonarOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1 block">URL do SonarQube</label>
                <input value={sonarUrl} onChange={(e) => setSonarUrl(e.target.value)} placeholder="https://sonar.empresa.com" className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Token</label>
                <input type="password" value={sonarToken} onChange={(e) => setSonarToken(e.target.value)} placeholder="squ_..." className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono" />
                <p className="text-[10px] text-muted-foreground mt-1">Pegue em SonarQube → My Account → Security → Generate Tokens</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Project Key (opcional)</label>
                <input value={sonarProject} onChange={(e) => setSonarProject(e.target.value)} placeholder="caixa-siaci (vazio = todos)" className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono" />
              </div>

              {syncOk && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  <CheckCircle2 className="h-4 w-4" /> Sync iniciada — findings vão aparecer em Vulnerabilidades nos próximos minutos.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setSonarOpen(false)} className="flex-1 px-3 py-2 rounded-lg border text-sm">Cancelar</button>
                <button onClick={doSync} disabled={syncing || !sonarToken} className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {syncing ? "Sincronizando..." : "Sincronizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
