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
  Activity,
  Trash2,
  Database,
  Bug,
  Flame,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  const extremas = vulnerabilidades.filter(v => v.criticidade === 'Extrema').length
  const criticas = vulnerabilidades.filter(v => v.criticidade === 'Crítica').length
  const vencidas = ativas.filter(v => v.sla && new Date(v.sla) < hoje).length
  const mediadiasAberto = ativas.length > 0
    ? Math.round(ativas.reduce((acc, v) => acc + (v.diasEmAberto || 0), 0) / ativas.length)
    : 0

  // ─── Criticidade para gráfico de pizza ───────────────────────────────────
  const criticidadeData = [
    { name: 'Extrema', value: vulnerabilidades.filter(v => v.criticidade === 'Extrema').length },
    { name: 'Crítica', value: vulnerabilidades.filter(v => v.criticidade === 'Crítica').length },
    { name: 'Alta', value: vulnerabilidades.filter(v => v.criticidade === 'Alta').length },
    { name: 'Média', value: vulnerabilidades.filter(v => v.criticidade === 'Média').length },
    { name: 'Baixa', value: vulnerabilidades.filter(v => v.criticidade === 'Baixa').length },
    { name: 'Informativa', value: vulnerabilidades.filter(v => v.criticidade === 'Informativa').length },
  ]

  // ─── Squads para gráfico de barras ───────────────────────────────────────
  const squadMap: Record<string, { vulnerabilidades: number; criticas: number; vencidas: number }> = {}
  for (const v of vulnerabilidades) {
    const s = v.squad || 'Sem Squad'
    if (!squadMap[s]) squadMap[s] = { vulnerabilidades: 0, criticas: 0, vencidas: 0 }
    squadMap[s].vulnerabilidades++
    if (v.criticidade === 'Crítica' || v.criticidade === 'Extrema') squadMap[s].criticas++
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
    .filter(v => v.criticidade === 'Extrema' || v.criticidade === 'Crítica')
    .sort((a, b) => (b.diasEmAberto || 0) - (a.diasEmAberto || 0))
    .slice(0, 5)

  const upcomingSla = ativas
    .filter(v => v.sla)
    .sort((a, b) => new Date(a.sla!).getTime() - new Date(b.sla!).getTime())
    .slice(0, 5)

  const recentActivity = [...vulnerabilidades]
    .sort((a, b) => new Date(b.ultimaAtualizacao || 0).getTime() - new Date(a.ultimaAtualizacao || 0).getTime())
    .slice(0, 5)

  // ─── Falhas mais reportadas por squad ────────────────────────────────────
  const squadFailuresMap: Record<string, Record<string, number>> = {}
  for (const v of vulnerabilidades) {
    const s = v.squad || 'Sem Squad'
    let f = v.owaspCategory || ''
    if (!f) {
      const t = v.titulo.toLowerCase()
      if (t.includes('rate limit')) f = 'Rate Limit'
      else if (t.includes('brute force')) f = 'Brute Force'
      else if (t.includes('sqli') || t.includes('injection')) f = 'Injection'
      else if (t.includes('xss')) f = 'XSS'
      else f = v.titulo.length > 30 ? v.titulo.substring(0, 30) + "..." : v.titulo
    }
    if (!squadFailuresMap[s]) squadFailuresMap[s] = {}
    squadFailuresMap[s][f] = (squadFailuresMap[s][f] || 0) + 1
  }

  const squadTopFailures = Object.entries(squadFailuresMap).map(([nome, falhas]) => {
    const sortedFalhas = Object.entries(falhas).sort((a, b) => b[1] - a[1])
    const principalFalha = sortedFalhas[0]
    return { nome, falha: principalFalha[0], quantidade: principalFalha[1] }
  }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 6)

  // ─── Top Falhas Globais ──────────────────────────────────────────────────
  const globalFailuresMap: Record<string, number> = {}
  for (const v of vulnerabilidades) {
    let f = v.owaspCategory ? v.owaspCategory.split(':')[1]?.split('-')[1]?.trim() || v.owaspCategory : ''
    if (!f) {
      const t = v.titulo.toLowerCase()
      if (t.includes('rate limit')) f = 'Rate Limit'
      else if (t.includes('brute force')) f = 'Brute Force'
      else if (t.includes('sqli') || t.includes('injection')) f = 'SQL Injection'
      else if (t.includes('xss')) f = 'XSS / Injection'
      else if (t.includes('auth') || t.includes('login') || t.includes('senha')) f = 'Broken Authentication'
      else if (t.includes('access control') || t.includes('permissão')) f = 'Broken Access Control'
      else if (t.includes('sensiv') || t.includes('exposição')) f = 'Sensitive Data Exposure'
      else f = 'Outras Falhas Técnicas'
    }
    globalFailuresMap[f] = (globalFailuresMap[f] || 0) + 1
  }

  const topGlobalFailures = Object.entries(globalFailuresMap)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)

  const maxGlobalCount = topGlobalFailures.length > 0 ? topGlobalFailures[0].quantidade : 1

  // ─── Postura de Segurança (Banking Score) ────────────────────────────────
  let securityScore = 100
  securityScore -= extremas * 15
  securityScore -= criticas * 8
  securityScore -= vencidas * 10
  securityScore -= Math.max(0, (totalAbertas - extremas - criticas)) * 2
  securityScore = Math.max(0, securityScore)

  let scoreColorClass = 'text-green-500' 
  let scoreBgClass = 'bg-green-500/10'
  let scoreBorderClass = 'border-green-500/20'
  let scoreLabel = 'Excelente'
  
  if (securityScore < 50) {
    scoreColorClass = 'text-red-500'
    scoreBgClass = 'bg-red-500/10'
    scoreBorderClass = 'border-red-500/20'
    scoreLabel = 'Crítico'
  } else if (securityScore < 75) {
    scoreColorClass = 'text-amber-500'
    scoreBgClass = 'bg-amber-500/10'
    scoreBorderClass = 'border-amber-500/20'
    scoreLabel = 'Atenção'
  } else if (securityScore < 90) {
    scoreColorClass = 'text-blue-500'
    scoreBgClass = 'bg-blue-500/10'
    scoreBorderClass = 'border-blue-500/20'
    scoreLabel = 'Saudável'
  }

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
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-left-4 duration-700">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
            VulnControl <span className="text-blue-600">Intelligence</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl leading-relaxed">
            Plataforma corporativa de gestão de vulnerabilidades. Análise preditiva, 
            status de remediação e conformidade em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} 
              className="bg-card border-border hover:bg-muted text-muted-foreground shadow-sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Jira
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}
            className="bg-card border-border hover:bg-muted text-muted-foreground shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Link href="/vulnerabilidades/nova">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vulnerabilidade
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={clearing}
                  className="bg-card border-red-500/20 text-red-500 hover:bg-red-500/10 shadow-sm">
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
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard title="Total Abertas" value={totalAbertas} icon={Shield} trend={{ value: 0, label: "dados reais" }} />
        <StatCard title="Extremas" value={extremas} icon={Zap} variant="extreme" />
        <StatCard title="Críticas" value={criticas} icon={AlertTriangle} variant="critical" />
        <StatCard title="Vencidas" value={vencidas} icon={Clock} variant="warning" />
        <StatCard title="Média Dias Aberto" value={`${mediadiasAberto}d`} icon={Timer} />
        <StatCard title="Total no Banco" value={vulnerabilidades.length} icon={CheckCircle} variant="success" />
      </div>

      {/* Alertas Urgentes - Resumo compacto */}
      {(extremas > 0 || vencidas > 0 || criticas > 0) && (
        <div className="mb-6">
          <Card className="bg-card border-red-500/20 shadow-red-500/5 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Left - Title */}
                <div className="flex items-center gap-3 bg-red-500/10 px-6 py-4 lg:w-56 shrink-0">
                  <Flame className="h-6 w-6 text-red-500 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-red-500">Alertas Urgentes</h3>
                    <p className="text-[10px] text-muted-foreground">Requer ação imediata</p>
                  </div>
                </div>

                {/* Center - Numbers */}
                <div className="flex-1 flex items-center gap-6 px-6 py-4 flex-wrap">
                  {extremas > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600/20">
                        <span className="text-sm font-black text-red-500">{extremas}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-500">Extrema{extremas > 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-muted-foreground">SLA: Imediato</p>
                      </div>
                    </div>
                  )}
                  {criticas > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/20">
                        <span className="text-sm font-black text-orange-500">{criticas}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-orange-500">Crítica{criticas > 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-muted-foreground">SLA: 30 dias</p>
                      </div>
                    </div>
                  )}
                  {vencidas > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/20">
                        <span className="text-sm font-black text-amber-500">{vencidas}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-amber-500">SLA{vencidas > 1 ? 's' : ''} Vencido{vencidas > 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-muted-foreground">Prazo expirado</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right - CTA */}
                <div className="flex items-center px-6 py-4 shrink-0">
                  <Link href="/notificacoes">
                    <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10">
                      Ver Painel
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Criticidade Pie */}
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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
          <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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

      {/* Top Falhas e Atividades */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 mb-6">
        {/* Top 5 Falhas Globais */}
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Top 5 Falhas Mais Reportadas</CardTitle>
            </div>
            <CardDescription>Consolidado global de tipos de vulnerabilidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {topGlobalFailures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
              ) : topGlobalFailures.map((item, idx) => (
                <div key={item.nome} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground">{item.nome}</span>
                    </div>
                    <span className="font-bold text-primary">{item.quantidade}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${(item.quantidade / maxGlobalCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Atividades Recentes (Movido para cá para balancear) */}
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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

        {/* Postura de Segurança Corporativa (Banking Posture) */}
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Saúde de Segurança</CardTitle>
            </div>
            <CardDescription>Índice Credsystem vs. Mercado Bancário</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
              {/* Outer Ring */}
              <svg className="h-full w-full rotate-[-90deg]">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/30"
                />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${(securityScore / 100) * 364.4} 364.4`}
                    strokeLinecap="round"
                    className={`${scoreColorClass} transition-all duration-1000 ease-in-out drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]`}
                  />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-black text-foreground">{securityScore}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Pontos</span>
              </div>
            </div>
            
            <div className={`w-full rounded-lg border ${scoreBorderClass} ${scoreBgClass} p-3 text-center`}>
              <p className={`text-sm font-bold ${scoreColorClass}`}>{scoreLabel}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Benchmark Bancário: <span className="font-semibold text-foreground">82 pts</span>
              </p>
            </div>

            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              <div className="flex flex-col items-center rounded-md bg-muted p-2">
                <span className="text-xs text-muted-foreground">SLA Compliance</span>
                <span className="text-sm font-bold text-foreground">
                  {totalAbertas > 0 ? `${(((totalAbertas - vencidas) / totalAbertas) * 100).toFixed(0)}%` : '100%'}
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-muted p-2">
                <span className="text-xs text-muted-foreground">Risco Residual</span>
                <span className="text-sm font-bold text-foreground">
                  {extremas > 0 ? 'Extremo' : criticas > 0 ? 'Crítico' : 'Baixo'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Extremas/Críticas mais antigas */}
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
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





        {/* Principais Falhas por Squad */}
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base">Principais Falhas por Squad</CardTitle>
              </div>
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                Alerta Crítico
              </Badge>
            </div>
            <CardDescription>Ocorrências mais frequentes que exigem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {squadTopFailures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : squadTopFailures.map((item) => (
                <div key={item.nome} className="group relative flex items-center justify-between rounded-lg border border-border bg-muted p-4 transition-all hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{item.nome}</p>
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="truncate text-xs text-muted-foreground" title={item.falha}>
                        {item.falha}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-black text-foreground">{item.quantidade}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Falhas</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-red-500 transition-transform group-hover:scale-x-100" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
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
