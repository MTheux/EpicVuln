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
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SeverityBadge } from "@/components/severity-badge"
import { StatusBadge } from "@/components/status-badge"
import { useVulnStore } from "@/lib/vuln-store"
import { toast } from "sonner"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function VulnerabilidadeDetalhePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { getById, fetchVulnerabilidades, isLoading, syncJira, sendNotification, deleteVulnerabilidade, uploadEvidence } = useVulnStore()
  const vuln = getById(id)
  const [novoComentario, setNovoComentario] = useState("")

  const [uploading, setUploading] = useState(false)
  const [previewContent, setPreviewContent] = useState<{ type: 'image' | 'text' | null, content: string | null, name: string }>({ type: null, content: null, name: '' })

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
  }, [])

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

  const handleOpenJira = () => {
    if (vuln.jiraKey) {
      window.open(`https://credsystem.atlassian.net/browse/${vuln.jiraKey}`, '_blank')
      toast.success("Abrindo Jira", {
        description: `Ticket ${vuln.jiraKey} aberto em nova aba.`
      })
    }
  }

  const handleSync = () => {
    syncJira()
    toast.success("Sincronização iniciada", {
      description: "Os dados do Jira serão atualizados em instantes."
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

  const handleAddComentario = () => {
    if (!novoComentario.trim()) return
    toast.success("Comentário adicionado", {
      description: "Sua mensagem foi registrada."
    })
    setNovoComentario("")
    // NOTE: In the future, this should dispatch an action to add the comment to the vulnerability
  }

  const timelineTypeIcons: Record<string, React.ReactNode> = {
    criacao: <Calendar className="h-4 w-4" />,
    status: <Shield className="h-4 w-4" />,
    criticidade: <AlertTriangle className="h-4 w-4" />,
    responsavel: <User className="h-4 w-4" />,
    notificacao: <Bell className="h-4 w-4" />,
    comentario: <FileText className="h-4 w-4" />,
    sync_jira: <Link2 className="h-4 w-4 text-blue-400" />,
  }

  return (
    <div className="min-h-screen bg-background p-6">
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
              {vuln.jiraKey ? (
                <Badge variant="outline" className="cursor-pointer font-mono" onClick={handleOpenJira}>
                  <Link2 className="mr-1 h-3 w-3" />
                  {vuln.jiraKey}
                </Badge>
              ) : (
                <span className="font-mono text-sm text-muted-foreground">{vuln.id}</span>
              )}
              <SeverityBadge severity={vuln.criticidade} showIcon={vuln.criticidade === 'Extrema'} />
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
            {vuln.jiraKey && (
              <Button variant="outline" size="sm" onClick={handleOpenJira}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir no Jira
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
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Ambiente</h4>
                  <p className="text-sm font-medium text-foreground">{vuln.ambiente}</p>
                </div>
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

          {/* Timeline / Histórico (Unificado com Jira) */}
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Linha do Tempo de Tratativa</CardTitle>
              </div>
              <CardDescription>Eventos sincronizados do Jira e ações do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {vuln.historico && vuln.historico.length > 0 ? (
                <div className="space-y-4">
                  {vuln.historico.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {timelineTypeIcons[item.tipo?.toLowerCase() || 'sync_jira']}
                        </div>
                        {index < vuln.historico!.length - 1 && (
                          <div className="mt-2 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-foreground">{item.description || item.descricao}</p>
                        <p className="text-xs text-muted-foreground italic">
                          {new Date(item.createdAt || item.data).toLocaleString('pt-BR')} {item.user?.name && `• ${item.user.name}`} {item.usuario && `• ${item.usuario}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado até o momento.</p>
              )}
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
            </CardContent>
          </Card>

          {/* Jira Panel */}
          {vuln.jiraKey && (
            <Card className="bg-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-base">Rastreamento Jira</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Ticket</h4>
                  <Badge variant="outline" className="cursor-pointer font-mono" onClick={handleOpenJira}>
                    {vuln.jiraKey}
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
                <Button variant="outline" size="sm" className="w-full" onClick={handleOpenJira}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir no Jira
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
