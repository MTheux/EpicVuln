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
  RotateCcw,
  CheckCircle,
  XCircle,
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
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
  INFORMATIVA: "Informativa",
}

const STATUS_LABELS: Record<string, string> = {
  NOVO: "Nova",
  ABERTO: "Aberta",
  EM_BACKLOG: "Em Backlog",
  EM_CORRECAO: "Em Correção",
  EM_RETESTE: "Em Reteste",
  MITIGADO: "Mitigada",
  CONCLUIDO: "Concluída",
  RISCO_ACEITO: "Risco Aceito",
  FECHADO: "Fechada",
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
  return "Crítico"
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
  openVulns: Array<{
    id: string
    codigoInterno: string
    titulo: string
    criticidade: string
    status: string
    diasEmAberto: number
    sla: string | null
    responsavel: string | null
    sistema: string
    slaExpired: boolean
  }>
  monthlyTrend: Array<{ month: string; opened: number; closed: number }>
}

export default function SquadDetailPage() {
  const params = useParams()
  const squadName = decodeURIComponent(params.name as string)
  const [data, setData] = useState<SquadDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/analytics/squads/${encodeURIComponent(squadName)}`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Squad não encontrada")
      setData(await res.json())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [squadName])

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
        <p className="mt-8 text-center text-muted-foreground">Squad não encontrada ou sem vulnerabilidades.</p>
      </div>
    )
  }

  const severityData = Object.entries(data.bySeverity).map(([key, value]) => ({
    name: SEVERITY_LABELS[key] || key,
    value,
    color: SEVERITY_COLORS[key] || "#888",
  }))

  const statusData = Object.entries(data.byStatus).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
  }))

  const owaspData = Object.entries(data.byOwasp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, value]) => ({
      name: key.length > 25 ? key.substring(0, 25) + "…" : key,
      count: value,
    }))

  return (
    <div className="p-6 space-y-6">
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
            <p className="text-xs text-muted-foreground">Ext + Crít</p>
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
              <span className="text-sm text-muted-foreground">Taxa de Resolução</span>
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
              <span className="text-sm text-muted-foreground">Últimos 30 dias</span>
              <span className="text-sm font-medium flex items-center gap-1">
                {data.trendDirection === "improving" && <TrendingDown className="h-4 w-4 text-emerald-400" />}
                {data.trendDirection === "worsening" && <TrendingUp className="h-4 w-4 text-red-400" />}
                {data.trendDirection === "stable" && <Minus className="h-4 w-4 text-zinc-400" />}
                <span className={
                  data.trendDirection === "improving" ? "text-emerald-400"
                  : data.trendDirection === "worsening" ? "text-red-400"
                  : "text-zinc-400"
                }>
                  {data.trendDirection === "improving" ? "Melhorando" : data.trendDirection === "worsening" ? "Piorando" : "Estável"}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Tendência Mensal</CardTitle>
            <CardDescription>Vulnerabilidades abertas vs fechadas (6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
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
            <CardTitle className="text-base">Distribuição por Severidade</CardTitle>
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
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={200} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
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
                    <th className="text-left py-3 px-2 font-medium">Código</th>
                    <th className="text-left py-3 px-2 font-medium">Título</th>
                    <th className="text-center py-3 px-2 font-medium">Severidade</th>
                    <th className="text-center py-3 px-2 font-medium">Dias Aberto</th>
                    <th className="text-center py-3 px-2 font-medium">SLA</th>
                    <th className="text-left py-3 px-2 font-medium">Responsável</th>
                    <th className="text-left py-3 px-2 font-medium">Sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openVulns.map((v) => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2">
                        <Link href={`/vulnerabilidades/${v.id}`} className="text-primary hover:underline font-mono text-xs">
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
                      <td className="py-2.5 px-2 text-muted-foreground">{v.responsavel || "—"}</td>
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
