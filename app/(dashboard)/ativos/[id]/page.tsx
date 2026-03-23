"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Shield,
  AlertTriangle,
  Activity,
  Server,
  Globe,
  User,
  Users,
  Tag,
  Calendar,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAssetStore } from "@/lib/asset-store"
import { authHeaders } from "@/lib/auth"
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

function getSeverityColor(criticidade: string) {
  switch (criticidade) {
    case 'Extrema': case 'EXTREMA': return 'bg-purple-500/15 text-purple-500 border-purple-500/20'
    case 'Crítica': case 'CRITICA': return 'bg-red-500/15 text-red-500 border-red-500/20'
    case 'Alta': case 'ALTA': return 'bg-orange-500/15 text-orange-500 border-orange-500/20'
    case 'Média': case 'MEDIA': return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20'
    case 'Baixa': case 'BAIXA': return 'bg-blue-500/15 text-blue-500 border-blue-500/20'
    case 'Informativa': case 'INFORMATIVA': return 'bg-gray-500/15 text-gray-400 border-gray-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getVulnStatusColor(status: string) {
  switch (status) {
    case 'Nova': case 'Aberta': return 'bg-red-500/15 text-red-500 border-red-500/20'
    case 'Em Backlog': return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20'
    case 'Em Correção': return 'bg-blue-500/15 text-blue-500 border-blue-500/20'
    case 'Em Reteste': return 'bg-purple-500/15 text-purple-500 border-purple-500/20'
    case 'Mitigada': case 'Concluída': case 'Fechada': return 'bg-green-500/15 text-green-500 border-green-500/20'
    case 'Risco Aceito': return 'bg-orange-500/15 text-orange-500 border-orange-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:9001`
  }
  return 'http://localhost:9001'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AssetDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { fetchAssets, deleteAsset, updateAsset } = useAssetStore()

  const [asset, setAsset] = useState<any>(null)
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
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
  })

  // Reverse enum maps for data coming from backend
  const reverseAssetType: Record<string, AssetType> = {
    'API': 'API', 'WEB_APP': 'Web App', 'MOBILE': 'Mobile', 'INFRA': 'Infra',
    'DATABASE': 'Database', 'CLOUD_SERVICE': 'Cloud Service', 'IOT': 'IoT', 'OUTRO': 'Outro',
  }
  const reverseBusinessCriticality: Record<string, BusinessCriticality> = {
    'CRITICAL': 'Critical', 'HIGH': 'High', 'MEDIUM': 'Medium', 'LOW': 'Low',
  }
  const reverseAssetStatus: Record<string, AssetStatus> = {
    'ACTIVE': 'Active', 'INACTIVE': 'Inactive', 'DECOMMISSIONED': 'Decommissioned',
  }
  const reverseEnvironment: Record<string, string> = {
    'PRODUCAO': 'Produção', 'HOMOLOGACAO': 'Homologação', 'DESENVOLVIMENTO': 'Desenvolvimento', 'STAGING': 'Staging',
  }
  const reverseCriticidade: Record<string, string> = {
    'EXTREMA': 'Extrema', 'CRITICA': 'Crítica', 'ALTA': 'Alta', 'MEDIA': 'Média', 'BAIXA': 'Baixa', 'INFORMATIVA': 'Informativa',
  }
  const reverseStatus: Record<string, string> = {
    'NOVO': 'Nova', 'ABERTO': 'Aberta', 'EM_BACKLOG': 'Em Backlog', 'EM_CORRECAO': 'Em Correção',
    'EM_RETESTE': 'Em Reteste', 'MITIGADO': 'Mitigada', 'CONCLUIDO': 'Concluída', 'RISCO_ACEITO': 'Risco Aceito', 'FECHADO': 'Fechada',
  }

  const fetchAssetDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${getApiUrl()}/api/assets/${id}`, {
        headers: authHeaders(),
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Ativo não encontrado')
      }
      const data = await response.json()

      // Map backend enums
      const mapped = {
        ...data,
        type: reverseAssetType[data.type] || data.type,
        businessCriticality: reverseBusinessCriticality[data.businessCriticality] || data.businessCriticality,
        status: reverseAssetStatus[data.status] || data.status,
        environment: reverseEnvironment[data.environment] || data.environment,
        tags: data.tags || [],
        riskScore: data.riskScore ?? 0,
        vulnerabilityCount: data.vulnerabilityCount ?? data._count?.vulnerabilities ?? 0,
        openVulnCount: data.openVulnCount ?? 0,
        criticalVulnCount: data.criticalVulnCount ?? 0,
      }

      setAsset(mapped)

      // Map vulnerabilities if present
      const vulns = data.vulnerabilities || []
      const mappedVulns = vulns.map((v: any) => ({
        ...v,
        criticidade: reverseCriticidade[v.criticidade] || v.criticidade,
        status: reverseStatus[v.status] || v.status,
        codigoInterno: v.codigoInterno || v.id,
        dataCriacao: v.dataCriacao ? new Date(v.dataCriacao).toISOString().split('T')[0] : '',
        sla: v.sla ? new Date(v.sla).toISOString().split('T')[0] : '',
        diasEmAberto: v.diasEmAberto || 0,
      }))
      setVulnerabilities(mappedVulns)
    } catch (err: any) {
      toast.error('Erro', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssetDetail()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir o ativo "${asset?.name}"? Esta ação é irreversível.`)) return
    try {
      await deleteAsset(id)
      toast.success('Ativo excluído', { description: 'O ativo foi removido com sucesso.' })
      router.push('/ativos')
    } catch (err: any) {
      toast.error('Erro', { description: err.message })
    }
  }

  const openEditDialog = () => {
    if (!asset) return
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
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Nome obrigatório')
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
      await updateAsset(id, payload)
      toast.success('Ativo atualizado')
      setEditDialogOpen(false)
      await fetchAssetDetail()
    } catch (err: any) {
      toast.error('Erro', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
          <p className="text-sm text-muted-foreground">Carregando ativo...</p>
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <Server className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">Ativo não encontrado</p>
        <Link href="/ativos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    )
  }

  const riskScore = asset.riskScore || 0

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/ativos">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
              <Badge variant="outline" className={`text-xs ${getTypeColor(asset.type)}`}>
                {asset.type}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getCriticalityColor(asset.businessCriticality)}`}>
                {criticalityLabels[asset.businessCriticality as BusinessCriticality] || asset.businessCriticality}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getStatusColor(asset.status)}`}>
                {statusLabels[asset.status as AssetStatus] || asset.status}
              </Badge>
            </div>
            {asset.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{asset.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${riskScore > 75 ? 'bg-red-500/15' : riskScore > 50 ? 'bg-orange-500/15' : riskScore > 25 ? 'bg-yellow-500/15' : 'bg-green-500/15'}`}>
                <Activity className={`h-5 w-5 ${getRiskScoreTextColor(riskScore)}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Risk Score</p>
                <p className={`text-2xl font-bold ${getRiskScoreTextColor(riskScore)}`}>{riskScore}</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getRiskScoreColor(riskScore)}`}
                    style={{ width: `${Math.min(riskScore, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vulnerabilidades</p>
                <p className="text-2xl font-bold text-foreground">{asset.vulnerabilityCount || vulnerabilities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vulns Abertas</p>
                <p className="text-2xl font-bold text-foreground">{asset.openVulnCount || 0}</p>
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
                <p className="text-xs text-muted-foreground">Críticas/Extremas</p>
                <p className="text-2xl font-bold text-foreground">{asset.criticalVulnCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Details Card */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-base">Detalhes do Ativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-4 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-2">
              <Server className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm font-medium text-foreground">{asset.type}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Criticidade de Negócio</p>
                <p className="text-sm font-medium text-foreground">
                  {criticalityLabels[asset.businessCriticality as BusinessCriticality] || asset.businessCriticality}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Ambiente</p>
                <p className="text-sm font-medium text-foreground">{asset.environment || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm font-medium text-foreground">{asset.owner || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Squad</p>
                <p className="text-sm font-medium text-foreground">{asset.squad || '-'}</p>
              </div>
            </div>

            {asset.url && (
              <div className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">URL</p>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline break-all"
                  >
                    {asset.url}
                  </a>
                </div>
              </div>
            )}

            {asset.tags && asset.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm font-medium text-foreground">
                  {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vulnerabilities Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Vulnerabilidades Vinculadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vulnerabilities.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-28">Código</TableHead>
                    <TableHead className="min-w-[200px]">Título</TableHead>
                    <TableHead className="w-28">Criticidade</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-24 text-center">Dias Aberto</TableHead>
                    <TableHead className="w-24">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnerabilities.map((vuln: any) => (
                    <TableRow key={vuln.id || vuln.codigoInterno} className="border-border">
                      <TableCell className="font-mono text-xs">{vuln.codigoInterno || vuln.id}</TableCell>
                      <TableCell>
                        <Link
                          href={`/vulnerabilidades/${vuln.codigoInterno || vuln.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {vuln.titulo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getSeverityColor(vuln.criticidade)}`}>
                          {vuln.criticidade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getVulnStatusColor(vuln.status)}`}>
                          {vuln.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-semibold ${vuln.diasEmAberto > 30 ? 'text-red-500' : 'text-foreground'}`}>
                          {vuln.diasEmAberto}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{vuln.sla || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Shield className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Nenhuma vulnerabilidade vinculada</p>
              <p className="text-xs text-muted-foreground mt-1">Este ativo ainda não possui vulnerabilidades associadas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ativo</DialogTitle>
            <DialogDescription>
              Atualize as informações do ativo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
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
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-owner">Owner</Label>
                <Input
                  id="edit-owner"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-squad">Squad</Label>
                <Input
                  id="edit-squad"
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
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="edit-tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
