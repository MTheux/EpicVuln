"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  Server,
  Shield,
  AlertTriangle,
  Activity,
  X,
  Boxes,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useAssetStore } from "@/lib/asset-store"
import { toast } from "sonner"
import type { AssetType, BusinessCriticality, AssetStatus } from "@/lib/types"

const assetTypeOptions: AssetType[] = ['API', 'Web App', 'Mobile', 'Infra', 'Database', 'Cloud Service', 'IoT', 'Outro']
const criticalityOptions: BusinessCriticality[] = ['Critical', 'High', 'Medium', 'Low']
const statusOptions: AssetStatus[] = ['Active', 'Inactive', 'Decommissioned']
const environmentOptions = ['Produção', 'Homologação', 'Desenvolvimento', 'Staging']

const criticalityLabels: Record<BusinessCriticality, string> = {
  Critical: 'Crítica',
  High: 'Alta',
  Medium: 'Média',
  Low: 'Baixa',
}

const statusLabels: Record<AssetStatus, string> = {
  Active: 'Ativo',
  Inactive: 'Inativo',
  Decommissioned: 'Descomissionado',
}

function getCriticalityColor(crit: BusinessCriticality) {
  switch (crit) {
    case 'Critical': return 'bg-red-500/15 text-red-500 border-red-500/20'
    case 'High': return 'bg-orange-500/15 text-orange-500 border-orange-500/20'
    case 'Medium': return 'bg-amber-500/15 text-amber-500 border-amber-500/20'
    case 'Low': return 'bg-green-500/15 text-green-500 border-green-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getTypeColor(type: AssetType) {
  switch (type) {
    case 'API': return 'bg-blue-500/15 text-blue-500 border-blue-500/20'
    case 'Web App': return 'bg-purple-500/15 text-purple-500 border-purple-500/20'
    case 'Mobile': return 'bg-cyan-500/15 text-cyan-500 border-cyan-500/20'
    case 'Infra': return 'bg-slate-500/15 text-slate-400 border-slate-500/20'
    case 'Database': return 'bg-amber-500/15 text-amber-500 border-amber-500/20'
    case 'Cloud Service': return 'bg-sky-500/15 text-sky-500 border-sky-500/20'
    case 'IoT': return 'bg-teal-500/15 text-teal-500 border-teal-500/20'
    case 'Outro': return 'bg-gray-500/15 text-gray-400 border-gray-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getStatusColor(status: AssetStatus) {
  switch (status) {
    case 'Active': return 'bg-green-500/15 text-green-500 border-green-500/20'
    case 'Inactive': return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20'
    case 'Decommissioned': return 'bg-gray-500/15 text-gray-400 border-gray-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getRiskScoreColor(score: number) {
  if (score <= 25) return 'bg-green-500'
  if (score <= 50) return 'bg-yellow-500'
  if (score <= 75) return 'bg-orange-500'
  return 'bg-red-500'
}

function getRiskScoreTextColor(score: number) {
  if (score <= 25) return 'text-green-500'
  if (score <= 50) return 'text-yellow-500'
  if (score <= 75) return 'text-orange-500'
  return 'text-red-500'
}

const emptyForm = {
  name: '',
  type: 'API' as AssetType,
  businessCriticality: 'Medium' as BusinessCriticality,
  description: '',
  owner: '',
  squad: '',
  environment: 'Produção',
  url: '',
  tags: '',
  status: 'Active' as AssetStatus,
}

export default function AtivosPage() {
  const { assets, fetchAssets, createAsset, updateAsset, isLoading, error, stats } = useAssetStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("Todos")
  const [filterCriticality, setFilterCriticality] = useState<string>("Todas")
  const [filterStatus, setFilterStatus] = useState<string>("Todos")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    if (error) {
      toast.error('Erro no Servidor', { description: error })
    }
  }, [error])

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matches =
          asset.name.toLowerCase().includes(search) ||
          (asset.squad || '').toLowerCase().includes(search) ||
          (asset.owner || '').toLowerCase().includes(search) ||
          (asset.description || '').toLowerCase().includes(search) ||
          (asset.tags || []).some(t => t.toLowerCase().includes(search))
        if (!matches) return false
      }
      if (filterType !== 'Todos' && asset.type !== filterType) return false
      if (filterCriticality !== 'Todas' && asset.businessCriticality !== filterCriticality) return false
      if (filterStatus !== 'Todos' && asset.status !== filterStatus) return false
      return true
    })
  }, [assets, searchTerm, filterType, filterCriticality, filterStatus])

  const hasActiveFilters = searchTerm || filterType !== 'Todos' || filterCriticality !== 'Todas' || filterStatus !== 'Todos'

  const clearFilters = () => {
    setSearchTerm("")
    setFilterType("Todos")
    setFilterCriticality("Todas")
    setFilterStatus("Todos")
  }

  const openCreateDialog = () => {
    setEditingAsset(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (asset: typeof assets[0]) => {
    setEditingAsset(asset.id)
    setForm({
      name: asset.name,
      type: asset.type,
      businessCriticality: asset.businessCriticality,
      description: asset.description || '',
      owner: asset.owner || '',
      squad: asset.squad || '',
      environment: asset.environment || 'Produção',
      url: asset.url || '',
      tags: (asset.tags || []).join(', '),
      status: asset.status,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Nome obrigatório', { description: 'Informe o nome do ativo.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        businessCriticality: form.businessCriticality,
        description: form.description.trim() || undefined,
        owner: form.owner.trim() || undefined,
        squad: form.squad.trim() || undefined,
        environment: form.environment,
        url: form.url.trim() || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: form.status,
      }

      if (editingAsset) {
        await updateAsset(editingAsset, payload)
        toast.success('Ativo atualizado', { description: `${payload.name} foi atualizado com sucesso.` })
      } else {
        await createAsset(payload)
        toast.success('Ativo criado', { description: `${payload.name} foi cadastrado com sucesso.` })
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast.error('Erro', { description: err.message || 'Falha ao salvar ativo.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Ativos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Classifique ativos por criticidade de negócio e gerencie riscos
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                <Boxes className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Ativos</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ativos Críticos</p>
                <p className="text-2xl font-bold text-foreground">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Com Vulns Abertas</p>
                <p className="text-2xl font-bold text-foreground">{stats.withOpenVulns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Risco Médio</p>
                <p className="text-2xl font-bold text-foreground">{stats.avgRiskScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, squad, owner, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-card border-border"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-[150px] bg-card border-border text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Tipos</SelectItem>
              {assetTypeOptions.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCriticality} onValueChange={setFilterCriticality}>
            <SelectTrigger className="h-9 w-[160px] bg-card border-border text-sm">
              <SelectValue placeholder="Criticidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas Criticidades</SelectItem>
              {criticalityOptions.map((c) => (
                <SelectItem key={c} value={c}>{criticalityLabels[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[160px] bg-card border-border text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
              <X className="mr-1 h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredAssets.length}</span> de{" "}
            <span className="font-semibold text-foreground">{assets.length}</span> ativos
          </p>
          {filterType !== 'Todos' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setFilterType('Todos')}>
              {filterType} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filterCriticality !== 'Todas' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setFilterCriticality('Todas')}>
              {criticalityLabels[filterCriticality as BusinessCriticality]} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filterStatus !== 'Todos' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setFilterStatus('Todos')}>
              {statusLabels[filterStatus as AssetStatus]} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      </div>

      {/* Asset Cards Grid */}
      {isLoading && assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
          <p className="text-sm text-muted-foreground">Carregando ativos...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Server className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Nenhum ativo encontrado</p>
          <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou cadastre um novo ativo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => (
            <Link key={asset.id} href={`/ativos/${asset.id}`}>
              <Card className="bg-card border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-5">
                  {/* Header: name + badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2">
                      {asset.name}
                    </h3>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(asset.status)}`}>
                      {statusLabels[asset.status]}
                    </Badge>
                  </div>

                  {/* Type + Criticality badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={`text-[10px] ${getTypeColor(asset.type)}`}>
                      {asset.type}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${getCriticalityColor(asset.businessCriticality)}`}>
                      {criticalityLabels[asset.businessCriticality]}
                    </Badge>
                    {asset.environment && (
                      <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground">
                        {asset.environment}
                      </Badge>
                    )}
                  </div>

                  {/* Squad */}
                  {asset.squad && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Squad: <span className="text-foreground font-medium">{asset.squad}</span>
                    </p>
                  )}

                  {/* Risk Score Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Risk Score</span>
                      <span className={`text-sm font-bold ${getRiskScoreTextColor(asset.riskScore || 0)}`}>
                        {asset.riskScore || 0}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getRiskScoreColor(asset.riskScore || 0)}`}
                        style={{ width: `${Math.min(asset.riskScore || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Vuln stats row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{asset.vulnerabilityCount || 0} vulns</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span>{asset.openVulnCount || 0} abertas</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className={`${(asset.criticalVulnCount || 0) > 0 ? 'text-red-500 font-medium' : ''}`}>
                      {asset.criticalVulnCount || 0} críticas
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
            <DialogDescription>
              {editingAsset ? 'Atualize as informações do ativo.' : 'Preencha os dados para cadastrar um novo ativo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Nome *</Label>
              <Input
                id="asset-name"
                placeholder="Ex: API de Pagamentos"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AssetType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypeOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Criticidade de Negócio</Label>
                <Select value={form.businessCriticality} onValueChange={(v) => setForm({ ...form, businessCriticality: v as BusinessCriticality })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {criticalityOptions.map((c) => (
                      <SelectItem key={c} value={c}>{criticalityLabels[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-description">Descrição</Label>
              <Textarea
                id="asset-description"
                placeholder="Descreva o ativo e sua função no negócio..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset-owner">Owner</Label>
                <Input
                  id="asset-owner"
                  placeholder="Ex: João Silva"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-squad">Squad</Label>
                <Input
                  id="asset-squad"
                  placeholder="Ex: Squad Pagamentos"
                  value={form.squad}
                  onChange={(e) => setForm({ ...form, squad: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {environmentOptions.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AssetStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-url">URL</Label>
              <Input
                id="asset-url"
                placeholder="https://api.example.com"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="asset-tags"
                placeholder="Ex: pci-dss, pagamentos, externo"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : (editingAsset ? 'Salvar' : 'Cadastrar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
