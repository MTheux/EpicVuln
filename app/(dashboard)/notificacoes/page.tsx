"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Clock,
  Shield,
  RefreshCw,
  ExternalLink,
  Flame,
  Timer,
  ChevronDown,
  ChevronUp,
  Filter,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'

interface Vulnerability {
  id: string
  codigoInterno: string
  titulo: string
  criticidade: string
  status: string
  squad: string
  sla: string | null
  diasEmAberto: number
  dataCriacao: string
  sistema: string
  responsavel: string | null
  jiraKey?: string
  jiraUrl?: string
}

const OPEN_STATUSES = ['NOVO', 'ABERTO', 'EM_BACKLOG', 'EM_CORRECAO', 'EM_RETESTE']

const CRITICIDADE_ORDER: Record<string, number> = {
  'EXTREMA': 0,
  'CRITICA': 1,
  'ALTA': 2,
  'MEDIA': 3,
  'BAIXA': 4,
  'INFORMATIVA': 5,
}

const CRITICIDADE_COLORS: Record<string, string> = {
  'EXTREMA': 'bg-red-600 text-white',
  'CRITICA': 'bg-red-500 text-white',
  'ALTA': 'bg-orange-500 text-white',
  'MEDIA': 'bg-amber-500 text-black',
  'BAIXA': 'bg-green-500 text-white',
  'INFORMATIVA': 'bg-blue-500 text-white',
}

const STATUS_LABELS: Record<string, string> = {
  'NOVO': 'Nova',
  'ABERTO': 'Aberta',
  'EM_BACKLOG': 'Em Backlog',
  'EM_CORRECAO': 'Em Correção',
  'EM_RETESTE': 'Em Reteste',
}

