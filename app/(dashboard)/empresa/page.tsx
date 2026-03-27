"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Building2, Save, Loader2, Plus, X, Users, Shield,
  Server, AlertTriangle, RefreshCw, Pencil, Check,
  Globe, Database, Trash2, ChevronRight, Zap, BarChart3
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Squad {
  name: string
  leader: string
  techLead: string
  appsec: string
}

interface DataSource {
  type: string
  enabled: boolean
  url?: string
}

const SECTORS = [
  'Financeiro', 'Saúde', 'Varejo', 'Tecnologia', 'Educação',
  'Governo', 'Telecomunicações', 'Energia', 'Logística', 'Outro'
]

export default function EmpresaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Company data
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [description, setDescription] = useState('')
  const [squads, setSquads] = useState<Squad[]>([])
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [organizationId, setOrganizationId] = useState('')

  // Discovered data
  const [discoveredSquads, setDiscoveredSquads] = useState<string[]>([])
  const [stats, setStats] = useState<{ totalVulns: number; totalAssets: number; totalUsers: number; openVulns: number }>({
    totalVulns: 0, totalAssets: 0, totalUsers: 0, openVulns: 0
  })

  // Edit states
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)

  const getApiUrl = useCallback(() => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
    if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
    return 'http://localhost:9001'
  }, [])

  // Load all data
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [profileRes, squadsRes, statsRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/settings/company-profile`, { headers: authHeaders(), credentials: 'include' }),
          fetch(`${getApiUrl()}/api/settings/discovered-squads`, { headers: authHeaders(), credentials: 'include' }),
          fetch(`${getApiUrl()}/api/settings/company-stats`, { headers: authHeaders(), credentials: 'include' }),
        ])

        if (profileRes.ok) {
          const profile = await profileRes.json()
          setName(profile.name || '')
          setSector(profile.sector || '')
          setDescription(profile.description || '')
          setOrganizationId(profile.organizationId || '')
          const rawSquads = profile.squads
          setSquads(Array.isArray(rawSquads) ? rawSquads : [])
          const rawDS = profile.dataSources
          setDataSources(Array.isArray(rawDS) ? rawDS : [])
        }

        if (squadsRes.ok) {
          const data = await squadsRes.json()
          setDiscoveredSquads(Array.isArray(data.squads) ? data.squads : [])
        }

        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data)
        }
      } catch (err) {
        toast.error('Erro ao carregar dados da empresa')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getApiUrl])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name, sector, description, squads,
        dataSources, organizationId,
      }
      const res = await fetch(`${getApiUrl()}/api/settings/company-profile`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.organizationId) setOrganizationId(data.organizationId)
        toast.success('Perfil salvo com sucesso!')
      } else {
        toast.error('Erro ao salvar perfil')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const syncSquadsFromData = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/settings/discovered-squads`, {
        headers: authHeaders(), credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        const existing = new Set(squads.map(s => s.name))
        const newSquads = (data.squads || [])
          .filter((s: string) => !existing.has(s) && s !== 'Sem dono' && s !== 'Sem Squad')
          .map((s: string) => ({ name: s, leader: '', techLead: '', appsec: '' }))

        if (newSquads.length > 0) {
          setSquads(prev => [...prev, ...newSquads])
          toast.success(`${newSquads.length} squad(s) importada(s) das integrações!`)
        } else {
          toast.info('Nenhuma squad nova encontrada')
        }
      }
    } catch {
      toast.error('Erro ao sincronizar squads')
    } finally {
      setSyncing(false)
    }
  }

  const addSquad = () => {
    setSquads(prev => [...prev, { name: '', leader: '', techLead: '', appsec: '' }])
  }

  const removeSquad = (idx: number) => {
    setSquads(prev => prev.filter((_, i) => i !== idx))
  }

  const updateSquad = (idx: number, field: keyof Squad, value: string) => {
    setSquads(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Perfil da Empresa</h1>
            <p className="text-sm text-muted-foreground">Gerencie informações, squads e integrações</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Company Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Company Identity */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-500" />
                Identidade
              </h3>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome da Empresa</Label>
                  <div className="mt-1.5">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Ex: Unisys"
                          className="bg-background"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border cursor-pointer hover:border-emerald-500/30 transition-colors group"
                        onClick={() => setEditingName(true)}
                      >
                        <span className="text-foreground font-medium">{name || 'Não configurado'}</span>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sector */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {SECTORS.map(s => (
                      <button
                        key={s}
                        onClick={() => setSector(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                          sector === s
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/30"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</Label>
                  <div className="mt-1.5">
                    {editingDesc ? (
                      <div className="flex items-start gap-2">
                        <textarea
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Descreva o negócio da empresa, principais serviços, etc."
                          className="w-full min-h-[80px] p-3 rounded-lg bg-background border border-border text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={() => setEditingDesc(false)} className="mt-1">
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="p-3 rounded-lg bg-muted/50 border border-border cursor-pointer hover:border-emerald-500/30 transition-colors group min-h-[60px]"
                        onClick={() => setEditingDesc(true)}
                      >
                        <p className="text-sm text-muted-foreground">{description || 'Clique para adicionar uma descrição...'}</p>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors mt-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Squads */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Squads
                  <Badge variant="outline" className="ml-1 text-xs">{squads.length}</Badge>
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={syncSquadsFromData} disabled={syncing} className="text-xs">
                    {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                    Importar das Integrações
                  </Button>
                  <Button size="sm" onClick={addSquad} className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Nova Squad
                  </Button>
                </div>
              </div>

              {/* Discovered squads hint */}
              {discoveredSquads.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <p className="text-xs text-purple-500 font-medium mb-2">
                    <Zap className="inline h-3 w-3 mr-1" />
                    {discoveredSquads.length} squad(s) detectada(s) nas vulnerabilidades/ativos:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {discoveredSquads.slice(0, 15).map(s => {
                      const exists = squads.some(sq => sq.name === s)
                      return (
                        <button
                          key={s}
                          disabled={exists}
                          onClick={() => {
                            if (!exists) {
                              setSquads(prev => [...prev, { name: s, leader: '', techLead: '', appsec: '' }])
                              toast.success(`Squad "${s}" adicionada!`)
                            }
                          }}
                          className={cn(
                            "px-2 py-1 rounded-md text-[11px] font-medium border transition-all",
                            exists
                              ? "bg-muted/50 text-muted-foreground border-border opacity-50 cursor-not-allowed"
                              : "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20 cursor-pointer"
                          )}
                        >
                          {exists ? '✓' : '+'} {s}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Squad List */}
              <div className="space-y-3">
                {squads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    <p className="text-sm">Nenhuma squad cadastrada</p>
                    <p className="text-xs mt-1">Adicione manualmente ou importe das integrações</p>
                  </div>
                ) : (
                  squads.map((squad, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4 hover:border-purple-500/20 transition-colors group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 text-xs font-bold">
                            {(idx + 1).toString().padStart(2, '0')}
                          </div>
                          <Input
                            value={squad.name}
                            onChange={e => updateSquad(idx, 'name', e.target.value)}
                            placeholder="Nome da Squad"
                            className="bg-transparent border-none text-sm font-semibold text-foreground p-0 h-auto focus-visible:ring-0 max-w-[200px]"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                          onClick={() => removeSquad(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Líder / PO</Label>
                          <Input
                            value={squad.leader}
                            onChange={e => updateSquad(idx, 'leader', e.target.value)}
                            placeholder="Nome"
                            className="mt-1 bg-background text-xs h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tech Lead</Label>
                          <Input
                            value={squad.techLead}
                            onChange={e => updateSquad(idx, 'techLead', e.target.value)}
                            placeholder="Nome"
                            className="mt-1 bg-background text-xs h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">AppSec</Label>
                          <Input
                            value={squad.appsec}
                            onChange={e => updateSquad(idx, 'appsec', e.target.value)}
                            placeholder="Nome"
                            className="mt-1 bg-background text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-500" />
                Fontes de Dados
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { type: 'rtc', label: 'IBM RTC', desc: 'Rational Team Concert', icon: '🟣', color: 'purple' },
                  { type: 'azure', label: 'Azure DevOps', desc: 'Microsoft Azure', icon: '🟦', color: 'cyan' },
                  { type: 'gitlab', label: 'GitLab', desc: 'GitLab Issues', icon: '🟠', color: 'orange' },
                  { type: 'manual', label: 'Manual / CSV', desc: 'Import manual', icon: '📄', color: 'gray' },
                ].map(source => {
                  const enabled = dataSources.some(d => d.type === source.type && d.enabled)
                  return (
                    <div
                      key={source.type}
                      onClick={() => {
                        setDataSources(prev => {
                          const exists = prev.find(d => d.type === source.type)
                          if (exists) {
                            return prev.map(d => d.type === source.type ? { ...d, enabled: !d.enabled } : d)
                          }
                          return [...prev, { type: source.type, enabled: true }]
                        })
                      }}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all",
                        enabled
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border bg-muted/30 hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{source.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{source.label}</p>
                            <p className="text-[10px] text-muted-foreground">{source.desc}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                          enabled
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-muted-foreground/30"
                        )}>
                          {enabled && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-[10px] text-muted-foreground mt-4">
                Configure as integrações completas em <button onClick={() => router.push('/configuracoes')} className="text-emerald-500 hover:underline">Configurações → Integrações</button>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Quick Info */}
        <div className="space-y-6">

          {/* Stats Overview */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                Visão Geral
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Vulnerabilidades', value: stats.totalVulns, icon: Shield, color: 'text-emerald-500' },
                  { label: 'Abertas', value: stats.openVulns, icon: AlertTriangle, color: 'text-red-500' },
                  { label: 'Ativos', value: stats.totalAssets, icon: Server, color: 'text-emerald-500' },
                  { label: 'Usuários', value: stats.totalUsers, icon: Users, color: 'text-purple-500' },
                  { label: 'Squads', value: squads.length, icon: Users, color: 'text-amber-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-purple-500" />
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-foreground mb-4">Ações Rápidas</h3>
              <div className="space-y-2">
                {[
                  { label: 'Configurações', desc: 'SLA, tema, segurança', href: '/configuracoes', icon: Database },
                  { label: 'Integrações', desc: 'IBM RTC, Azure DevOps', href: '/configuracoes', icon: Globe },
                  { label: 'Métricas DORA', desc: 'Performance das squads', href: '/metricas', icon: BarChart3 },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:border-emerald-500/20 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{action.label}</p>
                        <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Integrations Status */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                Integrações Ativas
              </h3>
              {dataSources.filter(d => d.enabled).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma integração ativa</p>
              ) : (
                <div className="space-y-2">
                  {dataSources.filter(d => d.enabled).map(ds => (
                    <div key={ds.type} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-foreground capitalize">{ds.type}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">Conectado</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
