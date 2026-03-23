"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  GripVertical, Filter, X, Search, Clock, User, AlertTriangle,
  ArrowRight, RefreshCw, BarChart3, Eye, ChevronDown, Layers
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SeverityBadge } from "@/components/severity-badge"
import { useVulnStore } from "@/lib/vuln-store"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"
import type { Vulnerabilidade, Status } from "@/lib/types"

// --- Constants ---

const STATUS_TO_ENUM: Record<string, string> = {
  'Nova': 'NOVO', 'Aberta': 'ABERTO', 'Em Backlog': 'EM_BACKLOG',
  'Em Correção': 'EM_CORRECAO', 'Em Reteste': 'EM_RETESTE',
  'Mitigada': 'MITIGADO', 'Concluída': 'CONCLUIDO',
  'Risco Aceito': 'RISCO_ACEITO', 'Fechada': 'FECHADO',
}

interface KanbanColumn {
  id: string
  title: string
  statuses: Status[]
  defaultStatus: string
  color: string
  gradient: string
  dotColor: string
  icon: string
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'novo', title: 'Novo', statuses: ['Nova'], defaultStatus: 'NOVO',
    color: 'text-slate-400', gradient: 'from-slate-500/20 to-slate-500/5',
    dotColor: 'bg-slate-400', icon: '🆕',
  },
  {
    id: 'aberta-backlog', title: 'Aberta / Backlog', statuses: ['Aberta', 'Em Backlog'], defaultStatus: 'ABERTO',
    color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-500/5',
    dotColor: 'bg-blue-400', icon: '📋',
  },
  {
    id: 'em-correcao', title: 'Em Correção', statuses: ['Em Correção'], defaultStatus: 'EM_CORRECAO',
    color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5',
    dotColor: 'bg-amber-400', icon: '🔧',
  },
  {
    id: 'em-reteste', title: 'Em Reteste', statuses: ['Em Reteste'], defaultStatus: 'EM_RETESTE',
    color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-500/5',
    dotColor: 'bg-purple-400', icon: '🔬',
  },
  {
    id: 'concluido', title: 'Concluido', statuses: ['Mitigada', 'Concluída', 'Fechada'], defaultStatus: 'CONCLUIDO',
    color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5',
    dotColor: 'bg-emerald-400', icon: '✅',
  },
  {
    id: 'risco-aceito', title: 'Risco Aceito', statuses: ['Risco Aceito'], defaultStatus: 'RISCO_ACEITO',
    color: 'text-orange-400', gradient: 'from-orange-500/20 to-orange-500/5',
    dotColor: 'bg-orange-400', icon: '⚠️',
  },
]

const SEVERITY_BORDER: Record<string, string> = {
  'Extrema': 'border-l-red-500', 'Critica': 'border-l-orange-500', 'Crítica': 'border-l-orange-500',
  'Alta': 'border-l-yellow-500', 'Media': 'border-l-blue-500', 'Média': 'border-l-blue-500',
  'Baixa': 'border-l-green-500', 'Informativa': 'border-l-slate-400',
}

const SEVERITY_DOT: Record<string, string> = {
  'Extrema': 'bg-red-500', 'Critica': 'bg-orange-500', 'Crítica': 'bg-orange-500',
  'Alta': 'bg-yellow-500', 'Media': 'bg-blue-500', 'Média': 'bg-blue-500',
  'Baixa': 'bg-green-500', 'Informativa': 'bg-slate-400',
}

const CRITICIDADE_OPTIONS = ['Extrema', 'Crítica', 'Alta', 'Média', 'Baixa', 'Informativa']

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}

function truncate(str: string, max: number) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function getDaysColor(days: number) {
  if (days > 90) return 'text-red-400'
  if (days > 30) return 'text-amber-400'
  return 'text-muted-foreground'
}

