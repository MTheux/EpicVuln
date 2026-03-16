"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  RefreshCw,
  Download,
  Plus,
  Zap,
  TrendingUp,
  AlertCircle,
  Timer,
  UserX,
  Activity,
  Trash2,
  Database
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { SeverityBadge } from "@/components/severity-badge"
import { StatusBadge } from "@/components/status-badge"
import { useVulnStore } from "@/lib/vuln-store"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend,
} from "recharts"

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']

export default function DashboardPage() {
  const { vulnerabilidades, syncJira, clearAll, fetchVulnerabilidades, isLoading } = useVulnStore()
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    fetchVulnerabilidades()
  }, [])

  // ─── Estatísticas calculadas em tempo real ────────────────────────────────
  const hoje = new Date()

  const ativas = vulnerabilidades.filter(v =>
    v.status !== 'Concluída' && v.status !== 'Fechada' && v.status !== 'Mitigada' && v.status !== 'Risco Aceito'
  )

  const totalAbertas = ativas.length
  const extremas = vulnerabilidades.filter(v => v.criticidade === 'Extrema' || v.criticidade === 'EXTREMA').length
  const criticas = vulnerabilidades.filter(v => v.criticidade === 'Crítica' || v.criticidade === 'CRITICA').length
  const vencidas = ativas.filter(v => v.sla && new Date(v.sla) < hoje).length
  const semResponsavel = vulnerabilidades.filter(v => !v.responsavel).length
  const mediadiasAberto = ativas.length > 0
    ? Math.round(ativas.reduce((acc, v) => acc + (v.diasEmAberto || 0), 0) / ativas.length)
    : 0

  // ─── Criticidade para gráfico de pizza ───────────────────────────────────
  const criticidadeData = [
    { name: 'Extrema', value: vulnerabilidades.filter(v => v.criticidade === 'Extrema' || v.criticidade === 'EXTREMA').length },
    { name: 'Crítica', value: vulnerabilidades.filter(v => v.criticidade === 'Crítica' || v.criticidade === 'CRITICA').length },
    { name: 'Alta', value: vulnerabilidades.filter(v => v.criticidade === 'Alta' || v.criticidade === 'ALTA').length },
    { name: 'Média', value: vulnerabilidades.filter(v => v.criticidade === 'Média' || v.criticidade === 'MEDIA').length },
    { name: 'Baixa', value: vulnerabilidades.filter(v => v.criticidade === 'Baixa' || v.criticidade === 'BAIXA').length },
    { name: 'Informativa', value: vulnerabilidades.filter(v => v.criticidade === 'Informativa' || v.criticidade === 'INFORMATIVA').length },
  ]

  // ─── Squads para gráfico de barras ───────────────────────────────────────
  const squadMap: Record<string, { vulnerabilidades: number; criticas: number; vencidas: number }> = {}
  for (const v of vulnerabilidades) {
    const s = v.squad || 'Sem Squad'
    if (!squadMap[s]) squadMap[s] = { vulnerabilidades: 0, criticas: 0, vencidas: 0 }
    squadMap[s].vulnerabilidades++
    if (v.criticidade === 'Crítica' || v.criticidade === 'CRITICA' || v.criticidade === 'Extrema' || v.criticidade === 'EXTREMA') squadMap[s].criticas++
    if (v.sla && new Date(v.sla) < hoje) squadMap[s].vencidas++
  }
  const squadsData = Object.entries(squadMap)
    .map(([nome, stats]) => ({ nome, ...stats }))
    .sort((a, b) => b.vulnerabilidades - a.vulnerabilidades)
    .slice(0, 6)

  // ─── Aging por faixa de dias ──────────────────────────────────────────────
  const agingData = [
    { faixa: '0-7 dias', quantidade: ativas.filter(v => (v.diasEmAberto || 0) <= 7).length },
    { faixa: '8-15 dias', quantidade: ativas.filter(v => (v.diasEmAberto || 0) > 7 && (v.diasEmAberto || 0) <= 15).length },
    { faixa: '16-30 dias', quantidade: ativas.filter(v => (v.diasEmAberto || 0) > 15 && (v.diasEmAberto || 0) <= 30).length },
    { faixa: '31-60 dias', quantidade: ativas.filter(v => (v.diasEmAberto || 0) > 30 && (v.diasEmAberto || 0) <= 60).length },
    { faixa: '> 60 dias', quantidade: ativas.filter(v => (v.diasEmAberto || 0) > 60).length },
  ]

  // ─── OWASP ────────────────────────────────────────────────────────────────
  const owaspMap: Record<string, number> = {}
  for (const v of vulnerabilidades) {
    if (v.owaspCategory) {
      owaspMap[v.owaspCategory] = (owaspMap[v.owaspCategory] || 0) + 1
    }
  }
  const owaspData = Object.entries(owaspMap)
    .map(([categoria, quantidade]) => ({ categoria, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)

  // ─── Listas dinâmicas ─────────────────────────────────────────────────────
  const criticalVulns = vulnerabilidades
    .filter(v => v.criticidade === 'Extrema' || v.criticidade === 'Crítica' || v.criticidade === 'EXTREMA' || v.criticidade === 'CRITICA')
    .sort((a, b) => (b.diasEmAberto || 0) - (a.diasEmAberto || 0))
    .slice(0, 5)

  const upcomingSla = ativas
    .filter(v => v.sla)
    .sort((a, b) => new Date(a.sla!).getTime() - new Date(b.sla!).getTime())
    .slice(0, 5)

  const recentActivity = [...vulnerabilidades]
    .sort((a, b) => new Date(b.ultimaAtualizacao || 0).getTime() - new Date(a.ultimaAtualizacao || 0).getTime())
    .slice(0, 5)

  const vulnsSemResponsavel = vulnerabilidades.filter(v => !v.responsavel).slice(0, 5)

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncJira()
      toast.success("Sincronização com Jira concluída", {
        description: "Todas as vulnerabilidades foram atualizadas."
      })
    } catch (e: any) {
      toast.error("Erro na sincronização", { description: e.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = () => {
    toast.success("Exportação iniciada", {
      description: "O arquivo será baixado em breve."
    })
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await clearAll()
      toast.success("Dados limpos com sucesso", {
        description: "Todas as vulnerabilidades foram removidas do sistema."
      })
    } catch (e: any) {
      toast.error("Erro ao limpar dados", { description: e.message })
    } finally {
      setClearing(false)
    }
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (!isLoading && vulnerabilidades.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Vulnerabilidades</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão centralizada das falhas, aging, criticidade e acompanhamento por squad.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Jira
            </Button>
            <Link href="/vulnerabilidades/nova">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Vulnerabilidade
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Database className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Nenhuma vulnerabilidade encontrada</h2>
          <p className="mb-8 max-w-md text-sm text-muted-foreground">
            O banco de dados está vazio. Sincronize com o Jira para importar vulnerabilidades, ou adicione manualmente.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Jira
            </Button>
            <Link href="/vulnerabilidades/nova">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Vulnerabilidade
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Vulnerabilidades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão centralizada das falhas, aging, criticidade e acompanhamento por squad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Jira
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Link href="/vulnerabilidades/nova">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vulnerabilidade
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={clearing}>
                <Trash2 className="mr-2 h-4 w-4" />
                {clearing ? 'Limpando...' : 'Limpar Dados'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover <strong>permanentemente</strong> todas as vulnerabilidades, comentários, histórico e evidências do banco de dados. Esta operação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, limpar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard title="Total Abertas" value={totalAbertas} icon={Shield} trend={{ value: 0, label: "dados reais" }} />
        <StatCard title="Extremas" value={extremas} icon={Zap} variant="extreme" />
        <StatCard title="Críticas" value={criticas} icon={AlertTriangle} variant="critical" />
        <StatCard title="Vencidas" value={vencidas} icon={Clock} variant="warning" />
        <StatCard title="Média Dias Aberto" value={`${mediadiasAberto}d`} icon={Timer} />
        <StatCard title="Sem Responsável" value={semResponsavel} icon={UserX} variant="warning" />
        <StatCard title="Total no Banco" value={vulnerabilidades.length} icon={CheckCircle} variant="success" />
      </div>

      {/* Charts Row 1 */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Criticidade Pie */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Vulnerabilidades por Criticidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={criticidadeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {criticidadeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Squad Bar */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Vulnerabilidades por Squad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {squadsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={squadsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="nome" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="vulnerabilidades" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aging */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Aging por Faixa de Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="faixa" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
                  <Bar dataKey="quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OWASP */}
      {owaspData.length > 0 && (
        <div className="mb-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Distribuição por OWASP 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={owaspData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="categoria" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={200}
                      tickFormatter={(value) => value.split('-')[1]?.substring(0, 22) || value} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="quantidade" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Extremas/Críticas mais antigas */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Extremas/Críticas Mais Antigas</CardTitle>
            <CardDescription>Vulnerabilidades de alta severidade com maior tempo em aberto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalVulns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma vulnerabilidade crítica.</p>
              ) : criticalVulns.map((vuln) => (
                <Link key={vuln.id} href={`/vulnerabilidades/${vuln.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{vuln.titulo}</p>
                    <p className="text-xs text-muted-foreground">{vuln.squad}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <SeverityBadge severity={vuln.criticidade} showIcon />
                    <span className="text-xs text-muted-foreground">{vuln.diasEmAberto}d</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximos SLAs */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Próximos SLAs a Vencer</CardTitle>
            <CardDescription>Vulnerabilidades com prazo próximo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSla.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum SLA próximo.</p>
              ) : upcomingSla.map((vuln) => (
                <Link key={vuln.id} href={`/vulnerabilidades/${vuln.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{vuln.titulo}</p>
                    <p className="text-xs text-muted-foreground">{vuln.squad}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <StatusBadge status={vuln.status} />
                    <span className="text-xs text-muted-foreground">SLA: {vuln.sla}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Atividades Recentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
              ) : recentActivity.map((vuln) => (
                <Link key={vuln.id} href={`/vulnerabilidades/${vuln.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{vuln.titulo}</p>
                    <p className="text-xs text-muted-foreground">Atualizado em {vuln.ultimaAtualizacao}</p>
                  </div>
                  <StatusBadge status={vuln.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Squads com maior backlog */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Squads com Maior Backlog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {squadsData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de squads.</p>
              ) : squadsData.map((squad) => (
                <div key={squad.nome} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{squad.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {squad.criticas} críticas • {squad.vencidas} vencidas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">{squad.vulnerabilidades}</span>
                    <span className="text-xs text-muted-foreground">total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Falhas sem responsável */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-base">Falhas sem Responsável</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vulnsSemResponsavel.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todas as vulnerabilidades têm responsável atribuído.</p>
              ) : vulnsSemResponsavel.map((vuln) => (
                <Link key={vuln.id} href={`/vulnerabilidades/${vuln.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{vuln.titulo}</p>
                    <p className="text-xs text-muted-foreground">{vuln.squad}</p>
                  </div>
                  <SeverityBadge severity={vuln.criticidade} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-base">Resumo Geral</CardTitle>
            </div>
            <CardDescription>Situação atual das vulnerabilidades</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span className="text-muted-foreground">{extremas + criticas} vulnerabilidades de alta severidade ativas</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-muted-foreground">{vencidas} vulnerabilidades com SLA vencido</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-muted-foreground">{semResponsavel} vulnerabilidades sem responsável atribuído</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                <span className="text-muted-foreground">Média de {mediadiasAberto} dias em aberto por vulnerabilidade</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span className="text-muted-foreground">{vulnerabilidades.length} vulnerabilidades registradas no total</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
