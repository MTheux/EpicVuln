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
  extrema: number // kept for API compat, always 0
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
      const res = await fetch(`${API_URL}/api/analytics/ssdlc`, { headers: authHeaders(), credentials: 'include' })
      if (res.status === 401) {
        localStorage.removeItem('epicvuln_user')
        document.cookie = 'epicvuln_token=; path=/; max-age=0'
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

  if (!data || !Array.isArray(data.allSquads) || data.totalSquads === 0) {
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-500" />
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

      {/* Portfólio de Produtos (movido de /produtos) */}
      <ProdutosSection />

      {/* Tabela detalhada */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
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
                  <th className="text-center py-3 px-3 font-medium">Críticas</th>
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
                        {squad.critica > 0 ? (
                          <span className="text-red-500 font-bold">{squad.critica}</span>
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

// ============ Produtos Section (movido de /produtos) ============
const produtos = [
  { nome: "SIACI — Originação", squad: "NM182 - Originação e Entrada de Dados - SIACI", repos: 8, vulns: 15, criticas: 3, criticidade: "CRITICAL" },
  { nome: "SIACI — Financeiro", squad: "NM177 - Financeiro e Garantias - SIACI", repos: 6, vulns: 11, criticas: 2, criticidade: "CRITICAL" },
  { nome: "SIACI — Portais e Serviços", squad: "NM180 - Portais e Serviços - SIACI", repos: 5, vulns: 9, criticas: 1, criticidade: "HIGH" },
  { nome: "SIACI — Evolução", squad: "NM181 - Evolução - SIACI", repos: 4, vulns: 1, criticas: 0, criticidade: "MEDIUM" },
  { nome: "SIACI — Recursos e Componentes", squad: "NM176 - Recursos e Componentes - SIACI", repos: 7, vulns: 1, criticas: 0, criticidade: "MEDIUM" },
]

const criticidadeBadge: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

function ProdutosSection() {
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          <CardTitle className="text-base">Portfólio de Produtos por Squad</CardTitle>
        </div>
        <CardDescription>
          Cada produto representa um sistema da Caixa. Repositórios e findings associados ao produto para visão de portfólio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium">Produto</th>
                <th className="text-left p-3 font-medium">Squad</th>
                <th className="text-center p-3 font-medium">Repos</th>
                <th className="text-center p-3 font-medium">Vulns</th>
                <th className="text-center p-3 font-medium">Críticas</th>
                <th className="text-center p-3 font-medium">Criticidade</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.nome} className="border-b border-border hover:bg-muted/30 transition cursor-pointer">
                  <td className="p-3 font-medium">{p.nome}</td>
                  <td className="p-3 text-muted-foreground text-xs">{p.squad}</td>
                  <td className="p-3 text-center tabular-nums">{p.repos}</td>
                  <td className="p-3 text-center tabular-nums">{p.vulns}</td>
                  <td className="p-3 text-center">
                    {p.criticas > 0 ? (
                      <span className="text-red-500 font-semibold">{p.criticas}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${criticidadeBadge[p.criticidade]}`}>
                      {p.criticidade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
