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
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'
    const url = `${API_URL}/api/vulnerabilities/${dbId}/evidence/${filename}`

    const isDangerous = filename.toLowerCase().endsWith('.php') || filename.toLowerCase().endsWith('.html')

    if (isDangerous) {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Não foi possível ler o arquivo')
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
              <span className="font-mono text-sm text-muted-foreground">{vuln.id}</span>
              {vuln.jiraKey && (
                <Badge variant="outline" className="cursor-pointer font-mono" onClick={handleOpenJira}>
                  <Link2 className="mr-1 h-3 w-3" />
                  {vuln.jiraKey}
                </Badge>
              )}
              <SeverityBadge severity={vuln.criticidade} showIcon={vuln.criticidade === 'Extrema'} />
              <StatusBadge status={vuln.status} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{vuln.titulo}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {vuln.squad}
              </span>
              {vuln.responsavel && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {vuln.responsavel}
                </span>
              )}
              {vuln.gestor && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Gestor: {vuln.gestor}
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
            <Button variant="outline" size="sm" onClick={handleNotify}>
              <Bell className="mr-2 h-4 w-4" />
              Notificar Squad
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
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Descrição Executiva</h4>
                <p className="text-sm text-foreground">{vuln.descricaoExecutiva}</p>
              </div>

              <Separator />

              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Descrição Técnica</h4>
                <p className="text-sm text-foreground">{vuln.descricaoTecnica}</p>
              </div>

              {vuln.recomendacao && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Recomendação</h4>
                    <p className="text-sm text-foreground">{vuln.recomendacao}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Sistema</h4>
                  <p className="text-sm font-medium text-foreground">{vuln.sistema}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Ativo</h4>
                  <p className="text-sm font-medium text-foreground">{vuln.ativo}</p>
                </div>
                {vuln.componente && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Componente</h4>
                    <p className="text-sm font-medium text-foreground">{vuln.componente}</p>
                  </div>
                )}
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Ambiente</h4>
                  <p className="text-sm font-medium text-foreground">{vuln.ambiente}</p>
                </div>
                {vuln.endpoint && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Endpoint</h4>
                    <p className="font-mono text-xs text-foreground">{vuln.endpoint}</p>
                  </div>
                )}
                {vuln.metodoHttp && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Método HTTP</h4>
                    <Badge variant="outline">{vuln.metodoHttp}</Badge>
                  </div>
                )}
                {vuln.parametroAfetado && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Parâmetro Afetado</h4>
                    <p className="font-mono text-xs text-foreground">{vuln.parametroAfetado}</p>
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
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Score CVSS</h4>
                  <p className="text-2xl font-bold text-foreground">{vuln.scoreCvss}</p>
                </div>
                {vuln.vetorCvss && (
                  <div className="sm:col-span-2">
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">Vetor CVSS</h4>
                    <p className="font-mono text-xs text-muted-foreground">{vuln.vetorCvss}</p>
                  </div>
                )}
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Criticidade</h4>
                  <SeverityBadge severity={vuln.criticidade} />
                </div>
                {vuln.cwe && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">CWE</h4>
                    <Badge variant="outline">{vuln.cwe}</Badge>
                  </div>
                )}
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
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Reincidência</h4>
                  <p className="text-sm font-medium text-foreground">{vuln.reincidencia}x</p>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Complexidade Falha</h4>
                  <Badge variant="outline">{vuln.complexidade}</Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Complexidade Correção</h4>
                  <Badge variant="outline">{vuln.complexidadeCorrecao}</Badge>
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dias em Aberto</span>
                <span className={`text-lg font-bold ${vuln.diasEmAberto > 30 ? 'text-red-400' : 'text-foreground'}`}>
                  {vuln.diasEmAberto}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">SLA</span>
                <span className="text-sm font-medium text-foreground">{vuln.sla}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Criação</span>
                <span className="text-sm text-foreground">{vuln.dataCriacao}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última Atualização</span>
                <span className="text-sm text-foreground">{vuln.ultimaAtualizacao}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Notificações</span>
                <Badge variant="secondary">{vuln.notificacoesEnviadas} envios</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Jira Panel */}
          {vuln.jiraKey && (
            <Card className="bg-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-base">Integração Jira</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Chave do Ticket</h4>
                  <Badge variant="outline" className="cursor-pointer font-mono" onClick={handleOpenJira}>
                    {vuln.jiraKey}
                  </Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Status no Jira</h4>
                  <Badge variant="secondary">Em Progresso</Badge>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Responsável no Jira</h4>
                  <p className="text-sm text-foreground">{vuln.responsavel || 'Não atribuído'}</p>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Última Sincronização</h4>
                  <p className="text-sm text-muted-foreground">{vuln.ultimaAtualizacao}</p>
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
