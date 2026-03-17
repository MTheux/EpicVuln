"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Bell,
  Mail,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Settings2,
  Trash2,
  MessageSquare,
  Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/stat-card"
import { toast } from "sonner"
import { useVulnStore } from "@/lib/vuln-store"
import { squads } from "@/lib/mock-data"
import { authHeaders } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'

interface NotificationStats {
  notificacoesHoje: number
  regrasAtivas: number
  squadsNotificadas: number
  criticasSemRetorno: number
  proximosSLAs: number
}

interface NotificationRule {
  id: string
  name: string
  condition: string
  channel: string
  active: boolean
}

interface NotificationLog {
  id: string
  channel: string
  recipient: string
  subject: string
  body: string
  status: string
  error: string | null
  createdAt: string
  sentBy?: { name: string }
}

export default function NotificacoesPage() {
  const [stats, setStats] = useState<NotificationStats>({
    notificacoesHoje: 0,
    regrasAtivas: 0,
    squadsNotificadas: 0,
    criticasSemRetorno: 0,
    proximosSLAs: 0,
  })
  const [regras, setRegras] = useState<NotificationRule[]>([])
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)

  const [novaRegraDialogOpen, setNovaRegraDialogOpen] = useState(false)
  const [novaRegra, setNovaRegra] = useState({
    nome: '',
    condicao: '',
    canal: 'email' as 'email' | 'slack' | 'teams'
  })

  // Novo fluxo de notificação manual
  const { vulnerabilidades } = useVulnStore()
  const [selectedSquad, setSelectedSquad] = useState<string>("")
  const [selectedMotivo, setSelectedMotivo] = useState<string>("todas_abertas")
  const [mensagemBody, setMensagemBody] = useState<string>("")

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/stats`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/rules`, { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setRegras(Array.isArray(json) ? json : json.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/logs`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      await Promise.all([fetchStats(), fetchRules(), fetchLogs()])
      setLoading(false)
    }
    loadAll()
  }, [fetchStats, fetchRules, fetchLogs])

  // Auto-gerar email baseado na Squad e no Motivo (Regras)
  useEffect(() => {
    if (!selectedSquad) {
      setMensagemBody("")
      return
    }

    let vulnsPendentes = vulnerabilidades.filter(v => v.squad === selectedSquad)
    const now = new Date()

    if (selectedMotivo === 'todas_abertas') {
      vulnsPendentes = vulnsPendentes.filter(v => ['Aberta', 'Em Backlog'].includes(v.status))
    } else if (selectedMotivo === 'criticas') {
      vulnsPendentes = vulnsPendentes.filter(v =>
        ['Extrema', 'Crítica'].includes(v.criticidade) &&
        ['Nova', 'Aberta', 'Em Backlog', 'Em Correção', 'Em Reteste'].includes(v.status)
      )
    } else if (selectedMotivo === 'vencidas') {
      vulnsPendentes = vulnsPendentes.filter(v => {
        if (!v.sla || ['Mitigada', 'Concluída', 'Risco Aceito', 'Fechada'].includes(v.status)) return false
        const slaDate = new Date(v.sla)
        const diffDays = Math.floor((now.getTime() - slaDate.getTime()) / (1000 * 3600 * 24))
        return diffDays > 7
      })
    } else if (selectedMotivo === 'proximo_vencimento') {
      vulnsPendentes = vulnsPendentes.filter(v => {
        if (!v.sla || ['Mitigada', 'Concluída', 'Risco Aceito', 'Fechada'].includes(v.status)) return false
        const slaDate = new Date(v.sla)
        const diffDays = Math.floor((slaDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
        // Vence em até 3 dias (e ainda não venceu, ou vence no mesmo dia)
        return diffDays >= 0 && diffDays <= 3
      })
    }

    if (vulnsPendentes.length === 0) {
      let subject = ""
      if (selectedMotivo === 'todas_abertas') subject = "vulnerabilidades abertas ou em backlog"
      if (selectedMotivo === 'criticas') subject = "vulnerabilidades com criticidade urgente"
      if (selectedMotivo === 'vencidas') subject = "vulnerabilidades vencidas há mais de 7 dias"
      if (selectedMotivo === 'proximo_vencimento') subject = "vulnerabilidades próximas do vencimento"

      setMensagemBody(`Olá PO da squad ${selectedSquad},\n\nParabéns! No momento não existem ${subject} para sua equipe.`)
      return
    }

    const links = vulnsPendentes.map(v =>
      `- [${v.criticidade}] ${v.titulo} (Jira: ${v.jiraKey || 'Sem Ticket'})`
    ).join('\n')

    let headerTexto = ""
    if (selectedMotivo === 'todas_abertas') headerTexto = "listadas como 'Aberta' ou 'Em Backlog' aguardando priorização/correção."
    if (selectedMotivo === 'criticas') headerTexto = "com criticidade 'Extrema' ou 'Crítica' pendentes de correção urgente."
    if (selectedMotivo === 'vencidas') headerTexto = "com SLA de correção atrasado há mais de 7 DIAS."
    if (selectedMotivo === 'proximo_vencimento') headerTexto = "com SLA próximo ao vencimento (vence em 3 dias ou menos)."

    setMensagemBody(`Olá PO da squad ${selectedSquad},\n\nVocês possuem ${vulnsPendentes.length} vulnerabilidade(s) ${headerTexto}\n\nDetalhes:\n${links}\n\nPor favor, verifiquem o planejamento da sprint para endereçar estes débitos técnicos o quanto antes.\n\nAtenciosamente,\nEquipe de AppSec`)

  }, [selectedSquad, selectedMotivo, vulnerabilidades])

  const handleEnviarEmailPO = async () => {
    if (!selectedSquad || !mensagemBody) {
      toast.error('Preencha os dados', { description: 'Selecione uma squad primeiro.' })
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify({ squad: selectedSquad, motivo: selectedMotivo, body: mensagemBody }),
      })
      if (res.ok) {
        toast.success('E-mail enviado', { description: `A notificação foi despachada para o PO de ${selectedSquad}.` })
        setSelectedSquad("")
        setMensagemBody("")
        fetchLogs()
        fetchStats()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error('Erro ao enviar', { description: err.message || 'Falha no envio da notificação.' })
      }
    } catch (err) {
      toast.error('Erro ao enviar', { description: 'Não foi possível conectar ao servidor.' })
    }
  }

  const toggleRegra = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/rules/${id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
      if (res.ok) {
        toast.success("Regra atualizada", { description: "O status da regra foi alterado." })
        fetchRules()
      } else {
        toast.error("Erro", { description: "Não foi possível alterar a regra." })
      }
    } catch {
      toast.error("Erro", { description: "Não foi possível conectar ao servidor." })
    }
  }

  const deleteRegra = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/rules/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        toast.success("Regra removida", { description: "A regra de notificação foi excluída." })
        fetchRules()
      } else {
        toast.error("Erro", { description: "Não foi possível remover a regra." })
      }
    } catch {
      toast.error("Erro", { description: "Não foi possível conectar ao servidor." })
    }
  }

  const handleAddRegra = async () => {
    if (!novaRegra.nome || !novaRegra.condicao) {
      toast.error("Campos obrigatórios", {
        description: "Preencha todos os campos da regra."
      })
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/notifications/rules`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify({ name: novaRegra.nome, condition: novaRegra.condicao, channel: novaRegra.canal }),
      })
      if (res.ok) {
        toast.success("Regra criada", { description: "Nova regra de notificação adicionada." })
        setNovaRegraDialogOpen(false)
        setNovaRegra({ nome: '', condicao: '', canal: 'email' })
        fetchRules()
      } else {
        toast.error("Erro", { description: "Não foi possível criar a regra." })
      }
    } catch {
      toast.error("Erro", { description: "Não foi possível conectar ao servidor." })
    }
  }

  const handleTriggerJob = async (endpoint: string, label: string) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/trigger/${endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (res.ok) {
        toast.success(`${label} executado`, { description: "Job disparado com sucesso." })
        fetchStats()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(`Erro ao executar ${label}`, { description: err.message || "Falha ao disparar o job." })
      }
    } catch {
      toast.error(`Erro ao executar ${label}`, { description: "Não foi possível conectar ao servidor." })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-400">Enviado</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400">Falha</Badge>
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400">Pendente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-400" />
      case 'slack':
        return <MessageSquare className="h-4 w-4 text-purple-400" />
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const extractSquadFromRecipient = (recipient: string) => {
    // Try to extract squad name from email like po-squadname@...
    const match = recipient.match(/po-([^@]+)@/)
    return match ? match[1] : recipient
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
              <p className="text-sm text-muted-foreground">
                Configure alertas para squads responsáveis
              </p>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => setNovaRegraDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Notificações Hoje"
          value={stats.notificacoesHoje}
          icon={Mail}
        />
        <StatCard
          title="Regras Ativas"
          value={stats.regrasAtivas}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Squads Notificadas"
          value={stats.squadsNotificadas}
          icon={MessageSquare}
        />
        <StatCard
          title="Críticas sem Retorno"
          value={stats.criticasSemRetorno}
          icon={AlertTriangle}
          variant="critical"
        />
        <StatCard
          title="SLAs Próximos"
          value={stats.proximosSLAs}
          icon={Clock}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Regras de Notificação */}
        <Card className="bg-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Regras de Notificação</CardTitle>
                <CardDescription>Configure quando e como enviar alertas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {regras.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma regra cadastrada.</p>
            )}
            {regras.map((regra) => (
              <div
                key={regra.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground">{regra.name}</h4>
                    <Badge variant="outline" className="text-xs">{regra.channel}</Badge>
                    {!regra.active && (
                      <Badge variant="secondary" className="text-xs">Inativa</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{regra.condition}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={regra.active}
                    onCheckedChange={() => toggleRegra(regra.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    onClick={() => deleteRegra(regra.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Canais */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Canais de Notificação</CardTitle>
            <CardDescription>Meios de comunicação disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Email</h4>
                  <p className="text-xs text-muted-foreground">Ativo</p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle className="mr-1 h-3 w-3" />
                Configurado
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4 opacity-60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-purple-400" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Slack</h4>
                  <p className="text-xs text-muted-foreground">Em breve</p>
                </div>
              </div>
              <Badge variant="secondary">Futuro</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4 opacity-60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-400" fill="currentColor">
                    <path d="M0 0v24h24V0H0zm9.527 5.416h5.062c2.754 0 4.135 1.56 4.135 3.712 0 1.324-.683 2.443-1.765 3.001l2.125 4.279h-2.53l-1.86-3.857H11.59v3.857H9.527V5.416zm2.063 5.422h2.588c1.254 0 2.012-.67 2.012-1.742 0-1.06-.758-1.768-2.012-1.768h-2.588v3.51z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Microsoft Teams</h4>
                  <p className="text-xs text-muted-foreground">Em breve</p>
                </div>
              </div>
              <Badge variant="secondary">Futuro</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Envio de Notificação Manual para PO */}
        <Card className="bg-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Notificar Product Owner (PO)
            </CardTitle>
            <CardDescription>Envie um e-mail de follow-up para a squad com resumos do Jira automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Selecione a Squad Alvo</Label>
              <Select value={selectedSquad} onValueChange={setSelectedSquad}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Ex: SSO, Cartões, Pix..." />
                </SelectTrigger>
                <SelectContent>
                  {squads.map(sq => (
                    <SelectItem key={sq.nome} value={sq.nome}>{sq.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSquad && (
              <div className="space-y-2">
                <Label>E-mail destino (PO)</Label>
                <Input disabled value={`po-${selectedSquad.toLowerCase().replace(/ /g, '')}@credsystem.com`} className="bg-muted" />
              </div>
            )}

            <div>
              <Label>Motivo da Notificação (Filtro)</Label>
              <Select value={selectedMotivo} onValueChange={setSelectedMotivo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a regra..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas_abertas">Padrão (Abertas ou Em Backlog)</SelectItem>
                  <SelectItem value="criticas">Críticas imediatas (Extrema ou Crítica)</SelectItem>
                  <SelectItem value="vencidas">Vencidas &gt; 7 dias</SelectItem>
                  <SelectItem value="proximo_vencimento">Próximo vencimento (Até 3 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mensagem ({selectedMotivo === 'todas_abertas' ? 'Abertas/Backlog' : selectedMotivo === 'criticas' ? 'Críticas/Extremas' : selectedMotivo === 'vencidas' ? 'SLA > 7 Dias' : 'SLA < 3 Dias'})</Label>
              <Textarea
                className="mt-1 min-h-[200px] font-mono text-xs"
                value={mensagemBody}
                onChange={(e) => setMensagemBody(e.target.value)}
                placeholder="Selecione uma squad para gerar o relatório..."
              />
            </div>

            <Button className="w-full" onClick={handleEnviarEmailPO} disabled={!selectedSquad}>
              Enviar Notificação
            </Button>
          </CardContent>
        </Card>

        {/* Histórico de Notificações */}
        <Card className="bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-base">Notificações Recentes</CardTitle>
            <CardDescription>Últimos alertas enviados pelo sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma notificação registrada.</p>
              )}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {getChannelIcon(log.channel)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-foreground">{log.subject}</h4>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {log.body && log.body.length > 120 ? log.body.substring(0, 120) + '...' : log.body}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      <span>Para: {extractSquadFromRecipient(log.recipient)}</span>
                      {log.sentBy?.name && (
                        <span>Por: {log.sentBy.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Manuais */}
      <div className="mt-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Ações Manuais
            </CardTitle>
            <CardDescription>Dispare manualmente os jobs de verificação de SLA e escalonamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTriggerJob('sla-warning', 'Verificar SLA (3 dias)')}
              >
                <Clock className="mr-2 h-4 w-4" />
                Verificar SLA (3 dias)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTriggerJob('sla-expired', 'Alertar SLA Vencidos')}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Alertar SLA Vencidos
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTriggerJob('escalation-manager', 'Escalar para Gestores')}
              >
                <Bell className="mr-2 h-4 w-4" />
                Escalar para Gestores
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTriggerJob('escalation-clevel', 'Escalar para C-Level')}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Escalar para C-Level
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleTriggerJob('weekly-digest', 'Enviar Digest Semanal')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Enviar Digest Semanal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nova Regra Dialog */}
      <Dialog open={novaRegraDialogOpen} onOpenChange={setNovaRegraDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Regra de Notificação</DialogTitle>
            <DialogDescription>
              Configure uma nova regra para envio automático de alertas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nomeRegra">Nome da Regra</Label>
              <Input
                id="nomeRegra"
                placeholder="Ex: Alertar críticas imediatas"
                value={novaRegra.nome}
                onChange={(e) => setNovaRegra(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="condicaoRegra">Condição</Label>
              <Input
                id="condicaoRegra"
                placeholder="Ex: Criticidade Extrema ou Crítica"
                value={novaRegra.condicao}
                onChange={(e) => setNovaRegra(prev => ({ ...prev, condicao: e.target.value }))}
              />
            </div>
            <div>
              <Label>Canal</Label>
              <Select
                value={novaRegra.canal}
                onValueChange={(v) => setNovaRegra(prev => ({ ...prev, canal: v as 'email' | 'slack' | 'teams' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack" disabled>Slack (em breve)</SelectItem>
                  <SelectItem value="teams" disabled>Teams (em breve)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaRegraDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRegra}>
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
