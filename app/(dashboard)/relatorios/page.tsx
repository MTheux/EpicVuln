"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  Shield,
  Users,
  RefreshCw,
  Bug,
  Timer,
  XCircle,
  UserX,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { authHeaders, getAuthToken } from "@/lib/auth"
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

interface Insights {
  resumo: {
    totalAberto: number
    totalExtremaCritica: number
    totalSlaVencido: number
    novasUltimos30d: number
    fechadasUltimos30d: number
    semResponsavel: number
    totalSquads: number
  }
  topFalhas: Array<{ label: string; count: number }>
  slowestSquads: Array<{ squad: string; mttrDays: number; resolved: number }>
  backlogEterno: Array<{
    codigoInterno: string
    titulo: string
    squad: string
    criticidade: string
    diasEmAberto: number
    status: string
    responsavel: string
  }>
  squadsSlaVencido: Array<{ squad: string; slaVencido: number }>
  byOrigem: Array<{ origem: string; count: number }>
  severidadeAberta: Record<string, number>
}

const SEVERITY_COLORS: Record<string, string> = {
  Extrema: "#ef4444", Crítica: "#f97316", Alta: "#eab308",
  Média: "#3b82f6", Baixa: "#22c55e", Informativa: "#8b5cf6",
}

const ORIGEM_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#06b6d4"]

export default function RelatoriosPage() {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  const fetchInsights = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/reports/insights`, { headers: authHeaders() })
      if (!res.ok) throw new Error("Falha ao carregar insights")
      setData(await res.json())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInsights() }, [])

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(format)
    try {
      const token = getAuthToken()
      const res = await fetch(`${API_URL}/api/reports/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Falha ao gerar relatório")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vulncontrol-relatorio-${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Relatório ${format.toUpperCase()} baixado!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setExporting(null)
    }
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
        <h1 className="text-2xl font-bold text-foreground mb-4">Relatórios</h1>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum dado disponível.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const r = data.resumo
  const sevData = Object.entries(data.severidadeAberta).map(([name, value]) => ({
    name, value, color: SEVERITY_COLORS[name] || "#888",
  }))

  const origemData = data.byOrigem.map((o, i) => ({
    name: o.origem, count: o.count, fill: ORIGEM_COLORS[i % ORIGEM_COLORS.length],
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios & Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados para reunião semanal — visão do time de pentest
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            disabled={!!exporting}
          >
            {exporting === "excel" ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-400" />
            )}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={!!exporting}
          >
            {exporting === "pdf" ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4 text-red-400" />
            )}
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={fetchInsights} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Abertas", value: r.totalAberto, icon: Bug, color: "text-orange-400", bg: "bg-orange-500/20" },
          { label: "Ext + Crít", value: r.totalExtremaCritica, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20" },
          { label: "SLA Vencido", value: r.totalSlaVencido, icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
          { label: "Sem Dono", value: r.semResponsavel, icon: UserX, color: "text-yellow-400", bg: "bg-yellow-500/20" },
          { label: "Novas (30d)", value: r.novasUltimos30d, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/20" },
          { label: "Fechadas (30d)", value: r.fechadasUltimos30d, icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/20" },
          { label: "Squads", value: r.totalSquads, icon: Users, color: "text-purple-400", bg: "bg-purple-500/20" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", kpi.bg)}>
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                </div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Falhas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-400" />
              Top Falhas Mais Reportadas
            </CardTitle>
            <CardDescription>Tipos de vulnerabilidade mais encontrados pelo pentest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.topFalhas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topFalhas.map(f => ({
                      name: f.label.length > 20 ? f.label.substring(0, 20) + "…" : f.label,
                      count: f.count,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} width={160} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center pt-20">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Squads mais lentas (MTTR) */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-400" />
              Squads Mais Lentas (MTTR)
            </CardTitle>
            <CardDescription>Tempo médio de correção em dias — quanto maior, pior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.slowestSquads.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.slowestSquads.map(s => ({
                      name: s.squad.length > 15 ? s.squad.substring(0, 15) + "…" : s.squad,
                      mttr: s.mttrDays,
                      fill: s.mttrDays > 30 ? "#ef4444" : s.mttrDays > 15 ? "#f97316" : "#22c55e",
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="mttr" name="MTTR (dias)" radius={[0, 4, 4, 0]}>
                      {data.slowestSquads.map((s, i) => (
                        <Cell key={i} fill={s.mttrDays > 30 ? "#ef4444" : s.mttrDays > 15 ? "#f97316" : "#22c55e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center pt-20">Nenhuma squad com correções</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Severidade */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Severidade (Abertas)</CardTitle>
            <CardDescription>Distribuição atual das vulnerabilidades abertas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {sevData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sevData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {sevData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center pt-20">Nenhuma aberta</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Origem das falhas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Origem das Vulnerabilidades
            </CardTitle>
            <CardDescription>De onde vieram (Pentest, SAST, DAST, SCA...)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {origemData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={origemData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" fontSize={11} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="count" name="Quantidade" radius={[4, 4, 0, 0]}>
                      {origemData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center pt-20">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Vencido por Squad */}
      {data.squadsSlaVencido.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              SLA Vencido por Squad
            </CardTitle>
            <CardDescription>Squads com vulnerabilidades fora do prazo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.squadsSlaVencido.map((s) => (
                <div key={s.squad} className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <span className="text-sm text-foreground truncate mr-2">{s.squad}</span>
                  <Badge className="bg-red-500/20 text-red-400 font-bold">{s.slaVencido}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backlog Eterno */}
      {data.backlogEterno.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              Backlog Eterno (&gt;30 dias abertas)
            </CardTitle>
            <CardDescription>
              Vulnerabilidades que ficaram estagnadas — ideal para cobrar na reunião
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Código</th>
                    <th className="text-left py-3 px-2 font-medium">Título</th>
                    <th className="text-left py-3 px-2 font-medium">Squad</th>
                    <th className="text-center py-3 px-2 font-medium">Severidade</th>
                    <th className="text-center py-3 px-2 font-medium">Dias</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {data.backlogEterno.map((v) => (
                    <tr key={v.codigoInterno} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-2 font-mono text-xs text-primary">{v.codigoInterno}</td>
                      <td className="py-2.5 px-2 text-foreground max-w-[250px] truncate">{v.titulo}</td>
                      <td className="py-2.5 px-2 text-foreground">{v.squad}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: `${SEVERITY_COLORS[v.criticidade] || "#888"}20`,
                            color: SEVERITY_COLORS[v.criticidade] || "#888",
                          }}
                        >
                          {v.criticidade}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={v.diasEmAberto > 60 ? "text-red-400 font-bold" : "text-orange-400 font-medium"}>
                          {v.diasEmAberto}d
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-muted-foreground text-xs">{v.status}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{v.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
