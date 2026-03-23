"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  AlertTriangle, Clock, Shield, RefreshCw, ExternalLink, Flame,
  Timer, ChevronDown, ChevronUp, Filter, Eye, Bell, BellRing,
  TrendingUp, Zap, X, Search, ArrowRight, Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"
import { useSlaConfig } from "@/lib/use-sla"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}

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

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  'EXTREMA': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500', label: 'Extrema' },
  'CRITICA': { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500', label: 'Critica' },
  'ALTA': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', label: 'Alta' },
  'MEDIA': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500', label: 'Media' },
  'BAIXA': { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-500', label: 'Baixa' },
  'INFORMATIVA': { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500', label: 'Info' },
}

const STATUS_LABELS: Record<string, string> = {
  'NOVO': 'Nova', 'ABERTO': 'Aberta', 'EM_BACKLOG': 'Em Backlog',
  'EM_CORRECAO': 'Em Correção', 'EM_RETESTE': 'Em Reteste',
}

export default function AlertasPage() {
  const { getSlaForSeverity } = useSlaConfig()
  const [vulns, setVulns] = useState<Vulnerability[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSquad, setFilterSquad] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string>('all')

  const fetchVulns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/vulnerabilities`, { headers: authHeaders(), credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setVulns(Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [])
      } else { setVulns([]) }
    } catch { toast.error('Erro ao carregar vulnerabilidades'); setVulns([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchVulns() }, [fetchVulns])

  const now = new Date()
  const openVulns = vulns.filter(v => OPEN_STATUSES.includes(v.status))
  const squads = [...new Set(openVulns.map(v => v.squad).filter(Boolean))].sort()

  const filtered = openVulns.filter(v => {
    if (filterSquad && v.squad !== filterSquad) return false
    if (filterSearch && !v.titulo.toLowerCase().includes(filterSearch.toLowerCase()) && !v.codigoInterno.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  })

  const extremas = filtered.filter(v => v.criticidade === 'EXTREMA').sort((a, b) => b.diasEmAberto - a.diasEmAberto)
  const criticas = filtered.filter(v => v.criticidade === 'CRITICA').sort((a, b) => b.diasEmAberto - a.diasEmAberto)
  const slaVencidos = filtered.filter(v => v.sla && new Date(v.sla) < now).sort((a, b) => {
    const aD = a.sla ? now.getTime() - new Date(a.sla).getTime() : 0
    const bD = b.sla ? now.getTime() - new Date(b.sla).getTime() : 0
    return bD - aD
  })
  const altas = filtered.filter(v => v.criticidade === 'ALTA').sort((a, b) => b.diasEmAberto - a.diasEmAberto)

  const totalOpen = filtered.length
  const hasFilters = filterSquad || filterSearch

  // Determine threat level
  const threatLevel = extremas.length > 0 ? 'critical' : criticas.length > 3 ? 'high' : slaVencidos.length > 0 ? 'medium' : 'low'
  const threatConfig = {
    critical: { label: 'CRITICO', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', pulse: true },
    high: { label: 'ALTO', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', pulse: true },
    medium: { label: 'MODERADO', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', pulse: false },
    low: { label: 'BAIXO', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', pulse: false },
  }[threatLevel]

  const sections = [
    { id: 'all', label: 'Todos', count: extremas.length + criticas.length + slaVencidos.length },
    { id: 'extremas', label: 'Extremas', count: extremas.length, color: 'text-red-400' },
    { id: 'criticas', label: 'Criticas', count: criticas.length, color: 'text-orange-400' },
    { id: 'sla', label: 'SLA Vencido', count: slaVencidos.length, color: 'text-amber-400' },
    { id: 'altas', label: 'Altas', count: altas.length, color: 'text-yellow-400' },
  ]

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando alertas...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/20">
              <BellRing className="h-6 w-6 text-red-400" />
            </div>
            {(extremas.length > 0 || slaVencidos.length > 0) && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <span className="text-[8px] font-bold text-white">{extremas.length + slaVencidos.length}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Central de <span className="text-red-400">Alertas</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitoramento contínuo de vulnerabilidades críticas e prazos de correção
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVulns} disabled={loading} className="bg-card border-border hover:bg-muted self-start md:self-auto">
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Threat Level Banner */}
      <div className={cn("rounded-2xl border p-5", threatConfig.bg, threatConfig.border)}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Activity className={cn("h-8 w-8", threatConfig.color)} />
              {threatConfig.pulse && <div className={cn("absolute inset-0 animate-ping opacity-30", threatConfig.color)}><Activity className="h-8 w-8" /></div>}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nivel de Ameaca</span>
                <span className={cn("text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md", threatConfig.bg, threatConfig.color, "border", threatConfig.border)}>
                  {threatConfig.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {extremas.length > 0
                  ? `${extremas.length} vulnerabilidade${extremas.length > 1 ? 's' : ''} extrema${extremas.length > 1 ? 's' : ''} requer${extremas.length > 1 ? 'em' : ''} ação imediata`
                  : slaVencidos.length > 0
                  ? `${slaVencidos.length} SLA${slaVencidos.length > 1 ? 's' : ''} vencido${slaVencidos.length > 1 ? 's' : ''} — prazo de correção expirado`
                  : 'Nenhuma ameaça crítica detectada no momento'
                }
              </p>
            </div>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-6">
            {[
              { label: 'Abertas', value: totalOpen, icon: Eye, color: 'text-foreground' },
              { label: 'Extremas', value: extremas.length, icon: Flame, color: 'text-red-400' },
              { label: 'Criticas', value: criticas.length, icon: AlertTriangle, color: 'text-orange-400' },
              { label: 'SLA Vencido', value: slaVencidos.length, icon: Timer, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={cn("text-2xl font-black", s.value > 0 ? s.color : 'text-muted-foreground')}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-card/50 rounded-xl border border-border p-1">
          {sections.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeSection === sec.id
                  ? "bg-card shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn(activeSection === sec.id && sec.color)}>{sec.label}</span>
              {sec.count > 0 && (
                <span className={cn("ml-1.5 text-[10px] font-bold", sec.color || 'text-muted-foreground')}>
                  {sec.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search + Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar alerta..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="pl-9 h-8 w-48 text-xs rounded-lg"
            />
          </div>
          <select
            value={filterSquad}
            onChange={e => setFilterSquad(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">Todas Squads</option>
            {squads.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterSquad(''); setFilterSearch('') }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {extremas.length === 0 && criticas.length === 0 && slaVencidos.length === 0 && altas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
            <Shield className="h-10 w-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Tudo sob controle!</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Nenhuma vulnerabilidade extrema, critica ou SLA vencido detectado
            {filterSquad ? ` para ${filterSquad}` : ''}.
          </p>
        </div>
      )}

      {/* Alert Sections */}
      <div className="space-y-4">
        {/* EXTREMAS */}
        {(activeSection === 'all' || activeSection === 'extremas') && extremas.length > 0 && (
          <AlertSection
            title="Vulnerabilidades Extremas"
            subtitle="Correção imediata obrigatória — risco máximo"
            icon={Flame}
            color="red"
            count={extremas.length}
            items={extremas}
            now={now}
            defaultExpanded
          />
        )}

        {/* SLA VENCIDOS */}
        {(activeSection === 'all' || activeSection === 'sla') && slaVencidos.length > 0 && (
          <AlertSection
            title="SLAs Vencidos"
            subtitle="Prazo de correção expirado — não conforme"
            icon={Timer}
            color="amber"
            count={slaVencidos.length}
            items={slaVencidos}
            now={now}
            showSlaOverdue
            defaultExpanded
          />
        )}

        {/* CRITICAS */}
        {(activeSection === 'all' || activeSection === 'criticas') && criticas.length > 0 && (
          <AlertSection
            title="Vulnerabilidades Criticas"
            subtitle={`Correção em até ${getSlaForSeverity('CRITICA')} dias conforme politica corporativa`}
            icon={AlertTriangle}
            color="orange"
            count={criticas.length}
            items={criticas}
            now={now}
            defaultExpanded={activeSection === 'criticas'}
          />
        )}

        {/* ALTAS */}
        {(activeSection === 'altas') && altas.length > 0 && (
          <AlertSection
            title="Vulnerabilidades Altas"
            subtitle={`Correção em até ${getSlaForSeverity('ALTA')} dias conforme politica corporativa`}
            icon={Shield}
            color="yellow"
            count={altas.length}
            items={altas}
            now={now}
            defaultExpanded
          />
        )}
      </div>

      {/* Squad Summary */}
      {(extremas.length > 0 || criticas.length > 0 || slaVencidos.length > 0) && !filterSquad && activeSection === 'all' && (
        <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h3 className="text-sm font-bold text-foreground">Resumo por Squad</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribuição de alertas por equipe</p>
          </div>
          <div className="divide-y divide-border">
            {squads.map(squad => {
              const sv = openVulns.filter(v => v.squad === squad)
              const ext = sv.filter(v => v.criticidade === 'EXTREMA').length
              const crit = sv.filter(v => v.criticidade === 'CRITICA').length
              const sla = sv.filter(v => v.sla && new Date(v.sla) < now).length
              if (ext + crit + sla === 0) return null

              const total = ext + crit + sla
              const maxBar = Math.max(...squads.map(s => {
                const sq = openVulns.filter(v => v.squad === s)
                return sq.filter(v => v.criticidade === 'EXTREMA').length + sq.filter(v => v.criticidade === 'CRITICA').length + sq.filter(v => v.sla && new Date(v.sla) < now).length
              }))

              return (
                <div key={squad} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-muted-foreground">{squad.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-foreground">{squad}</span>
                      <span className="text-xs text-muted-foreground">{sv.length} abertas</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", ext > 0 ? 'bg-red-500' : crit > 0 ? 'bg-orange-500' : 'bg-amber-500')}
                        style={{ width: `${Math.min(100, (total / Math.max(maxBar, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ext > 0 && <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[10px] font-bold">{ext} ext</span>}
                    {crit > 0 && <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 text-[10px] font-bold">{crit} crit</span>}
                    {sla > 0 && <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold">{sla} SLA</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Alert Section Component ---

interface AlertSectionProps {
  title: string
  subtitle: string
  icon: any
  color: string
  count: number
  items: Vulnerability[]
  now: Date
  showSlaOverdue?: boolean
  defaultExpanded?: boolean
}

function AlertSection({ title, subtitle, icon: Icon, color, count, items, now, showSlaOverdue, defaultExpanded = false }: AlertSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string; headerBg: string }> = {
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-500', headerBg: 'bg-gradient-to-r from-red-500/10 to-transparent' },
    orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500', headerBg: 'bg-gradient-to-r from-orange-500/10 to-transparent' },
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', headerBg: 'bg-gradient-to-r from-amber-500/10 to-transparent' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500', headerBg: 'bg-gradient-to-r from-yellow-500/10 to-transparent' },
  }

  const c = colorMap[color] || colorMap.red

  return (
    <div className={cn("rounded-2xl border overflow-hidden transition-all", c.border, expanded ? 'shadow-lg' : '')}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn("w-full flex items-center justify-between px-5 py-4 transition-colors", c.headerBg, "hover:opacity-90")}
      >
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", c.bg, "border", c.border)}>
            <Icon className={cn("h-4.5 w-4.5", c.text)} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-bold", c.text)}>{title}</span>
              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", c.bg, c.text, "border", c.border)}>
                {count}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Items */}
      {expanded && (
        <div className="divide-y divide-border/50">
          {items.map(vuln => {
            const sev = SEVERITY_CONFIG[vuln.criticidade] || SEVERITY_CONFIG['INFORMATIVA']
            const slaExpired = vuln.sla ? new Date(vuln.sla) < now : false
            const daysOverdue = vuln.sla ? Math.max(0, Math.floor((now.getTime() - new Date(vuln.sla).getTime()) / (1000 * 60 * 60 * 24))) : 0
            const daysColor = vuln.diasEmAberto > 60 ? 'text-red-400' : vuln.diasEmAberto > 30 ? 'text-orange-400' : 'text-muted-foreground'

            return (
              <Link
                key={vuln.id}
                href={`/vulnerabilidades/${vuln.codigoInterno}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-all group"
              >
                {/* Severity dot */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={cn("h-2.5 w-2.5 rounded-full", sev.dot)} />
                  {slaExpired && <Timer className="h-3 w-3 text-amber-400" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{vuln.codigoInterno}</span>
                    <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded", sev.bg, sev.color, "border", sev.border)}>
                      {sev.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-card">
                      {STATUS_LABELS[vuln.status] || vuln.status}
                    </span>
                    {slaExpired && showSlaOverdue && (
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        +{daysOverdue}d atraso
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-400 transition-colors">
                    {vuln.titulo}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span className="font-medium">{vuln.squad}</span>
                    {vuln.sistema && <span>{vuln.sistema}</span>}
                    {vuln.responsavel && <span>{vuln.responsavel}</span>}
                    {vuln.sla && (
                      <span className={slaExpired ? 'text-amber-400' : ''}>
                        SLA: {new Date(vuln.sla).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className={cn("text-xl font-black", daysColor)}>{vuln.diasEmAberto}</span>
                    <span className="text-[9px] text-muted-foreground block uppercase">dias</span>
                  </div>
                  {vuln.jiraKey && (
                    <a
                      href={vuln.jiraUrl || `https://jira.atlassian.net/browse/${vuln.jiraKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] font-mono text-blue-400/70 hover:text-blue-400 transition-colors"
                    >
                      {vuln.jiraKey}
                    </a>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
