"use client"

import { Activity, TrendingUp, TrendingDown, Target, Shield, Clock } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"

const dimensions = [
  { name: "Cobertura de SAST", score: 87, target: 95, trend: "+4" },
  { name: "Cobertura de SCA", score: 92, target: 95, trend: "+2" },
  { name: "Secrets Scanning", score: 100, target: 100, trend: "0" },
  { name: "DAST em ambiente HML", score: 64, target: 80, trend: "+8" },
  { name: "Pentest Anual", score: 75, target: 100, trend: "0" },
  { name: "Threat Modeling", score: 42, target: 70, trend: "+12" },
  { name: "SLA Compliance Críticas", score: 68, target: 90, trend: "-3" },
  { name: "Reincidência (inverso)", score: 81, target: 90, trend: "+5" },
]

const scoreColor = (score: number, target: number) => {
  const ratio = score / target
  if (ratio >= 0.95) return "bg-emerald-500"
  if (ratio >= 0.75) return "bg-amber-500"
  return "bg-red-500"
}

export default function PosturaPage() {
  const overallScore = Math.round(dimensions.reduce((a, d) => a + d.score, 0) / dimensions.length)
  return (
    <div>
      <PageHeader
        icon={Activity}
        title="Postura de Segurança"
        subtitle="Posture Score consolidado da operação Unisys/Caixa"
        description="Score multidimensional que combina cobertura de scanners, SLA compliance, reincidência e maturidade DevSecOps. Use para priorizar investimentos."
      />

      <StatGrid
        stats={[
          { label: "Posture Score", value: `${overallScore}%`, icon: Target, tone: overallScore >= 80 ? "success" : "warning" },
          { label: "Dimensões OK", value: dimensions.filter((d) => d.score / d.target >= 0.95).length, icon: Shield, tone: "success" },
          { label: "Gaps Críticos", value: dimensions.filter((d) => d.score / d.target < 0.75).length, icon: TrendingDown, tone: "danger" },
          { label: "MTTR Médio", value: "12d", icon: Clock, trend: "-2d vs mês anterior" },
        ]}
      />

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Dimensões de Maturidade</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Baseado em OWASP SAMM v2 + métricas operacionais da squad
          </p>
        </div>
        <div className="divide-y">
          {dimensions.map((d) => {
            const trendNum = parseInt(d.trend)
            return (
              <div key={d.name} className="p-4 hover:bg-muted/30 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{d.name}</span>
                    {trendNum !== 0 && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          trendNum > 0
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {trendNum > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(trendNum)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm tabular-nums">
                    <span className="font-bold">{d.score}</span>
                    <span className="text-muted-foreground text-xs">/ {d.target}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${scoreColor(d.score, d.target)}`}
                    style={{ width: `${(d.score / 100) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
