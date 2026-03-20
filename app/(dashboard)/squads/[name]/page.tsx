"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  ChevronDown,
  ChevronUp,
  User,
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
  AreaChart,
  Area,
  Legend,
} from "recharts"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}
const API_URL = getApiUrl()

const SEVERITY_COLORS: Record<string, string> = {
  EXTREMA: "#ef4444",
  CRITICA: "#f97316",
  ALTA: "#eab308",
  MEDIA: "#3b82f6",
  BAIXA: "#22c55e",
  INFORMATIVA: "#8b5cf6",
}

const SEVERITY_LABELS: Record<string, string> = {
  EXTREMA: "Extrema",
  CRITICA: "Critica",
  ALTA: "Alta",
  MEDIA: "Media",
  BAIXA: "Baixa",
  INFORMATIVA: "Informativa",
}

const STATUS_LABELS: Record<string, string> = {
  NOVO: "Nova",
  ABERTO: "Aberta",
  EM_BACKLOG: "Em Backlog",
  EM_CORRECAO: "Em Correcao",
  EM_RETESTE: "Em Reteste",
  MITIGADO: "Mitigada",
  CONCLUIDO: "Concluida",
  RISCO_ACEITO: "Risco Aceito",
  FECHADO: "Fechada",
}

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE']

const CRITICIDADE_BADGE: Record<string, string> = {
  EXTREMA: "bg-red-600 text-white",
  CRITICA: "bg-red-500 text-white",
  ALTA: "bg-orange-500 text-white",
  MEDIA: "bg-amber-500 text-black",
  BAIXA: "bg-green-500 text-white",
  INFORMATIVA: "bg-blue-500 text-white",
}

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-400"
  if (score >= 70) return "text-green-400"
  if (score >= 50) return "text-yellow-400"
  if (score >= 30) return "text-orange-400"
  return "text-red-400"
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excelente"
  if (score >= 70) return "Bom"
  if (score >= 50) return "Regular"
  if (score >= 30) return "Baixo"
  return "Critico"
}

interface DevVuln {
  id: string
  codigoInterno: string
  titulo: string
  criticidade: string
  status: string
  diasEmAberto: number
  sla: string | null
  sistema: string
  slaExpired: boolean
}

interface DevScore {
  name: string
  total: number
  open: number
  closed: number
  extremaCritica: number
  slaExpired: number
  correcaoPct: number
  vulns: DevVuln[]
}

interface SquadDetail {
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
  trendDirection: string
  complianceScore: number
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  byOwasp: Record<string, number>
  openVulns: DevVuln[]
  monthlyTrend: Array<{ month: string; opened: number; closed: number }>
  devScoreboard?: DevScore[]
}