function getSlaIndicator(vuln: Vulnerabilidade) {
  if (!vuln.sla) return null
  const slaDate = new Date(vuln.sla)
  const now = new Date()
  const diasRestantes = Math.ceil((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diasRestantes < 0) return { status: 'expired', label: `SLA vencido`, color: 'bg-red-500' }
  if (diasRestantes <= 7) return { status: 'warning', label: `${diasRestantes}d`, color: 'bg-amber-500' }
  return { status: 'ok', label: `${diasRestantes}d`, color: 'bg-emerald-500' }
}

// --- Component ---

export default function KanbanPage() {
  const router = useRouter()
  const { vulnerabilidades, fetchVulnerabilidades, isLoading } = useVulnStore()
  const [filterSquad, setFilterSquad] = useState('')
  const [filterCriticidade, setFilterCriticidade] = useState('')
  const [filterResponsavel, setFilterResponsavel] = useState('')
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [compactView, setCompactView] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const dragDataRef = useRef<{ id: string; dbId: string; currentStatus: string } | null>(null)
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, Status>>({})

  useEffect(() => { fetchVulnerabilidades() }, [fetchVulnerabilidades])

  const effectiveVulns = useMemo(() =>
    vulnerabilidades.map(v => optimisticMoves[v.id] ? { ...v, status: optimisticMoves[v.id] } : v),
    [vulnerabilidades, optimisticMoves]
  )

  const filtered = useMemo(() =>
    effectiveVulns.filter(v => {
      if (filterSquad && v.squad !== filterSquad) return false
      if (filterCriticidade && v.criticidade !== filterCriticidade) return false
      if (filterResponsavel && !(v.responsavel || '').toLowerCase().includes(filterResponsavel.toLowerCase())) return false
      return true
    }),
    [effectiveVulns, filterSquad, filterCriticidade, filterResponsavel]
  )

  const squads = useMemo(() =>
    Array.from(new Set(vulnerabilidades.map(v => v.squad).filter(Boolean))).sort(),
    [vulnerabilidades]
  )

  const columnVulns = useMemo(() => {
    const map: Record<string, Vulnerabilidade[]> = {}
    for (const col of COLUMNS) {
      map[col.id] = filtered
        .filter(v => col.statuses.includes(v.status))
        .sort((a, b) => {
          const sevOrder: Record<string, number> = { 'Extrema': 0, 'Crítica': 1, 'Alta': 2, 'Média': 3, 'Baixa': 4, 'Informativa': 5 }
          return (sevOrder[a.criticidade] ?? 9) - (sevOrder[b.criticidade] ?? 9)
        })
    }
    return map
  }, [filtered])

  // Stats
  const totalFiltered = filtered.length
  const totalVencidos = filtered.filter(v => {
    if (!v.sla) return false
    return new Date(v.sla) < new Date()
  }).length

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, vuln: Vulnerabilidade) => {
    const dbId = (vuln as any).dbId || vuln.id
    dragDataRef.current = { id: vuln.id, dbId: String(dbId), currentStatus: vuln.status }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(dragDataRef.current))
    // Make drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
      setTimeout(() => { if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1' }, 0)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeave = useCallback(() => { setDragOverColumn(null) }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, column: KanbanColumn) => {
    e.preventDefault()
    setDragOverColumn(null)
    let dragData = dragDataRef.current
    if (!dragData) {
      try { dragData = JSON.parse(e.dataTransfer.getData('text/plain')) } catch { return }
    }
    if (!dragData) return
    const { id, dbId, currentStatus } = dragData
    dragDataRef.current = null
    if (column.statuses.includes(currentStatus as Status)) return

    const enumToDisplay: Record<string, Status> = {
      'NOVO': 'Nova', 'ABERTO': 'Aberta', 'EM_BACKLOG': 'Em Backlog',
      'EM_CORRECAO': 'Em Correção', 'EM_RETESTE': 'Em Reteste',
      'MITIGADO': 'Mitigada', 'CONCLUIDO': 'Concluída',
      'RISCO_ACEITO': 'Risco Aceito', 'FECHADO': 'Fechada',
    }
    const newDisplayStatus = enumToDisplay[column.defaultStatus] || column.statuses[0]
    setOptimisticMoves(prev => ({ ...prev, [id]: newDisplayStatus }))

    try {
      const res = await fetch(`${getApiUrl()}/api/vulnerabilities/${dbId}`, {
        method: 'PATCH', headers: { ...authHeaders() }, credentials: 'include',
        body: JSON.stringify({ status: column.defaultStatus }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erro ao atualizar')
      toast.success(`Movido para ${column.title}`, { description: truncate(currentStatus + ' → ' + newDisplayStatus, 50) })
      await fetchVulnerabilidades()
      setOptimisticMoves(prev => { const n = { ...prev }; delete n[id]; return n })
    } catch (err: any) {
      setOptimisticMoves(prev => { const n = { ...prev }; delete n[id]; return n })
      toast.error(err.message || 'Erro ao atualizar status')
    }
  }, [fetchVulnerabilidades])

  const handleSyncJira = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/jira/sync`, {
        method: 'POST', headers: { ...authHeaders() }, credentials: 'include',
      })
      if (!res.ok) throw new Error('Erro na sincronizacao')
      toast.success('Jira sincronizado!', { description: 'Vulnerabilidades atualizadas com status do Jira' })
      await fetchVulnerabilidades()
    } catch (err: any) {
      toast.error(err.message)
    } finally { setSyncing(false) }
  }

  const hasFilters = filterSquad || filterCriticidade || filterResponsavel

  return (
    <div className="flex flex-col gap-5 p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Kanban <span className="text-blue-500">Board</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste as vulnerabilidades entre colunas para atualizar o fluxo de correcao
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" onClick={handleSyncJira} disabled={syncing}
            className="bg-card border-border hover:bg-muted"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sync Jira'}
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => setCompactView(!compactView)}
            className="bg-card border-border hover:bg-muted"
          >
            <Layers className="mr-2 h-4 w-4" />
            {compactView ? 'Expandir' : 'Compactar'}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{totalFiltered}</span>
          <span className="text-xs text-muted-foreground">vulnerabilidades</span>
        </div>
        <div className="h-4 w-px bg-border" />
        {COLUMNS.map(col => {
          const count = (columnVulns[col.id] || []).length
          return (
            <div key={col.id} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${col.dotColor}`} />
              <span className="text-xs text-muted-foreground">{col.title}:</span>
              <span className="text-xs font-semibold text-foreground">{count}</span>
            </div>
          )
        })}
        {totalVencidos > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">{totalVencidos} SLA vencido{totalVencidos > 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
        </div>

        <select
          value={filterSquad}
          onChange={e => setFilterSquad(e.target.value)}
          className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Todas as Squads</option>
          {squads.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterCriticidade}
          onChange={e => setFilterCriticidade(e.target.value)}
          className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Todas as Criticidades</option>
          {CRITICIDADE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Responsavel..."
            value={filterResponsavel}
            onChange={e => setFilterResponsavel(e.target.value)}
            className="h-8 pl-7 w-40 text-xs rounded-lg"
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setFilterSquad(''); setFilterCriticidade(''); setFilterResponsavel('') }}
            className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 pb-4">
        <div className="grid grid-cols-6 gap-3 h-full">
          {COLUMNS.map(column => {
            const vulns = columnVulns[column.id] || []
            const isDragOver = dragOverColumn === column.id

            return (
              <div
                key={column.id}
                className={`flex flex-col min-w-0 rounded-xl border transition-all duration-200 ${
                  isDragOver
                    ? 'border-blue-500/50 ring-2 ring-blue-500/20 scale-[1.01]'
                    : 'border-border/50'
                } bg-card/30 backdrop-blur-sm`}
                onDragOver={e => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, column)}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl bg-gradient-to-r ${column.gradient}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{column.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${column.color}`}>
                      {column.title}
                    </span>
                  </div>
                  <div className={`flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold ${column.color} bg-background/50`}>
                    {vulns.length}
                  </div>
                </div>

                {/* Drop Zone Indicator */}
                {isDragOver && (
                  <div className="mx-2 mt-2 rounded-lg border-2 border-dashed border-blue-500/40 bg-blue-500/5 py-3 text-center">
                    <span className="text-xs text-blue-400 font-medium">Solte aqui</span>
                  </div>
                )}

                {/* Column Body */}
                <div className="flex-1 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto p-2 space-y-2 scrollbar-thin">
                  {isLoading && vulns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mb-2" />
                      <span className="text-xs">Carregando...</span>
                    </div>
                  ) : vulns.length === 0 && !isDragOver ? (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground/50">
                      <div className="h-8 w-8 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-2">
                        <span className="text-lg">{column.icon}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider">Vazio</span>
                    </div>
                  ) : (
                    vulns.map(vuln => (
                      <VulnCard
                        key={vuln.id}
                        vuln={vuln}
                        compact={compactView}
                        onDragStart={handleDragStart}
                        onClick={() => router.push(`/vulnerabilidades/${vuln.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- Vuln Card ---

interface VulnCardProps {
  vuln: Vulnerabilidade
  compact: boolean
  onDragStart: (e: React.DragEvent, vuln: Vulnerabilidade) => void
  onClick: () => void
}

function VulnCard({ vuln, compact, onDragStart, onClick }: VulnCardProps) {
  const borderColor = SEVERITY_BORDER[vuln.criticidade] || 'border-l-slate-400'
  const severityDot = SEVERITY_DOT[vuln.criticidade] || 'bg-slate-400'
  const sla = getSlaIndicator(vuln)
  const daysColor = getDaysColor(vuln.diasEmAberto || 0)

  if (compact) {
    return (
      <div
        draggable
        onDragStart={e => onDragStart(e, vuln)}
        onClick={onClick}
        className={`group rounded-lg border border-border/50 bg-card hover:bg-card/80 px-3 py-2 cursor-grab active:cursor-grabbing hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-150 border-l-[3px] ${borderColor}`}
      >
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${severityDot} shrink-0`} />
          <span className="text-xs font-medium text-foreground truncate flex-1">{truncate(vuln.titulo, 40)}</span>
          <span className={`text-[10px] ${daysColor}`}>{vuln.diasEmAberto}d</span>
          {sla?.status === 'expired' && <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
        </div>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, vuln)}
      onClick={onClick}
      className={`group rounded-lg border border-border/50 bg-card hover:bg-card/80 p-3 cursor-grab active:cursor-grabbing hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-150 border-l-[3px] ${borderColor}`}
    >
      {/* Top Row: Title */}
      <p className="text-[13px] font-semibold text-foreground leading-snug mb-2 group-hover:text-blue-400 transition-colors">
        {truncate(vuln.titulo, 55)}
      </p>

      {/* Middle Row: Severity + SLA + Days */}
      <div className="flex items-center gap-2 mb-2.5">
        <SeverityBadge severity={vuln.criticidade} />
        {sla && (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            sla.status === 'expired' ? 'bg-red-500/15 text-red-400' :
            sla.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
            'bg-emerald-500/15 text-emerald-400'
          }`}>
            <Clock className="h-2.5 w-2.5" />
            {sla.label}
          </div>
        )}
        <span className={`ml-auto text-[11px] font-mono ${daysColor}`}>
          {vuln.diasEmAberto}d
        </span>
      </div>

      {/* Bottom Row: Squad + Responsavel */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1 truncate max-w-[140px]">
          <div className="h-4 w-4 rounded bg-muted flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold">{(vuln.squad || '?')[0]}</span>
          </div>
          <span className="truncate">{vuln.squad}</span>
        </div>
        {vuln.responsavel && (
          <div className="flex items-center gap-1 truncate max-w-[100px]">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{vuln.responsavel}</span>
          </div>
        )}
      </div>

      {/* Jira Key if exists */}
      {(vuln as any).jiraKey && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <span className="text-[10px] font-mono text-blue-400/70">{(vuln as any).jiraKey}</span>
        </div>
      )}
    </div>
  )
}
