"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Trophy,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Shield,
  Clock,
  Target,
  Users,
  ArrowRight,
  RefreshCw,
  Medal,
  Zap,
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
  PieChart,
  Pie,
  Cell,
} from "recharts"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:9001`
  }
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
  reopenRate: number
  newLast30: number
  closedLast30: number
  trendDirection: "improving" | "worsening" | "stable"
  complianceScore: number
  securityDebt: number
  proactivityScore: number
  tribo: string
  po: string
  techLead: string
  appSec: string
  sre: string
}

interface SsdlcOverview {
  totalSquads: number
  avgCompliance: number
  avgMttr: number
  avgSlaCompliance: number
  maturityDistribution: {
    critical: number
    low: number
    medium: number
    good: number
    excellent: number
  }
  worstSquads: SquadScorecard[]
  bestSquads: SquadScorecard[]
  allSquads: SquadScorecard[]
}

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-600"
  if (score >= 70) return "text-green-600"
  if (score >= 50) return "text-amber-600"
  if (score >= 30) return "text-orange-600"
  return "text-red-600"
}

function getScoreBg(score: number) {
  if (score >= 85) return "bg-emerald-500/10"
  if (score >= 70) return "bg-green-500/100/10"
  if (score >= 50) return "bg-amber-500/10"
  if (score >= 30) return "bg-orange-500/10"
  return "bg-red-500/100/10"
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excelente"
  if (score >= 70) return "Bom"
  if (score >= 50) return "Regular"
  if (score >= 30) return "Baixo"
  return "Crítico"
}

function TrendIcon({ direction }: { direction: string }) {
  if (direction === "improving") return <TrendingDown className="h-4 w-4 text-emerald-600" />
  if (direction === "worsening") return <TrendingUp className="h-4 w-4 text-red-600" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

const MATURITY_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"]

export default function SquadsPage() {
  const [data, setData] = useState<SsdlcOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/analytics/ssdlc`, { headers: authHeaders() })
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

  const maturityData = [
    { name: "Crítico", value: data.maturityDistribution.critical, color: MATURITY_COLORS[0] },
    { name: "Baixo", value: data.maturityDistribution.low, color: MATURITY_COLORS[1] },
    { name: "Regular", value: data.maturityDistribution.medium, color: MATURITY_COLORS[2] },
    { name: "Bom", value: data.maturityDistribution.good, color: MATURITY_COLORS[3] },
    { name: "Excelente", value: data.maturityDistribution.excellent, color: MATURITY_COLORS[4] },
  ].filter(d => d.value > 0)

  const proactivityData = data.allSquads
    .map(s => {
      const resolutionPct = s.total > 0 ? Math.round((s.closedCount / s.total) * 100) : 0
      return {
        name: s.squadName.length > 12 ? s.squadName.substring(0, 12) + "…" : s.squadName,
        score: resolutionPct,
        total: s.total,
        closed: s.closedCount,
        open: s.openCount,
        resolutionPct,
        fill: resolutionPct >= 80 ? "#eab308" : resolutionPct >= 50 ? "#22c55e" : "#3b82f6",
        isCandidate: resolutionPct >= 80
      }
    })
    .sort((a, b) => b.resolutionPct - a.resolutionPct)
    .slice(0, 8)

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Squad Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas SSDLC e compliance por squad — {data.totalSquads} squads monitoradas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance Médio</p>
                <p className={cn("text-2xl font-bold", getScoreColor(data.avgCompliance))}>{data.avgCompliance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MTTR Médio</p>
                <p className="text-2xl font-bold text-foreground">{data.avgMttr} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className={cn("text-2xl font-bold", data.avgSlaCompliance >= 70 ? "text-green-400" : "text-red-400")}>
                  {data.avgSlaCompliance}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dívida de Segurança</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.allSquads.reduce((sum, s) => sum + (Number(s.securityDebt) || 0), 0)} <span className="text-xs font-normal">pts</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DevChamp Hall of Fame */}
        <Card className="bg-card border-border shadow-sm overflow-hidden group hover:border-primary/30 transition-all duration-500">
          <CardHeader className="bg-muted/30 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500 animate-bounce" />
                  DevChamp Hall of Fame
                </CardTitle>
                <CardDescription>Elite de Segurança S-SDLC — ranking por % de correção</CardDescription>
              </div>
              <Medal className="h-8 w-8 text-yellow-500/20" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {proactivityData.slice(0, 5).map((squad, idx) => (
                <div key={idx} className="flex items-center gap-4 group/item">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ring-2 ring-offset-2 ring-offset-background transition-transform group-hover/item:scale-110",
                    idx === 0 ? "bg-yellow-500 text-black ring-yellow-500" :
                    idx === 1 ? "bg-zinc-300 text-zinc-800 ring-zinc-300" :
                    idx === 2 ? "bg-orange-400 text-black ring-orange-400" :
                    "bg-muted text-muted-foreground ring-muted"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground group-hover/item:text-yellow-500 transition-colors uppercase tracking-tight">
                        {squad.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {squad.closed}/{squad.total} corrigidas
                        </span>
                        <span className={cn("text-xs font-black", squad.score >= 80 ? "text-yellow-500" : "text-muted-foreground")}>
                          {squad.score}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={squad.score}
                      className="h-1.5"
                    />
                  </div>
                  {squad.isCandidate && (
                    <Trophy className="h-4 w-4 text-yellow-500 opacity-50 fill-yellow-500 ring-2 ring-yellow-500/20 rounded-full p-0.5" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 relative p-4 rounded-xl border border-primary/20 bg-primary/5 group/tip overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/tip:opacity-10 transition-opacity">
                 <Target className="h-12 w-12 text-primary" />
               </div>
               <div className="relative z-10">
                 <h4 className="text-xs font-bold text-primary mb-1 flex items-center gap-2 uppercase tracking-widest">
                   <Zap className="h-3 w-3" /> Radar de Talentos
                 </h4>
                 <p className="text-[11px] leading-relaxed text-muted-foreground">
                   Ranking baseado na <span className="text-foreground font-bold italic">% de correção sobre vulnerabilidades abertas</span>, garantindo comparação justa entre squads de volumes diferentes. Squads com score acima de 80% são candidatas a <span className="text-foreground underline decoration-primary/30">Security Champions</span>.
                 </p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Maturity Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Maturidade</CardTitle>
            <CardDescription>Classificação das squads por nível</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {maturityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={maturityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {maturityData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Squad Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Ranking Completo das Squads
          </CardTitle>
          <CardDescription>Ordenado por compliance score (pior → melhor). Clique para ver detalhes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">#</th>
                  <th className="text-left py-3 px-2 font-medium">Tribo</th>
                  <th className="text-left py-3 px-2 font-medium">Squad</th>
                  <th className="text-center py-3 px-2 font-medium">Score</th>
                  <th className="text-center py-3 px-2 font-medium">Abertas</th>
                  <th className="text-center py-3 px-2 font-medium">Liderança</th>
                  <th className="text-center py-3 px-2 font-medium">Proatividade</th>
                  <th className="text-center py-3 px-2 font-medium">Dívida</th>
                  <th className="text-center py-3 px-2 font-medium">Tendência</th>
                  <th className="text-center py-3 px-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.allSquads.map((squad, idx) => (
                  <tr
                    key={squad.squadName}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-2 text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="text-[10px] font-medium border-border text-muted-foreground">
                        {squad.tribo}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium text-foreground">{squad.squadName}</span>
                      <span className="text-xs text-muted-foreground ml-2 block">({squad.total} total)</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={cn("font-bold", getScoreBg(squad.complianceScore), getScoreColor(squad.complianceScore))}>
                        {squad.complianceScore}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center text-foreground">{squad.openCount}</td>
                    <td className="py-3 px-2 text-center">
                       <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground">PO: {squad.po}</span>
                          <span className="text-[10px] text-muted-foreground">TL: {squad.techLead}</span>
                       </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Progress value={Number(squad.proactivityScore) || 0} className="h-1.5 w-16" />
                        <span className={cn("text-[10px] font-bold", (squad.proactivityScore || 0) >= 70 ? "text-emerald-500" : "text-muted-foreground")}>
                          {Number(squad.proactivityScore) || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={cn("text-xs font-medium", (squad.securityDebt || 0) > 200 ? "text-red-400" : "text-muted-foreground")}>
                        {Number(squad.securityDebt) || 0} pts
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <TrendIcon direction={squad.trendDirection} />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Link href={`/squads/${encodeURIComponent(squad.squadName)}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
