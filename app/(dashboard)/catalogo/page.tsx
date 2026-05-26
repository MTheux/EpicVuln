"use client"

import { Database, Package, GitBranch, FlaskConical, Bug } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const levels = [
  { icon: Package, label: "Produto", desc: "Contexto de negócio", count: 6, color: "text-violet-400 bg-violet-500/15 border-violet-500/30" },
  { icon: GitBranch, label: "Repositório", desc: "Unidade técnica versionada", count: 23, color: "text-sky-400 bg-sky-500/15 border-sky-500/30" },
  { icon: FlaskConical, label: "Test Run", desc: "Execução de ferramenta", count: 142, color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  { icon: Bug, label: "Finding", desc: "Vulnerabilidade detectada", count: 384, color: "text-red-400 bg-red-500/15 border-red-500/30" },
]

const sources = [
  { tool: "SonarQube", findings: 187, lastSync: "há 1h", health: "ok", category: "SAST" },
  { tool: "OWASP ZAP", findings: 64, lastSync: "há 3h", health: "ok", category: "DAST" },
  { tool: "Trivy", findings: 49, lastSync: "há 5h", health: "ok", category: "SCA / Container" },
  { tool: "GitLeaks", findings: 12, lastSync: "há 2h", health: "ok", category: "Secrets" },
  { tool: "Grype", findings: 38, lastSync: "há 4h", health: "warn", category: "SCA" },
  { tool: "IBM RTC (Pentest)", findings: 34, lastSync: "há 30min", health: "ok", category: "Pentest" },
]

export default function CatalogoPage() {
  return (
    <div>
      <PageHeader
        icon={Database}
        title="Catálogo ASPM"
        subtitle="Hierarquia normalizada Produto → Repositório → Test Run → Finding"
        description="Visão unificada de todo backlog de segurança da Caixa, com mapeamento canônico entre ferramentas (SonarQube, ZAP, Trivy, RTC) e o modelo de produto/repositório."
      />

      {/* Hierarquia visual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {levels.map((l, i) => (
          <div key={l.label} className={`rounded-xl border p-5 ${l.color}`}>
            <div className="flex items-center justify-between mb-3">
              <l.icon className="h-5 w-5" />
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                Nível {i + 1}
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums mb-1">{l.count}</div>
            <div className="text-sm font-semibold">{l.label}</div>
            <div className="text-xs opacity-70 mt-0.5">{l.desc}</div>
          </div>
        ))}
      </div>

      {/* Fontes integradas */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Fontes de Findings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mapeamento: <span className="font-mono">Sonar Issue</span> →{" "}
            <span className="font-mono">Finding</span> · <span className="font-mono">RTC Epic</span> →{" "}
            <span className="font-mono">Finding (Pentest)</span>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          {sources.map((s) => (
            <div key={s.tool} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  s.health === "ok" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                }`}>
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{s.tool}</div>
                  <div className="text-[11px] text-muted-foreground">{s.category} · {s.lastSync}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{s.findings}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">findings</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