export default function SquadDetailPage() {
  const params = useParams()
  const squadName = decodeURIComponent(params.name as string)
  const [data, setData] = useState<SquadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDevs, setExpandedDevs] = useState<Record<string, boolean>>({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/analytics/squads/${encodeURIComponent(squadName)}`, {
        headers: authHeaders(),
      })
      if (res.status === 401) {
        localStorage.removeItem('vulncontrol_user')
        document.cookie = 'vulncontrol_token=; path=/; max-age=0'
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error("Squad nao encontrada")
      setData(await res.json())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [squadName])

  const toggleDev = (name: string) => {
    setExpandedDevs(prev => ({ ...prev, [name]: !prev[name] }))
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <Link href="/squads">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        </Link>
        <p className="mt-8 text-center text-muted-foreground">Squad nao encontrada ou sem vulnerabilidades.</p>
      </div>
    )
  }

  const severityData = Object.entries(data.bySeverity).map(([key, value]) => ({
    name: SEVERITY_LABELS[key] || key,
    value,
    color: SEVERITY_COLORS[key] || "#888",
  }))

  const owaspData = Object.entries(data.byOwasp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, value]) => ({
      name: key.length > 25 ? key.substring(0, 25) + "..." : key,
      count: value,
    }))

  const devs = data.devScoreboard || []

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/squads">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{data.squadName}</h1>
            <p className="text-sm text-muted-foreground">{data.total} vulnerabilidades registradas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Compliance Score</p>
            <p className={cn("text-3xl font-bold", getScoreColor(data.complianceScore))}>
              {data.complianceScore}
            </p>
            <p className={cn("text-xs", getScoreColor(data.complianceScore))}>
              {getScoreLabel(data.complianceScore)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Abertas</p>
            <p className="text-2xl font-bold text-foreground">{data.openCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Ext + Crit</p>
            <p className="text-2xl font-bold text-red-400">{data.extrema + data.critica}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">SLA Vencido</p>
            <p className={cn("text-2xl font-bold", data.slaExpired > 0 ? "text-red-400" : "text-emerald-400")}>
              {data.slaExpired}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">MTTR</p>
            <p className="text-2xl font-bold text-foreground">{data.mttrDays}d</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">SLA Compliance</p>
            <p className={cn("text-2xl font-bold", data.slaComplianceRate >= 70 ? "text-green-400" : "text-red-400")}>
              {data.slaComplianceRate}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Reopen Rate</p>
            <p className={cn("text-2xl font-bold", data.reopenRate > 20 ? "text-orange-400" : "text-foreground")}>
              {data.reopenRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Taxa de Resolucao</span>
              <span className="text-sm font-medium text-foreground">
                {data.total > 0 ? Math.round((data.closedCount / data.total) * 100) : 0}%
              </span>
            </div>
            <Progress value={data.total > 0 ? (data.closedCount / data.total) * 100 : 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{data.closedCount} de {data.total} resolvidas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Ultimos 30 dias</span>
              <span className="text-sm font-medium flex items-center gap-1">
                {data.trendDirection === "improving" && <TrendingDown className="h-4 w-4 text-emerald-400" />}
                {data.trendDirection === "worsening" && <TrendingUp className="h-4 w-4 text-red-400" />}
                {data.trendDirection === "stable" && <Minus className="h-4 w-4 text-zinc-400" />}
                <span className={
                  data.trendDirection === "improving" ? "text-emerald-400"
                  : data.trendDirection === "worsening" ? "text-red-400"
                  : "text-zinc-400"
                }>
                  {data.trendDirection === "improving" ? "Melhorando" : data.trendDirection === "worsening" ? "Piorando" : "Estavel"}
                </span>
              </span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground">Novas: <span className="text-red-400 font-medium">{data.newLast30}</span></span>
              <span className="text-muted-foreground">Fechadas: <span className="text-emerald-400 font-medium">{data.closedLast30}</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DEV SCOREBOARD */}
      {devs.length > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Desenvolvedores da Squad</CardTitle>
            </div>
            <CardDescription>Falhas atreladas a cada responsavel — clique para expandir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {devs.map(dev => {
                const isExpanded = expandedDevs[dev.name] || false
                const pctColor = dev.correcaoPct >= 80 ? 'text-green-500' : dev.correcaoPct >= 50 ? 'text-amber-500' : 'text-red-500'
                const barColor = dev.correcaoPct >= 80 ? 'bg-green-500' : dev.correcaoPct >= 50 ? 'bg-amber-500' : 'bg-red-500'

                return (
                  <div key={dev.name} className="rounded-lg border border-border overflow-hidden">
                    {/* Dev Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleDev(dev.name)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 shrink-0">
                          <User className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">{dev.name}</span>
                            <span className="text-xs text-muted-foreground">({dev.total} falhas)</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="h-1.5 flex-1 max-w-[200px] overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${dev.correcaoPct}%` }} />
                            </div>
                            <span className={cn("text-xs font-bold", pctColor)}>{dev.correcaoPct}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {dev.open > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {dev.open} aberta{dev.open > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {dev.extremaCritica > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">
                            {dev.extremaCritica} ext/crit
                          </Badge>
                        )}
                        {dev.slaExpired > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-red-600/10 text-red-600 border-red-600/20">
                            {dev.slaExpired} SLA
                          </Badge>
                        )}
                        {dev.closed > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                            {dev.closed} corrigida{dev.closed > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Dev Vulns (expanded) */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/10">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50 text-muted-foreground">
                                <th className="text-left py-2 px-4 font-medium text-xs">Codigo</th>
                                <th className="text-left py-2 px-4 font-medium text-xs">Titulo</th>
                                <th className="text-center py-2 px-4 font-medium text-xs">Severidade</th>
                                <th className="text-center py-2 px-4 font-medium text-xs">Status</th>
                                <th className="text-center py-2 px-4 font-medium text-xs">Dias</th>
                                <th className="text-center py-2 px-4 font-medium text-xs">SLA</th>
                                <th className="text-left py-2 px-4 font-medium text-xs">Alvo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dev.vulns.map(v => (
                                <tr key={v.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                                  <td className="py-2 px-4">
                                    <Link href={`/vulnerabilidades/${v.codigoInterno}`} className="text-primary hover:underline font-mono text-xs">
                                      {v.codigoInterno}
                                    </Link>
                                  </td>
                                  <td className="py-2 px-4 text-foreground max-w-[250px] truncate text-xs">{v.titulo}</td>
                                  <td className="py-2 px-4 text-center">
                                    <Badge className={cn("text-[10px]", CRITICIDADE_BADGE[v.criticidade] || "bg-muted text-muted-foreground")}>
                                      {SEVERITY_LABELS[v.criticidade] || v.criticidade}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <Badge variant="outline" className={cn("text-[10px]",
                                      OPEN_STATUSES.includes(v.status) ? "border-amber-500/30 text-amber-500" : "border-green-500/30 text-green-500"
                                    )}>
                                      {STATUS_LABELS[v.status] || v.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <span className={cn("text-xs font-medium", v.diasEmAberto > 30 ? "text-red-400" : "text-foreground")}>
                                      {v.diasEmAberto}d
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    {v.slaExpired ? (
                                      <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                    ) : v.sla ? (
                                      <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto" />
                                    ) : (
                                      <Minus className="h-4 w-4 text-zinc-500 mx-auto" />
                                    )}
                                  </td>
                                  <td className="py-2 px-4 text-muted-foreground text-xs">{v.sistema || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Tendencia Mensal</CardTitle>
            <CardDescription>Vulnerabilidades abertas vs fechadas (6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-card-foreground)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="opened" name="Abertas" stroke="#ef4444" fill="#ef444430" />
                  <Area type="monotone" dataKey="closed" name="Fechadas" stroke="#22c55e" fill="#22c55e30" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por Severidade</CardTitle>
            <CardDescription>Todas as vulnerabilidades da squad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-card-foreground)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* OWASP Distribution */}
        {owaspData.length > 0 && (
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">OWASP Top Categories</CardTitle>
              <CardDescription>Categorias mais frequentes nesta squad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={owaspData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={200} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-card-foreground)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Open Vulnerabilities Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Vulnerabilidades Abertas ({data.openVulns.length})
          </CardTitle>
          <CardDescription>Ordenadas por tempo em aberto (mais antigas primeiro)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.openVulns.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="h-10 w-10 text-emerald-400 mb-2" />
              <p className="text-muted-foreground">Nenhuma vulnerabilidade aberta!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Codigo</th>
                    <th className="text-left py-3 px-2 font-medium">Titulo</th>
                    <th className="text-center py-3 px-2 font-medium">Severidade</th>
                    <th className="text-center py-3 px-2 font-medium">Dias Aberto</th>
                    <th className="text-center py-3 px-2 font-medium">SLA</th>
                    <th className="text-left py-3 px-2 font-medium">Responsavel</th>
                    <th className="text-left py-3 px-2 font-medium">Alvo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openVulns.map((v) => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2">
                        <Link href={`/vulnerabilidades/${v.codigoInterno}`} className="text-primary hover:underline font-mono text-xs">
                          {v.codigoInterno}
                        </Link>
                      </td>
                      <td className="py-2.5 px-2 text-foreground max-w-[300px] truncate">{v.titulo}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: `${SEVERITY_COLORS[v.criticidade]}20`,
                            color: SEVERITY_COLORS[v.criticidade],
                          }}
                        >
                          {SEVERITY_LABELS[v.criticidade] || v.criticidade}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={v.diasEmAberto > 30 ? "text-red-400 font-medium" : "text-foreground"}>
                          {v.diasEmAberto}d
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {v.slaExpired ? (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        ) : v.sla ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto" />
                        ) : (
                          <Minus className="h-4 w-4 text-zinc-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">{(v as any).responsavel || "—"}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{v.sistema}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
