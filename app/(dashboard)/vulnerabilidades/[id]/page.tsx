"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Bell,
  Download,
  Loader2,
  Clock,
  Calendar,
  User,
  Users,
  Server,
  Globe,
  Code,
  FileText,
  AlertTriangle,
  Shield,
  Link2,
  Image,
  Paperclip,
  History,
  MessageSquare,
  Send,
  Trash2,
  CirclePlus,
  ArrowRightLeft,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  FileEdit
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { SeverityBadge } from "@/components/severity-badge"
import { StatusBadge } from "@/components/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVulnStore } from "@/lib/vuln-store"
import { useAssetStore } from "@/lib/asset-store"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function VulnerabilidadeDetalhePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { getById, fetchVulnerabilidades, isLoading, syncRtc, sendNotification, deleteVulnerabilidade, uploadEvidence } = useVulnStore()
  const vuln = getById(id)
  const [novoComentario, setNovoComentario] = useState("")
  const [commentType, setCommentType] = useState("observacao")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [timelineFilter, setTimelineFilter] = useState<string>("todos")
  const [vulnDetail, setVulnDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const { assets, fetchAssets, createAsset } = useAssetStore()
  const [linkingAsset, setLinkingAsset] = useState(false)
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(null)
  const [newAssetName, setNewAssetName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewContent, setPreviewContent] = useState<{ type: 'image' | 'text' | null, content: string | null, name: string }>({ type: null, content: null, name: '' })

  // Real Risk Score
  const [riskData, setRiskData] = useState<{
    riskScore: number
    factors: { baseScore: number; ageFactor: number; environmentFactor: number; recurrenceFactor: number }
  } | null>(null)
  const [riskLoading, setRiskLoading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return

    setUploading(true)
    try {
      await uploadEvidence(id, file)
      toast.success('Evidência anexada', { description: 'O arquivo foi salvo com sucesso.' })
    } catch (err: any) {
      toast.error('Erro no upload', { description: err.message })
    } finally {
      setUploading(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleViewEvidence = async (filename: string) => {
    if (!vuln) return
    const dbId = (vuln as any).dbId
    const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:9001` : 'http://localhost:9001')
    const url = `${API_URL}/api/vulnerabilities/${dbId}/evidence/${filename}`

    const isDangerous = filename.toLowerCase().endsWith('.php') || filename.toLowerCase().endsWith('.html')

    if (isDangerous) {
      try {
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error('Nao foi possivel ler o arquivo')
        const text = await res.text()
        setPreviewContent({ type: 'text', content: text, name: filename })
      } catch (e: any) {
        toast.error('Erro', { description: e.message })
      }
    } else {
      setPreviewContent({ type: 'image', content: url, name: filename })
    }
  }

  useEffect(() => {
    fetchVulnerabilidades()
    fetchAssets()
  }, [])

  // Fetch risk score when vuln loads
  useEffect(() => {
    if (!vuln) return
    const dbId = (vuln as any).dbId
    if (!dbId) return
    const fetchRisk = async () => {
      setRiskLoading(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:9001` : 'http://localhost:9001')
        const res = await fetch(`${apiUrl}/api/risk/vulnerability/${dbId}`, {
          headers: authHeaders(),
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setRiskData(data)
        }
      } catch {
        // silently fail
      } finally {
        setRiskLoading(false)
      }
    }
    fetchRisk()
  }, [vuln])

  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
    if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
    return 'http://localhost:9001'
  }

  // Fetch full detail (history + comments) from backend
  const fetchVulnDetail = async () => {
    if (!vuln) return
    const dbId = (vuln as any).dbId
    if (!dbId) return
    setDetailLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/vulnerabilities/${dbId}`, {
        headers: authHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setVulnDetail(data)
      }
    } catch {
      // silently fail - fall back to store data
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchVulnDetail()
  }, [vuln?.id])

  const handleSubmitComment = async () => {
    if (!novoComentario.trim() || !vuln) return
    const dbId = (vuln as any).dbId
    if (!dbId) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/vulnerabilities/${dbId}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ text: novoComentario.trim(), type: commentType }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Erro ao adicionar comentário')
      }
      toast.success("Comentário adicionado", { description: "Sua mensagem foi registrada na linha do tempo." })
      setNovoComentario("")
      setCommentType("observacao")
      // Refresh detail data to show new comment
      await fetchVulnDetail()
    } catch (err: any) {
      toast.error("Erro", { description: err.message })
    } finally {
      setSubmittingComment(false)
    }
  }

  const patchVulnAsset = async (assetId: string | null) => {
    if (!vuln) return
    const dbId = (vuln as any).dbId || vuln.id
    const res = await fetch(`${getApiUrl()}/api/vulnerabilities/${dbId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assetId }),
    })
    if (!res.ok) throw new Error('Erro ao vincular ativo')
  }

  const handleSelectExistingAsset = async (assetId: string) => {
    setLinkingAsset(true)
    try {
      await patchVulnAsset(assetId)
      toast.success('Ativo vinculado com sucesso!')
      setShowAssetSelector(false)
      setSelectedAssetType(null)
      await fetchVulnerabilidades()
    } catch (err: any) {
      toast.error('Erro', { description: err.message })
    } finally {
      setLinkingAsset(false)
    }
  }

  const handleCreateAndLink = async () => {
    if (!newAssetName.trim() || !selectedAssetType) return
    setLinkingAsset(true)
    try {
      // Mapeia o tipo selecionado pro formato do store
      const typeMap: Record<string, string> = {
        'API': 'API',
        'WEB_APP': 'Web App',
        'INFRA': 'Infra',
        'DATABASE': 'Database',
      }
      await createAsset({
        name: newAssetName.trim(),
        type: typeMap[selectedAssetType] as any,
        businessCriticality: 'Medium' as any,
        status: 'Active' as any,
        squad: vuln?.squad || '',
      })
      // Buscar ativos atualizados pra pegar o ID do recém-criado
      await fetchAssets()
      // Pegar o ativo recém-criado (último criado com esse nome)
      const updatedAssets = useAssetStore.getState().assets
      const created = updatedAssets.find(a => a.name === newAssetName.trim())
      if (created) {
        await patchVulnAsset(created.id)
        toast.success('Ativo criado e vinculado!', { description: `${created.name} foi criado em Gestão de Ativos e vinculado a esta vulnerabilidade.` })
      }
      setShowAssetSelector(false)
      setSelectedAssetType(null)
      setNewAssetName('')
      await fetchVulnerabilidades()
    } catch (err: any) {
      toast.error('Erro', { description: err.message })
    } finally {
      setLinkingAsset(false)
    }
  }

  const handleUnlinkAsset = async () => {
    setLinkingAsset(true)
    try {
      await patchVulnAsset(null)
      toast.success('Ativo desvinculado')
      await fetchVulnerabilidades()
    } catch (err: any) {
      toast.error('Erro', { description: err.message })
    } finally {
      setLinkingAsset(false)
    }
  }

  if (isLoading && !vuln) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!vuln) {
    notFound()
  }

  const handleOpenRtc = () => {
    if (vuln.rtcWorkItemId) {
      toast.success("Work Item RTC", {
        description: `Work Item ${vuln.rtcWorkItemId}`
      })
    }
  }

  const handleSync = () => {
    syncRtc()
    toast.success("Sincronização iniciada", {
      description: "Os dados do IBM RTC serão atualizados em instantes."
    })
  }

  const handleNotify = () => {
    sendNotification(vuln.id)
    toast.success("Notificação enviada", {
      description: `A squad ${vuln.squad} foi notificada por e-mail.`
    })
  }

  const handleExport = () => {
    toast.success("Exportação iniciada", {
      description: "O relatório da vulnerabilidade será baixado em breve."
    })
  }

  const handleDelete = () => {
    if (window.confirm("Atenção! Esta vulnerabilidade será removida permanentemente (" + vuln.id + "). Deseja prosseguir?")) {
      deleteVulnerabilidade(vuln.id)
      toast.success("Vulnerabilidade excluída", {
        description: `O registro ${vuln.id} foi apagado do banco de dados.`
      })
      if (router) router.push('/vulnerabilidades')
    }
  }

  // Enhanced timeline icons mapped by backend HistoryEventType enum values
  const timelineConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
    CRIACAO:              { icon: <CirclePlus className="h-4 w-4" />,      color: 'text-green-500',   bgColor: 'bg-green-500/15',   label: 'Criação' },
    STATUS_ALTERADO:      { icon: <ArrowRightLeft className="h-4 w-4" />,  color: 'text-blue-500',    bgColor: 'bg-blue-500/15',    label: 'Status' },
    CRITICIDADE_ALTERADA: { icon: <AlertTriangle className="h-4 w-4" />,   color: 'text-orange-500',  bgColor: 'bg-orange-500/15',  label: 'Criticidade' },
    RESPONSAVEL_ALTERADO: { icon: <UserCheck className="h-4 w-4" />,       color: 'text-purple-500',  bgColor: 'bg-purple-500/15',  label: 'Responsável' },
    SLA_ALTERADO:         { icon: <Clock className="h-4 w-4" />,           color: 'text-yellow-500',  bgColor: 'bg-yellow-500/15',  label: 'SLA' },
    SYNC_RTC:             { icon: <ExternalLink className="h-4 w-4" />,    color: 'text-cyan-500',    bgColor: 'bg-cyan-500/15',    label: 'RTC' },
    EVIDENCIA_ADICIONADA: { icon: <Paperclip className="h-4 w-4" />,       color: 'text-gray-400',    bgColor: 'bg-gray-500/15',    label: 'Evidência' },
    NOTIFICACAO_ENVIADA:  { icon: <Bell className="h-4 w-4" />,            color: 'text-pink-500',    bgColor: 'bg-pink-500/15',    label: 'Notificação' },
    REABERTURA:           { icon: <RotateCcw className="h-4 w-4" />,       color: 'text-red-500',     bgColor: 'bg-red-500/15',     label: 'Reabertura' },
    CONCLUSAO:            { icon: <CheckCircle2 className="h-4 w-4" />,    color: 'text-green-500',   bgColor: 'bg-green-500/15',   label: 'Conclusão' },
    CAMPO_ALTERADO:       { icon: <FileEdit className="h-4 w-4" />,        color: 'text-slate-400',   bgColor: 'bg-slate-500/15',   label: 'Campo' },
    COMENTARIO:           { icon: <MessageSquare className="h-4 w-4" />,   color: 'text-blue-400',    bgColor: 'bg-blue-400/15',    label: 'Comentário' },
  }

  // Also keep old lowercase mapping for legacy data
  const legacyTypeMap: Record<string, string> = {
    criacao: 'CRIACAO',
    status: 'STATUS_ALTERADO',
    criticidade: 'CRITICIDADE_ALTERADA',
    responsavel: 'RESPONSAVEL_ALTERADO',
    notificacao: 'NOTIFICACAO_ENVIADA',
    comentario: 'COMENTARIO',
    sync_rtc: 'SYNC_RTC',
    sincronizacao: 'SYNC_RTC',
  }

  const getTimelineConfig = (eventType: string) => {
    const upper = eventType?.toUpperCase() || ''
    return timelineConfig[upper] || timelineConfig[legacyTypeMap[eventType?.toLowerCase() || ''] || ''] || timelineConfig['CAMPO_ALTERADO']
  }

  const commentTypeLabels: Record<string, string> = {
    observacao: 'Observação',
    decisao: 'Decisão Técnica',
    update: 'Update',
    tecnico: 'Técnico',
  }

  // Build merged timeline from history + comments
  const buildTimeline = () => {
    const historyItems = (vulnDetail?.history || vuln?.historico || []).map((item: any) => ({
      id: item.id || `h-${item.createdAt || item.data}`,
      type: 'history' as const,
      eventType: item.eventType || item.tipo || 'CAMPO_ALTERADO',
      description: item.description || item.descricao || '',
      previousValue: item.previousValue || null,
      newValue: item.newValue || null,
      userName: item.user?.name || item.usuario || null,
      createdAt: new Date(item.createdAt || item.data),
    }))

    const commentItems = (vulnDetail?.comments || []).map((item: any) => ({
      id: item.id || `c-${item.createdAt}`,
      type: 'comment' as const,
      eventType: 'COMENTARIO',
      description: item.text,
      previousValue: null,
      newValue: null,
      userName: item.author?.name || null,
      createdAt: new Date(item.createdAt),
      commentType: item.type || null,
    }))

    const merged = [...historyItems, ...commentItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    // Apply filter
    if (timelineFilter === 'todos') return merged
    if (timelineFilter === 'status') return merged.filter(i => ['STATUS_ALTERADO', 'status'].includes(i.eventType))
    if (timelineFilter === 'comentarios') return merged.filter(i => i.type === 'comment')
    if (timelineFilter === 'evidencias') return merged.filter(i => ['EVIDENCIA_ADICIONADA', 'evidencia'].includes(i.eventType))
    return merged
  }

  const timelineItems = vuln ? buildTimeline() : []

  return (
    <div className="min-h-screen p-6">
      {/* Back Link */}
      <Link
        href="/vulnerabilidades"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Vulnerabilidades
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {vuln.rtcWorkItemId ? (
                <Badge variant="outline" className="cursor-pointer font-mono" onClick={handleOpenRtc}>
                  <Link2 className="mr-1 h-3 w-3" />
                  {vuln.rtcWorkItemId}
                </Badge>
              ) : (
                <span className="font-mono text-sm text-muted-foreground">{vuln.id}</span>
              )}
              <SeverityBadge severity={vuln.criticidade} showIcon={vuln.criticidade === 'Crítica'} />
              <StatusBadge status={vuln.status} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{vuln.titulo}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Squad: {vuln.squad}
              </span>
              {vuln.ativo && vuln.ativo !== vuln.squad && (
                <span className="flex items-center gap-1">
                  <Server className="h-4 w-4" />
                  Alvo: {vuln.ativo}
                </span>
              )}
              {vuln.responsavel && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Responsável: {vuln.responsavel}
                </span>
              )}
              {vuln.gestor && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Analista: {vuln.gestor}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {vuln.rtcWorkItemId && (
              <Button variant="outline" size="sm" onClick={handleOpenRtc}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir no RTC
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSync}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Falha
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Informações */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Descrição</h4>
                <div className="text-sm text-foreground whitespace-pre-wrap">{vuln.descricaoTecnica || vuln.descricaoExecutiva}</div>
              </div>

              {vuln.impacto && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Impacto</h4>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{vuln.impacto}</div>
                  </div>
                </>
              )}

              {vuln.recomendacao && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Recomendação</h4>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{vuln.recomendacao}</div>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vuln.ativo && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Alvo</h4>
                    <p className="text-sm font-medium text-foreground">{vuln.ativo}</p>
                  </div>
                )}
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Squad Responsável</h4>
                  <p className="text-sm font-medium text-foreground">{vuln.squad}</p>
                </div>
                {vuln.responsavel && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Responsável</h4>
                    <p className="text-sm font-medium text-foreground">{vuln.responsavel}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bloco Técnico */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Criticidade</h4>
                  <SeverityBadge severity={vuln.criticidade} />
                </div>
                {vuln.owaspCategory && (
                  <div className="sm:col-span-2">
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">OWASP 2025</h4>
                    <Badge variant="outline">{vuln.owaspCategory}</Badge>
                  </div>
                )}
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Origem</h4>
                  <Badge variant="secondary">{vuln.origem}</Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Tipo</h4>
                  <Badge variant="secondary">{vuln.tipo || 'Aplicação'}</Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Complexidade de Correção</h4>
                  <Badge variant="outline">{vuln.complexidadeCorrecao || 'Média'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline / Histórico */}
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Linha do Tempo de Tratativa</CardTitle>
                </div>
                {detailLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <CardDescription>Eventos, comentários e ações sincronizadas do IBM RTC</CardDescription>
              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 pt-3">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'status', label: 'Status' },
                  { key: 'comentarios', label: 'Comentários' },
                  { key: 'evidencias', label: 'Evidências' },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={timelineFilter === filter.key ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => setTimelineFilter(filter.key)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {timelineItems.length > 0 ? (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

                  <div className="space-y-1">
                    {timelineItems.map((item, index) => {
                      const config = getTimelineConfig(item.eventType)
                      const isComment = item.type === 'comment'
                      const isStatusChange = ['STATUS_ALTERADO', 'status'].includes(item.eventType)
                      const isCritChange = ['CRITICIDADE_ALTERADA', 'criticidade'].includes(item.eventType)

                      return (
                        <div key={item.id || index} className="flex gap-3 relative group">
                          {/* Icon */}
                          <div className="flex-shrink-0 relative z-10">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bgColor} ${config.color} ring-4 ring-card`}>
                              {config.icon}
                            </div>
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pb-5 pt-0.5 min-w-0 ${isComment ? 'bg-muted/30 rounded-lg px-3 py-2.5 mb-1 border border-border/50' : ''}`}>
                            {/* Comment type badge */}
                            {isComment && (item as any).commentType && (
                              <Badge variant="outline" className="text-[10px] h-5 mb-1.5 font-normal">
                                {commentTypeLabels[(item as any).commentType] || (item as any).commentType}
                              </Badge>
                            )}

                            <p className={`text-sm ${isComment ? 'text-foreground whitespace-pre-wrap' : 'font-medium text-foreground'}`}>
                              {item.description}
                            </p>

                            {/* Previous → New value badges for status/criticidade changes */}
                            {(isStatusChange || isCritChange) && (item.previousValue || item.newValue) && (
                              <div className="flex items-center gap-2 mt-1.5">
                                {item.previousValue && (
                                  <Badge variant="outline" className="text-[10px] h-5 font-normal text-muted-foreground border-muted-foreground/30">
                                    {item.previousValue}
                                  </Badge>
                                )}
                                {item.previousValue && item.newValue && (
                                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                )}
                                {item.newValue && (
                                  <Badge variant="outline" className={`text-[10px] h-5 font-normal ${
                                    isStatusChange ? 'text-blue-400 border-blue-400/40' : 'text-orange-400 border-orange-400/40'
                                  }`}>
                                    {item.newValue}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Timestamp and user */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-muted-foreground">
                                {item.createdAt.toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {item.userName && (
                                <>
                                  <span className="text-[11px] text-muted-foreground/40">•</span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {item.userName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado até o momento.</p>
              )}

              {/* Inline Comment Form */}
              <Separator className="my-5" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Adicionar Comentário</span>
                </div>
                <Textarea
                  placeholder="Escreva um comentário sobre esta vulnerabilidade..."
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
                <div className="flex items-center gap-3">
                  <Select value={commentType} onValueChange={setCommentType}>
                    <SelectTrigger className="w-[180px] h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="observacao">Observação</SelectItem>
                      <SelectItem value="decisao">Decisão Técnica</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9 gap-2"
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !novoComentario.trim()}
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Informações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SLA Status com cores */}
              {(() => {
                const slaDate = vuln.sla ? new Date(vuln.sla) : null
                const now = new Date()
                let diasRestantes = 0
                let slaStatus: 'ok' | 'warning' | 'expired' = 'ok'
                let slaLabel = ''
                let slaColor = ''
                let slaBgColor = ''

                if (slaDate && !isNaN(slaDate.getTime())) {
                  diasRestantes = Math.ceil((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                  if (diasRestantes < 0) {
                    slaStatus = 'expired'
                    slaLabel = `SLA vencido há ${Math.abs(diasRestantes)} dias`
                    slaColor = 'text-red-500'
                    slaBgColor = 'bg-red-500/10 border-red-500/30'
                  } else if (diasRestantes <= 15) {
                    slaStatus = 'warning'
                    slaLabel = `SLA vence em ${diasRestantes} dias`
                    slaColor = 'text-yellow-500'
                    slaBgColor = 'bg-yellow-500/10 border-yellow-500/30'
                  } else {
                    slaStatus = 'ok'
                    slaLabel = `SLA vence em ${diasRestantes} dias`
                    slaColor = 'text-green-500'
                    slaBgColor = 'bg-green-500/10 border-green-500/30'
                  }
                }

                return slaDate ? (
                  <div className={`rounded-lg border p-3 ${slaBgColor}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Prazo SLA</span>
                      <Clock className={`h-4 w-4 ${slaColor}`} />
                    </div>
                    <p className={`text-lg font-bold ${slaColor}`}>
                      {slaStatus === 'expired' ? `${Math.abs(diasRestantes)}d atrasado` : `${diasRestantes}d restantes`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vencimento: {slaDate.toLocaleDateString('pt-BR')}
                    </p>
                    {/* Barra de progresso visual */}
                    <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          slaStatus === 'expired' ? 'bg-red-500' :
                          slaStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${slaStatus === 'expired' ? 100 : Math.max(5, Math.min(100, 100 - (diasRestantes / 90 * 100)))}%` }}
                      />
                    </div>
                  </div>
                ) : null
              })()}


              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={vuln.status} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dias em Aberto</span>
                <span className={`text-lg font-bold ${vuln.diasEmAberto > 30 ? 'text-red-400' : 'text-foreground'}`}>
                  {vuln.diasEmAberto}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Criação</span>
                <span className="text-sm text-foreground">{vuln.dataCriacao ? new Date(vuln.dataCriacao).toLocaleDateString('pt-BR') : '—'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detecção</span>
                <span className="text-sm text-foreground">{(() => { const d = (vuln as any).dataDeteccao || vuln.dataCriacao; return d ? new Date(d).toLocaleDateString('pt-BR') : '—' })()}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última Atualização</span>
                <span className="text-sm text-foreground">{vuln.ultimaAtualizacao ? new Date(vuln.ultimaAtualizacao).toLocaleDateString('pt-BR') : '—'}</span>
              </div>

              <Separator />

              {/* Timeline Visual de Ciclo de Vida */}
              {(() => {
                const criacao = vuln.dataCriacao ? new Date(vuln.dataCriacao) : null
                const deteccao = (vuln as any).dataDeteccao ? new Date((vuln as any).dataDeteccao) : criacao
                const slaDate = vuln.sla ? new Date(vuln.sla) : null
                const now = new Date()
                const fechamento = ['CONCLUIDO', 'FECHADO', 'RISCO_ACEITO'].includes(vuln.status)
                  ? new Date(vuln.ultimaAtualizacao) : null

                const events = [
                  { label: 'Criação', date: criacao, icon: <CirclePlus className="h-3 w-3" />, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
                  deteccao && deteccao.getTime() !== criacao?.getTime()
                    ? { label: 'Detecção', date: deteccao, icon: <Shield className="h-3 w-3" />, color: 'bg-blue-500', textColor: 'text-blue-400' }
                    : null,
                  slaDate
                    ? { label: 'SLA', date: slaDate, icon: <Clock className="h-3 w-3" />, color: slaDate < now ? 'bg-red-500' : 'bg-yellow-500', textColor: slaDate < now ? 'text-red-500' : 'text-yellow-500' }
                    : null,
                  !fechamento
                    ? { label: 'Hoje', date: now, icon: <Calendar className="h-3 w-3" />, color: 'bg-foreground', textColor: 'text-foreground' }
                    : null,
                  fechamento
                    ? { label: 'Fechamento', date: fechamento, icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-emerald-500', textColor: 'text-emerald-500' }
                    : null,
                ].filter(Boolean) as { label: string; date: Date; icon: React.ReactNode; color: string; textColor: string }[]

                const sorted = events.sort((a, b) => a.date.getTime() - b.date.getTime())

                if (sorted.length < 2) return null

                const totalSpan = sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()

                return (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciclo de Vida</span>
                    <div className="relative pt-2 pb-1">
                      {/* Line */}
                      <div className="absolute top-[18px] left-3 right-3 h-0.5 bg-border" />

                      {/* Events */}
                      <div className="relative flex justify-between">
                        {sorted.map((evt, i) => {
                          return (
                            <div key={i} className="flex flex-col items-center" style={{ zIndex: 10 }}>
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${evt.color} text-white shadow-sm`}>
                                {evt.icon}
                              </div>
                              <span className={`text-[9px] font-bold mt-1 ${evt.textColor}`}>{evt.label}</span>
                              <span className="text-[8px] text-muted-foreground">
                                {evt.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* RTC Panel */}
          {vuln.rtcWorkItemId && (
            <Card className="bg-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-base">Rastreamento IBM RTC</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Work Item</h4>
                  <Badge variant="outline" className="cursor-pointer font-mono" onClick={handleOpenRtc}>
                    {vuln.rtcWorkItemId}
                  </Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Status</h4>
                  <StatusBadge status={vuln.status} />
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Responsável</h4>
                  <p className="text-sm text-foreground">{vuln.responsavel || 'Não atribuído'}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={handleOpenRtc}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir no RTC
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {vuln.tags && vuln.tags.length > 0 && (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {vuln.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
