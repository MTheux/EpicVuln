"use client"

import { RefreshCw, CheckCircle2, AlertCircle, Clock, Cog } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"

const syncs = [
  { tool: "IBM RTC", type: "Pentest Epics", lastRun: "há 8min", duration: "12s", status: "success", items: 34 },
  { tool: "SonarQube", type: "SAST Issues", lastRun: "há 1h", duration: "1m 04s", status: "success", items: 187 },
  { tool: "GitLab Caixa", type: "Repositórios", lastRun: "há 2h", duration: "22s", status: "success", items: 23 },
  { tool: "OWASP ZAP", type: "DAST Scans", lastRun: "há 3h", duration: "3m 12s", status: "success", items: 64 },
  { tool: "Trivy CI", type: "Container Scan", lastRun: "há 5h", duration: "47s", status: "success", items: 49 },
  { tool: "Grype Pipeline", type: "SCA", lastRun: "há 6h", duration: "1m 33s", status: "warning", items: 38, msg: "12 deps sem CVE matching" },
  { tool: "GitLeaks", type: "Secrets", lastRun: "há 2h", duration: "8s", status: "success", items: 12 },
  { tool: "Dependency Track", type: "SBOM", lastRun: "ontem", duration: "—", status: "error", items: 0, msg: "API key expirada" },
]

const statusIcon = (s: string) => {
  if (s === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (s === "warning") return <AlertCircle className="h-4 w-4 text-amber-500" />
  return <AlertCircle className="h-4 w-4 text-red-500" />
}

export default function SincronizacaoPage() {
  return (
    <div>
      <PageHeader
        icon={RefreshCw}
        title="Sincronização"
        subtitle="Pipelines de ingestão de scanners e integrações"
        description="Monitore execuções, ative re-sync manual e visualize health das integrações que alimentam o catálogo ASPM."
        actions={
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
            <RefreshCw className="h-4 w-4" /> Sync All
          </button>
        }
      />

      <StatGrid
        stats={[
          { label: "Integrações Ativas", value: syncs.filter((s) => s.status !== "error").length, icon: Cog, tone: "success" },
          { label: "Com Alerta", value: syncs.filter((s) => s.status === "warning").length, icon: AlertCircle, tone: "warning" },
          { label: "Falhando", value: syncs.filter((s) => s.status === "error").length, icon: AlertCircle, tone: "danger" },
          { label: "Itens Hoje", value: syncs.reduce((a, s) => a + s.items, 0), icon: Clock, tone: "info" },
        ]}
      />

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Status das Integrações</h3>
        </div>
        <div className="divide-y">
          {syncs.map((s) => (
            <div key={s.tool} className="p-4 flex items-center justify-between hover:bg-muted/30 transition">
              <div className="flex items-center gap-3">
                {statusIcon(s.status)}
                <div>
                  <div className="font-semibold text-sm">{s.tool}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.type} · {s.items} itens · executou em {s.duration}
                  </div>
                  {s.msg && (
                    <div className="text-[11px] mt-0.5 text-amber-500">{s.msg}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{s.lastRun}</span>
                <button className="p-1.5 rounded-lg hover:bg-muted transition" title="Sincronizar agora">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
