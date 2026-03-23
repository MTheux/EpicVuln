"use client"

import { useState, useEffect } from "react"
import { Activity, Clock, RefreshCw, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiskGauge } from "@/components/risk-gauge"
import { authHeaders } from "@/lib/auth"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== "undefined") return `http://${window.location.hostname}:9001`
  return "http://localhost:9001"
}

interface DoraMetrics {
  mttr: {
    overall: number
    bySeverity: Record<string, number>
    bySquad: Record<string, number>
    trend: { month: string; value: number }[]
  }
  reincidencia: {
    overall: number
    bySquad: Record<string, number>
    total: number
    reincidentes: number
  }
  taxaCorrecao: {
    last30d: { abertas: number; fechadas: number; rate: number }
    trend: { month: string; abertas: number; fechadas: number }[]
    bySquad: Record<string, { abertas: number; fechadas: number }>
  }
  slaCompliance: {
    overall: number
    bySeverity: Record<string, number>
    bySquad: Record<string, number>
  }
}

function getMttrBadgeColor(days: number) {
  if (days <= 15) return "bg-green-500/15 text-green-400 border-green-500/30"
  if (days <= 30) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
  if (days <= 60) return "bg-orange-500/15 text-orange-400 border-orange-500/30"
  return "bg-red-500/15 text-red-400 border-red-500/30"
}

function getComplianceBgWidth(pct: number) {
  return `${Math.min(Math.max(pct, 0), 100)}%`
}

function getComplianceBarColor(pct: number) {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 60) return "bg-yellow-500"
  if (pct >= 40) return "bg-orange-500"
  return "bg-red-500"
}

export default function MetricasDoraPage() {
  const [data, setData] = useState<DoraMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch(`${getApiUrl()}/api/reports/dora`, {
          headers: authHeaders(),
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message || "Erro ao carregar metricas")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <p className="text-muted-foreground text-sm">Carregando metricas DORA...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <p className="text-muted-foreground">Erro ao carregar metricas</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  const slaInvertedScore = 100 - (data?.slaCompliance?.overall ?? 0)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Metricas DORA de Seguranca</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mean Time to Remediate, Taxa de Reincidencia, Correcao e SLA Compliance
        </p>
      </div>

      {/* Top section - 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MTTR */}
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center pt-6 pb-4">
            <RiskGauge
              score={Math.min(data.mttr.overall, 100)}
              size={110}
              label={`${data.mttr.overall}d`}
            />
            <p className="text-sm font-medium text-foreground mt-3">MTTR</p>
            <p className="text-xs text-muted-foreground">Tempo medio de correcao</p>
          </CardContent>
        </Card>

        {/* Reincidencia */}
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center pt-6 pb-4">
            <RiskGauge
              score={data.reincidencia.overall}
              size={110}
              label={`${data.reincidencia.overall}%`}
            />
            <p className="text-sm font-medium text-foreground mt-3">Reincidencia</p>
            <p className="text-xs text-muted-foreground">Taxa de reincidencia</p>
          </CardContent>
        </Card>

        {/* Taxa de Correcao */}
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center pt-6 pb-4">
            <RiskGauge
              score={Math.min(data.taxaCorrecao.last30d.rate, 100)}
              size={110}
              label={`${data.taxaCorrecao.last30d.rate}%`}
            />
            <p className="text-sm font-medium text-foreground mt-3">Taxa de Correcao</p>
            <p className="text-xs text-muted-foreground">
              Vulns fechadas / abertas (30d)
            </p>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center pt-6 pb-4">
            <RiskGauge
              score={slaInvertedScore}
              size={110}
              label={`${data.slaCompliance.overall}%`}
            />
            <p className="text-sm font-medium text-foreground mt-3">SLA Compliance</p>
            <p className="text-xs text-muted-foreground">Dentro do SLA</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle section - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MTTR Trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              MTTR Trend (ultimos 6 meses)
            </CardTitle>
            <CardDescription>Tempo medio de remediacao por mes (dias)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.isArray(data?.mttr?.trend) ? data.mttr.trend : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value} dias`, "MTTR"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Correcao Trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              Correcao Trend (ultimos 6 meses)
            </CardTitle>
            <CardDescription>Vulnerabilidades abertas vs fechadas por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.isArray(data?.taxaCorrecao?.trend) ? data.taxaCorrecao.trend : []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="abertas" name="Abertas" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="fechadas" name="Fechadas" fill="#22c55e" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section - Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MTTR por Squad */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              MTTR por Squad
            </CardTitle>
            <CardDescription>Tempo medio de remediacao por squad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Squad</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">MTTR (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data?.mttr?.bySquad || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([squad, days]) => (
                      <tr key={squad} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 text-foreground">{squad}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant="outline" className={getMttrBadgeColor(days)}>
                            {days}d
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  {Object.keys(data?.mttr?.bySquad || {}).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground">
                        Nenhum dado disponivel
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance por Squad */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              SLA Compliance por Squad
            </CardTitle>
            <CardDescription>Percentual de vulns resolvidas dentro do SLA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Squad</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium w-[180px]">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data?.slaCompliance?.bySquad || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([squad, pct]) => (
                      <tr key={squad} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 text-foreground">{squad}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getComplianceBarColor(pct)}`}
                                style={{ width: getComplianceBgWidth(pct) }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {Object.keys(data?.slaCompliance?.bySquad || {}).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground">
                        Nenhum dado disponivel
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
