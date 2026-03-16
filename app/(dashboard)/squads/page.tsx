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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001"

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
  if (score >= 85) return "text-emerald-400"
  if (score >= 70) return "text-green-400"
  if (score >= 50) return "text-yellow-400"
  if (score >= 30) return "text-orange-400"
  return "text-red-400"
}

function getScoreBg(score: number) {
  if (score >= 85) return "bg-emerald-500/20"
  if (score >= 70) return "bg-green-500/20"
  if (score >= 50) return "bg-yellow-500/20"
  if (score >= 30) return "bg-orange-500/20"
  return "bg-red-500/20"
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excelente"
  if (score >= 70) return "Bom"
  if (score >= 50) return "Regular"
  if (score >= 30) return "Baixo"
  return "Crítico"
}

function TrendIcon({ direction }: { direction: string }) {
  if (direction === "improving") return <TrendingDown className="h-4 w-4 text-emerald-400" />
  if (direction === "worsening") return <TrendingUp className="h-4 w-4 text-red-400" />
  return <Minus className="h-4 w-4 text-zinc-400" />
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
        <Card className="bg-card border-border">
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

  const rankingData = data.allSquads.map(s => ({
    name: s.squadName.length > 12 ? s.squadName.substring(0, 12) + "…" : s.squadName,
    score: s.complianceScore,
    fill: s.complianceScore >= 70 ? "#22c55e" : s.complianceScore >= 50 ? "#eab308" : "#ef4444",
  }))

  return (
    <div className="p-6 space-y-6">
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
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance Médio</p>
                <p className={cn("text-2xl font-bold", getScoreColor(data.avgCompliance))}>{data.avgCompliance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MTTR Médio</p>
                <p className="text-2xl font-bold text-foreground">{data.avgMttr} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <Shield className="h-5 w-5 text-green-400" />
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

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                <Users className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Squads</p>
                <p className="text-2xl font-bold text-foreground">{data.totalSquads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Ranking Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Ranking de Compliance</CardTitle>
            <CardDescription>Score de compliance por squad (0-100)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" domain={[0, 100]} stroke="#888" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {rankingData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                      contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
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
                  <th className="text-left py-3 px-2 font-medium">Squad</th>
                  <th className="text-center py-3 px-2 font-medium">Score</th>
                  <th className="text-center py-3 px-2 font-medium">Abertas</th>
                  <th className="text-center py-3 px-2 font-medium">Ext/Crít</th>
                  <th className="text-center py-3 px-2 font-medium">SLA Vencido</th>
                  <th className="text-center py-3 px-2 font-medium">SLA %</th>
                  <th className="text-center py-3 px-2 font-medium">MTTR</th>
                  <th className="text-center py-3 px-2 font-medium">Reopen %</th>
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
                      <span className="font-medium text-foreground">{squad.squadName}</span>
                      <span className="text-xs text-muted-foreground ml-2">({squad.total} total)</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={cn("font-bold", getScoreBg(squad.complianceScore), getScoreColor(squad.complianceScore))}>
                        {squad.complianceScore}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center text-foreground">{squad.openCount}</td>
                    <td className="py-3 px-2 text-center">
                      {squad.extrema + squad.critica > 0 ? (
                        <span className="text-red-400 font-medium">{squad.extrema + squad.critica}</span>
                      ) : (
                        <span className="text-emerald-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {squad.slaExpired > 0 ? (
                        <span className="text-red-400 font-medium flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {squad.slaExpired}
                        </span>
                      ) : (
                        <span className="text-emerald-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={squad.slaComplianceRate >= 70 ? "text-green-400" : "text-red-400"}>
                        {squad.slaComplianceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-foreground">{squad.mttrDays}d</td>
                    <td className="py-3 px-2 text-center">
                      <span className={squad.reopenRate > 20 ? "text-orange-400" : "text-foreground"}>
                        {squad.reopenRate}%
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
