"use client"
import { Activity, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"

const logs = [
  { ts: "19:48:11", user: "security@unisys.com", action: "generate-epic", provider: "ollama/llama3.2-vision", tokens: 2841, ms: 4120, status: "OK" },
  { ts: "19:32:55", user: "admin@unisys.com", action: "analyze-architecture", provider: "ollama/llama3.2-vision", tokens: 5210, ms: 8730, status: "OK" },
  { ts: "18:54:42", user: "security@unisys.com", action: "generateAnalysis", provider: "groq/llama-3.1-70b", tokens: 3984, ms: 2871, status: "OK" },
  { ts: "18:12:08", user: "gestor@unisys.com", action: "generateAttackGraph", provider: "groq/llama-3.1-70b", tokens: 4421, ms: 3240, status: "OK" },
  { ts: "17:48:21", user: "security@unisys.com", action: "jshunter-filter", provider: "ollama/llama3.1", tokens: 1820, ms: 1240, status: "OK" },
]

export default function LogsIAPage() {
  return (
    <div>
      <PageHeader
        icon={Activity}
        title="Logs AISEC"
        subtitle="Observabilidade das chamadas IA — tokens, latência, providers"
        description="Visão administrativa do consumo do AISEC. Provider/modelo nunca é exposto a usuário final."
      />
      <StatGrid
        stats={[
          { label: "Chamadas Hoje", value: 142, icon: Sparkles, tone: "info" },
          { label: "Tokens Consumidos", value: "284k", icon: Activity, tone: "warning" },
          { label: "Latência Média", value: "3.4s", icon: Activity },
          { label: "Erros (24h)", value: 2, icon: Activity, tone: "danger" },
        ]}
      />
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Hora</th>
              <th className="text-left p-3 font-medium">Usuário</th>
              <th className="text-left p-3 font-medium">Ação</th>
              <th className="text-left p-3 font-medium">Provider</th>
              <th className="text-right p-3 font-medium">Tokens</th>
              <th className="text-right p-3 font-medium">Latência</th>
              <th className="text-right p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-t hover:bg-muted/30 transition">
                <td className="p-3 font-mono text-xs">{l.ts}</td>
                <td className="p-3 text-xs">{l.user}</td>
                <td className="p-3 text-xs"><span className="font-mono bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">{l.action}</span></td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{l.provider}</td>
                <td className="p-3 text-right tabular-nums text-xs">{l.tokens.toLocaleString()}</td>
                <td className="p-3 text-right tabular-nums text-xs">{l.ms}ms</td>
                <td className="p-3 text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
