"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Shield,
  Clock,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Target,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== "undefined") return `http://${window.location.hostname}:9001`
  return "http://localhost:9001"
}

const API_URL = getApiUrl()

interface SquadScorecard {
  squadName: string
  total: number
  openCount: number
  closedCount: number
  extrema: number
  critica: number
  alta: number
  media: number
  baixa: number
  slaExpired: number
  slaComplianceRate: number
  mttrDays: number
  avgDaysOpen: number
  proactivityScore: number
  complianceScore: number
  securityDebt: number
  trendDirection: "improving" | "worsening" | "stable"
  tribo: string
  po: string
  techLead: string
  appSec: string
  sre: string
  newLast30: number
  closedLast30: number
  reopenRate: number
}

interface SsdlcOverview {
  totalSquads: number
  avgCompliance: number
  avgMttr: number
  avgSlaCompliance: number
  maturityDistribution: any
  worstSquads: SquadScorecard[]
  bestSquads: SquadScorecard[]
  allSquads: SquadScorecard[]
}

export default function SquadsPage() {
  const [data, setData] = useState<SsdlcOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/analytics/ssdlc`, { headers: authHeaders() })
      if (res.status === 401) {
        localStorage.removeItem('vulncontrol_user')
        document.cookie = 'vulncontrol_token=; path=/; max-age=0'
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error("Falha ao carregar dados")
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar scorecard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.totalSquads === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Squad Scorecard</h1>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma squad encontrada. Importe vulnerabilidades para ver métricas.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dados por squad com métricas de correção
  const squadsRanking = data.allSquads
    .map(s => {
      const correcaoPct = s.total > 0 ? Math.round((s.closedCount / s.total) * 100) : 0
      const slaPct = s.slaComplianceRate || 0
      return {
        ...s,
        correcaoPct,
        slaPct,
      }
    })
    .sort((a, b) => b.correcaoPct - a.correcaoPct)

  // Dados pra gráfico de barras comparativo
  const chartData = squadsRanking.map(s => ({
    squad: s.squadName.length > 14 ? s.squadName.substring(0, 14) + '…' : s.squadName,
    corrigidas: s.closedCount,
    abertas: s.openCount,
    slaVencido: s.slaExpired,
  }))

  // Totais gerais
  const totalVulns = data.allSquads.reduce((s, q) => s + q.total, 0)
  const totalCorrigidas = data.allSquads.reduce((s, q) => s + q.closedCount, 0)
  const totalAbertas = data.allSquads.reduce((s, q) => s + q.openCount, 0)
  const totalSlaVencido = data.allSquads.reduce((s, q) => s + q.slaExpired, 0)

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Squad Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento de correção e SLA por squad — {data.totalSquads} squads monitoradas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards - Simples e diretos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vulnerabilidades</p>
                <p className="text-2xl font-bold text-foreground">{totalVulns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Corrigidas</p>
                <p className="text-2xl font-bold text-green-500">{totalCorrigidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <XCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Não Corrigidas</p>
                <p className="text-2xl font-bold text-amber-500">{totalAbertas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SLA Estourados</p>
                <p className="text-2xl font-bold text-red-500">{totalSlaVencido}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Comparativo + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras: Corrigidas vs Abertas por Squad */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Corrigidas vs Não Corrigidas por Squad</CardTitle>
            </div>
            <CardDescription>Comparativo de resolução entre squads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis dataKey="squad" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={110} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-card-foreground)' }}
                      itemStyle={{ fontWeight: 600 }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Legend />
                    <Bar dataKey="corrigidas" fill="#22c55e" name="Corrigidas" radius={[0, 4, 4, 0]} stackId="a" />
                    <Bar dataKey="abertas" fill="#f59e0b" name="Não Corrigidas" radius={[0, 4, 4, 0]} stackId="a" />
                    <Bar dataKey="slaVencido" fill="#ef4444" name="SLA Estourado" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hall of Fame - Ranking por % de correção */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">Ranking de Correção por Squad</CardTitle>
            </div>
            <CardDescription>% de vulnerabilidades corrigidas sobre o total — quem resolve mais?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {squadsRanking.map((squad, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`
                const pctColor = squad.correcaoPct >= 80 ? 'text-green-500' : squad.correcaoPct >= 50 ? 'text-amber-500' : 'text-red-500'
                const barColor = squad.correcaoPct >= 80 ? 'bg-green-500' : squad.correcaoPct >= 50 ? 'bg-amber-500' : 'bg-red-500'

                return (
                  <div key={squad.squadName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-8 text-center">{medal}</span>
                        <div>
                          <span className="text-sm font-bold text-foreground">{squad.squadName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {squad.closedCount}/{squad.total} corrigidas
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {squad.slaExpired > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">
                            {squad.slaExpired} SLA estourado{squad.slaExpired > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <span className={cn("text-sm font-black", pctColor)}>
                          {squad.correcaoPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${squad.correcaoPct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela detalhada */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Detalhamento por Squad</CardTitle>
          </div>
          <CardDescription>Visão completa: total de falhas, corrigidas, SLA estourado e % de correção</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-3 font-medium">#</th>
                  <th className="text-left py-3 px-3 font-medium">Squad</th>
                  <th className="text-center py-3 px-3 font-medium">Total</th>
                  <th className="text-center py-3 px-3 font-medium">Corrigidas</th>
                  <th className="text-center py-3 px-3 font-medium">Não Corrigidas</th>
                  <th className="text-center py-3 px-3 font-medium">Extremas/Críticas</th>
                  <th className="text-center py-3 px-3 font-medium">SLA Estourado</th>
                  <th className="text-center py-3 px-3 font-medium">% Correção</th>
                  <th className="text-center py-3 px-3 font-medium">Situação</th>
                  <th className="text-center py-3 px-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {squadsRanking.map((squad, idx) => {
                  const pctColor = squad.correcaoPct >= 80 ? 'text-green-500' : squad.correcaoPct >= 50 ? 'text-amber-500' : 'text-red-500'
                  const situacao = squad.correcaoPct >= 80 ? { label: 'Ótimo', color: 'bg-green-500/10 text-green-500 border-green-500/20' }
                    : squad.correcaoPct >= 50 ? { label: 'Regular', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
                    : squad.slaExpired > 0 ? { label: 'Crítico', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
                    : { label: 'Atenção', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' }

                  return (
                    <tr key={squad.squadName} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => window.location.href = `/squads/${encodeURIComponent(squad.squadName)}`}>
                      <td className="py-3 px-3 text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-foreground">{squad.squadName}</td>
                      <td className="py-3 px-3 text-center text-foreground">{squad.total}</td>
                      <td className="py-3 px-3 text-center text-green-500 font-semibold">{squad.closedCount}</td>
                      <td className="py-3 px-3 text-center text-amber-500 font-semibold">{squad.openCount}</td>
                      <td className="py-3 px-3 text-center">
                        {(squad.extrema + squad.critica) > 0 ? (
                          <span className="text-red-500 font-bold">{squad.extrema + squad.critica}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {squad.slaExpired > 0 ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-bold">{squad.slaExpired}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">0</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn("font-black text-base", pctColor)}>{squad.correcaoPct}%</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className={cn("text-[11px] font-semibold", situacao.color)}>{situacao.label}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mx-auto" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