export default function AlertasPage() {
  const [vulns, setVulns] = useState<Vulnerability[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSquad, setFilterSquad] = useState<string>("all")
  const [expandedExtremas, setExpandedExtremas] = useState(true)
  const [expandedSla, setExpandedSla] = useState(true)
  const [expandedCriticas, setExpandedCriticas] = useState(false)

  const fetchVulns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/vulnerabilities`, { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []
        setVulns(data)
      } else {
        setVulns([])
      }
    } catch (err) {
      console.error('Failed to fetch vulnerabilities:', err)
      toast.error('Erro ao carregar vulnerabilidades')
      setVulns([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVulns() }, [fetchVulns])

  const now = new Date()

  // Filter open vulns
  const openVulns = vulns.filter(v => OPEN_STATUSES.includes(v.status))

  // Get unique squads
  const squads = [...new Set(openVulns.map(v => v.squad).filter(Boolean))].sort()

  // Apply squad filter
  const filtered = filterSquad === "all" ? openVulns : openVulns.filter(v => v.squad === filterSquad)

  // Extremas (EXTREMA criticidade, abertas)
  const extremas = filtered
    .filter(v => v.criticidade === 'EXTREMA')
    .sort((a, b) => b.diasEmAberto - a.diasEmAberto)

  // Críticas (CRITICA criticidade, abertas)
  const criticas = filtered
    .filter(v => v.criticidade === 'CRITICA')
    .sort((a, b) => b.diasEmAberto - a.diasEmAberto)

  // SLA Vencidos (todas abertas com SLA expirado)
  const slaVencidos = filtered
    .filter(v => {
      if (!v.sla) return false
      return new Date(v.sla) < now
    })
    .sort((a, b) => {
      const aDate = a.sla ? now.getTime() - new Date(a.sla).getTime() : 0
      const bDate = b.sla ? now.getTime() - new Date(b.sla).getTime() : 0
      return bDate - aDate
    })

  // Stats
  const totalOpen = filtered.length
  const totalExtremas = extremas.length
  const totalSlaVencidos = slaVencidos.length
  const totalCriticas = criticas.length

  function getDaysOverdue(sla: string): number {
    return Math.floor((now.getTime() - new Date(sla).getTime()) / (1000 * 60 * 60 * 24))
  }

  function getOverdueColor(days: number): string {
    if (days > 30) return "text-red-500"
    if (days > 14) return "text-orange-500"
    return "text-amber-500"
  }

  function getOverdueBg(days: number): string {
    if (days > 30) return "bg-red-500/10 border-red-500/20"
    if (days > 14) return "bg-orange-500/10 border-orange-500/20"
    return "bg-amber-500/10 border-amber-500/20"
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Alertas</h1>
            <p className="text-sm text-muted-foreground">
              Vulnerabilidades críticas e SLAs vencidos que precisam de atenção imediata
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterSquad} onValueChange={setFilterSquad}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar squad..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Squads</SelectItem>
              {squads.map(sq => (
                <SelectItem key={sq} value={sq}>{sq}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchVulns} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abertas (Total)</p>
                <p className="text-2xl font-bold text-foreground">{totalOpen}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-border", totalExtremas > 0 ? "bg-red-500/5 border-red-500/20" : "bg-card")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Flame className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Extremas Abertas</p>
                <p className={cn("text-2xl font-bold", totalExtremas > 0 ? "text-red-500" : "text-foreground")}>{totalExtremas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-border", totalCriticas > 0 ? "bg-orange-500/5 border-orange-500/20" : "bg-card")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Críticas Abertas</p>
                <p className={cn("text-2xl font-bold", totalCriticas > 0 ? "text-orange-500" : "text-foreground")}>{totalCriticas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-border", totalSlaVencidos > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-card")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Timer className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SLAs Vencidos</p>
                <p className={cn("text-2xl font-bold", totalSlaVencidos > 0 ? "text-amber-500" : "text-foreground")}>{totalSlaVencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {totalExtremas === 0 && totalSlaVencidos === 0 && totalCriticas === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
              <Shield className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Tudo sob controle!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Nenhuma vulnerabilidade extrema/crítica aberta e nenhum SLA vencido
              {filterSquad !== "all" ? ` para ${filterSquad}` : ""}.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* EXTREMAS */}
        {extremas.length > 0 && (
          <Card className="bg-card border-red-500/30 shadow-red-500/5 shadow-lg">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setExpandedExtremas(!expandedExtremas)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                    <Flame className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-red-500 flex items-center gap-2">
                      Vulnerabilidades Extremas
                      <Badge className="bg-red-600 text-white">{extremas.length}</Badge>
                    </CardTitle>
                    <CardDescription>Risco imediato — correção prioritária obrigatória</CardDescription>
                  </div>
                </div>
                {expandedExtremas ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            {expandedExtremas && (
              <CardContent>
                <div className="space-y-3">
                  {extremas.map(vuln => (
                    <VulnAlertRow key={vuln.id} vuln={vuln} now={now} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* SLA VENCIDOS */}
        {slaVencidos.length > 0 && (
          <Card className="bg-card border-amber-500/30 shadow-amber-500/5 shadow-lg">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setExpandedSla(!expandedSla)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                    <Timer className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-amber-500 flex items-center gap-2">
                      SLAs Vencidos
                      <Badge className="bg-amber-600 text-white">{slaVencidos.length}</Badge>
                    </CardTitle>
                    <CardDescription>Vulnerabilidades com prazo de correção expirado</CardDescription>
                  </div>
                </div>
                {expandedSla ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            {expandedSla && (
              <CardContent>
                <div className="space-y-3">
                  {slaVencidos.map(vuln => {
                    const daysOverdue = getDaysOverdue(vuln.sla!)
                    return (
                      <div
                        key={vuln.id}
                        className={cn("rounded-lg border p-4 transition-all hover:shadow-md", getOverdueBg(daysOverdue))}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={cn("text-[10px] shrink-0", CRITICIDADE_COLORS[vuln.criticidade] || "bg-muted text-muted-foreground")}>
                                {vuln.criticidade}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground shrink-0">
                                {STATUS_LABELS[vuln.status] || vuln.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{vuln.codigoInterno}</span>
                            </div>
                            <h4 className="text-sm font-medium text-foreground truncate">{vuln.titulo}</h4>
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="font-medium">Squad: {vuln.squad}</span>
                              <span>{vuln.diasEmAberto} dias aberta</span>
                              {vuln.sistema && <span>Sistema: {vuln.sistema}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className={cn("text-right", getOverdueColor(daysOverdue))}>
                              <span className="text-2xl font-black">{daysOverdue}</span>
                              <span className="text-xs font-medium block">dias atrasado</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              SLA: {new Date(vuln.sla!).toLocaleDateString('pt-BR')}
                            </div>
                            {vuln.jiraUrl && (
                              <a href={vuln.jiraUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Jira
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* CRÍTICAS */}
        {criticas.length > 0 && (
          <Card className="bg-card border-orange-500/30">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setExpandedCriticas(!expandedCriticas)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20">
                    <Shield className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-orange-500 flex items-center gap-2">
                      Vulnerabilidades Críticas
                      <Badge className="bg-orange-500 text-white">{criticas.length}</Badge>
                    </CardTitle>
                    <CardDescription>Correção em até 30 dias conforme política corporativa</CardDescription>
                  </div>
                </div>
                {expandedCriticas ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            {expandedCriticas && (
              <CardContent>
                <div className="space-y-3">
                  {criticas.map(vuln => (
                    <VulnAlertRow key={vuln.id} vuln={vuln} now={now} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {/* Summary by Squad */}
      {(totalExtremas > 0 || totalSlaVencidos > 0 || totalCriticas > 0) && filterSquad === "all" && (
        <Card className="bg-card border-border mt-6">
          <CardHeader>
            <CardTitle className="text-base">Resumo por Squad</CardTitle>
            <CardDescription>Visão consolidada de alertas pendentes por equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {squads.map(squad => {
                const squadVulns = openVulns.filter(v => v.squad === squad)
                const sqExtremas = squadVulns.filter(v => v.criticidade === 'EXTREMA').length
                const sqCriticas = squadVulns.filter(v => v.criticidade === 'CRITICA').length
                const sqSlaVencidos = squadVulns.filter(v => v.sla && new Date(v.sla) < now).length
                const totalAlerts = sqExtremas + sqCriticas + sqSlaVencidos

                if (totalAlerts === 0) return null

                return (
                  <div key={squad} className="flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground">{squad}</span>
                        <span className="text-xs text-muted-foreground">({squadVulns.length} abertas)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min(100, totalAlerts * 10)}
                          className="h-1.5 flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sqExtremas > 0 && (
                        <Badge className="bg-red-600 text-white text-xs">
                          {sqExtremas} extrema{sqExtremas > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {sqCriticas > 0 && (
                        <Badge className="bg-orange-500 text-white text-xs">
                          {sqCriticas} crítica{sqCriticas > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {sqSlaVencidos > 0 && (
                        <Badge className="bg-amber-500 text-black text-xs">
                          {sqSlaVencidos} SLA{sqSlaVencidos > 1 ? 's' : ''} vencido{sqSlaVencidos > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VulnAlertRow({ vuln, now }: { vuln: Vulnerability; now: Date }) {
  const slaExpired = vuln.sla ? new Date(vuln.sla) < now : false
  const daysOverdue = vuln.sla ? Math.floor((now.getTime() - new Date(vuln.sla).getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 transition-all hover:bg-muted/50 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={cn("text-[10px] shrink-0", CRITICIDADE_COLORS[vuln.criticidade] || "bg-muted text-muted-foreground")}>
              {vuln.criticidade}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground shrink-0">
              {STATUS_LABELS[vuln.status] || vuln.status}
            </Badge>
            {slaExpired && (
              <Badge className="bg-amber-500/20 text-amber-500 text-[10px] shrink-0">
                <Timer className="mr-1 h-3 w-3" />
                SLA +{daysOverdue}d
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{vuln.codigoInterno}</span>
          </div>
          <h4 className="text-sm font-medium text-foreground truncate">{vuln.titulo}</h4>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">Squad: {vuln.squad}</span>
            <span>{vuln.diasEmAberto} dias aberta</span>
            {vuln.sistema && <span>Sistema: {vuln.sistema}</span>}
            {vuln.sla && (
              <span className={slaExpired ? "text-amber-500 font-medium" : ""}>
                SLA: {new Date(vuln.sla).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right mr-2">
            <span className={cn("text-lg font-black", vuln.diasEmAberto > 30 ? "text-red-500" : vuln.diasEmAberto > 14 ? "text-orange-500" : "text-foreground")}>
              {vuln.diasEmAberto}
            </span>
            <span className="text-[10px] text-muted-foreground block">dias</span>
          </div>
          {vuln.jiraUrl && (
            <a href={vuln.jiraUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ExternalLink className="mr-1 h-3 w-3" />
                Jira
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
