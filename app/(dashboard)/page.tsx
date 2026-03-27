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
  XCircle,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { authHeaders } from "@/lib/auth"
import { SeverityBadge } from "@/components/severity-badge"
import { StatusBadge } from "@/components/status-badge"
import { useVulnStore } from "@/lib/vuln-store"
import { useSlaConfig } from "@/lib/use-sla"
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
  Legend,
  LineChart,
  Line,
} from "recharts"

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']

function classifyOwasp(v: any): string {
  if (v.owaspCategory) {
    const parts = v.owaspCategory.split('-')
    if (parts.length >= 2) return parts.slice(1).join('-').trim().substring(0, 35)
    return v.owaspCategory.substring(0, 35)
  }
  const t = (v.titulo || '').toLowerCase()
  const d = (v.descricao || '').toLowerCase()
  const c = t + ' ' + d
  if (c.includes('broken access') || c.includes('controle de acesso') || c.includes('idor') || c.includes('permissão') || c.includes('autorização')) return 'Broken Access Control'
  if (c.includes('injection') || c.includes('sqli') || c.includes('sql injection') || c.includes('injeção')) return 'Injection'
  if (c.includes('xss') || c.includes('cross-site scripting') || c.includes('script')) return 'Cross-Site Scripting'
  if (c.includes('crypto') || c.includes('criptograf') || c.includes('cipher') || c.includes('hash') || c.includes('tls') || c.includes('ssl') || c.includes('certificado')) return 'Cryptographic Failures'
  if (c.includes('autenticação') || c.includes('authentication') || c.includes('login') || c.includes('senha') || c.includes('password') || c.includes('brute force') || c.includes('credential')) return 'Authentication Failures'
  if (c.includes('rate limit') || c.includes('brute') || c.includes('lockout') || c.includes('bloqueio')) return 'Rate Limit / Brute Force'
  if (c.includes('security misconfig') || c.includes('configuração') || c.includes('header') || c.includes('cors') || c.includes('debug')) return 'Security Misconfiguration'
  if (c.includes('desserializ') || c.includes('insecure deserialization')) return 'Insecure Deserialization'
  if (c.includes('component') || c.includes('dependência') || c.includes('outdated') || c.includes('vulnerable component') || c.includes('biblioteca')) return 'Vulnerable Components'
  if (c.includes('log') || c.includes('monitoring') || c.includes('monitoramento')) return 'Logging & Monitoring Failures'
  if (c.includes('ssrf') || c.includes('server-side request')) return 'SSRF'
  if (c.includes('jwt') || c.includes('token') || c.includes('session') || c.includes('sessão') || c.includes('cookie')) return 'Session / Token Issues'
  if (c.includes('dados sensíveis') || c.includes('sensitive data') || c.includes('exposição') || c.includes('vazamento') || c.includes('information disclosure') || c.includes('informação')) return 'Sensitive Data Exposure'
  if (c.includes('upload') || c.includes('file')) return 'Unrestricted File Upload'
  if (c.includes('open redirect') || c.includes('redirect')) return 'Open Redirect'
  if (c.includes('cache') || c.includes('caching')) return 'Cache Improperly Controlled'
  if (c.includes('design inseguro') || c.includes('insecure design')) return 'Insecure Design'
  return 'Security Misconfiguration'
}

export default function DashboardPage() {
  const { vulnerabilidades, syncRtc, clearAll, fetchVulnerabilidades, isLoading } = useVulnStore()
  const { getSlaForSeverity } = useSlaConfig()
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)


  useEffect(() => { fetchVulnerabilidades() }, [])

  const hoje = new Date()
  const ativas = vulnerabilidades.filter(v => v.status !== 'Concluída' && v.status !== 'Fechada' && v.status !== 'Mitigada' && v.status !== 'Risco Aceito')
  const corrigidas = vulnerabilidades.filter(v => v.status === 'Concluída' || v.status === 'Fechada' || v.status === 'Mitigada')
  const naoCorrigidas = ativas.length
  const totalCorrigidas = corrigidas.length
  const criticas = vulnerabilidades.filter(v => v.criticidade === 'Crítica').length
  const vencidas = ativas.filter(v => v.sla && new Date(v.sla) < hoje).length

  const criticidadeData = [
    { name: 'Crítica', value: vulnerabilidades.filter(v => v.criticidade === 'Crítica').length },
    { name: 'Alta', value: vulnerabilidades.filter(v => v.criticidade === 'Alta').length },
    { name: 'Média', value: vulnerabilidades.filter(v => v.criticidade === 'Média').length },
    { name: 'Baixa', value: vulnerabilidades.filter(v => v.criticidade === 'Baixa').length },
    { name: 'Informativa', value: vulnerabilidades.filter(v => v.criticidade === 'Informativa').length },
  ]

  const squadMap: Record<string, { vulnerabilidades: number; criticas: number; vencidas: number }> = {}
  for (const v of vulnerabilidades) {
    const s = v.squad || 'Sem Squad'
    if (!squadMap[s]) squadMap[s] = { vulnerabilidades: 0, criticas: 0, vencidas: 0 }
    squadMap[s].vulnerabilidades++
    if (v.criticidade === 'Crítica') squadMap[s].criticas++
    if (v.sla && new Date(v.sla) < hoje) squadMap[s].vencidas++
  }
  const squadsData = Object.entries(squadMap).map(([nome, stats]) => ({ nome, ...stats })).sort((a, b) => b.vulnerabilidades - a.vulnerabilidades).slice(0, 6)

  const owaspGlobalMap: Record<string, number> = {}
  for (const v of vulnerabilidades) { const cat = classifyOwasp(v); owaspGlobalMap[cat] = (owaspGlobalMap[cat] || 0) + 1 }
  const topGlobalFailures = Object.entries(owaspGlobalMap).map(([nome, quantidade]) => ({ nome, quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)
  const maxGlobalCount = topGlobalFailures.length > 0 ? topGlobalFailures[0].quantidade : 1

  const owaspMap: Record<string, number> = {}
  for (const v of vulnerabilidades) { if (v.owaspCategory) { owaspMap[v.owaspCategory] = (owaspMap[v.owaspCategory] || 0) + 1 } }
  const owaspData = Object.entries(owaspMap).map(([categoria, quantidade]) => ({ categoria, quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5)

  const recentOpen = [...ativas].sort((a, b) => new Date(b.ultimaAtualizacao || b.dataAbertura || 0).getTime() - new Date(a.ultimaAtualizacao || a.dataAbertura || 0).getTime()).slice(0, 5)
  const recentFixed = [...corrigidas].sort((a, b) => new Date(b.ultimaAtualizacao || b.dataAbertura || 0).getTime() - new Date(a.ultimaAtualizacao || a.dataAbertura || 0).getTime()).slice(0, 5)
  const upcomingSla = ativas.filter(v => v.sla).map(v => {
    const slaDate = new Date(v.sla!)
    const diasRestantes = Math.ceil((slaDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return { ...v, diasRestantes }
  }).sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 10)

  // Evolução mensal: vulns abertas vs corrigidas por mês
  const evolucaoMap: Record<string, { abertas: number; corrigidas: number }> = {}
  for (const v of vulnerabilidades) {
    const d = v.dataCriacao ? new Date(v.dataCriacao) : null
    if (!d || isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!evolucaoMap[key]) evolucaoMap[key] = { abertas: 0, corrigidas: 0 }
    evolucaoMap[key].abertas++
    if (v.status === 'Concluída' || v.status === 'Fechada' || v.status === 'Mitigada') {
      evolucaoMap[key].corrigidas++
    }
  }
  const evolucaoData = Object.entries(evolucaoMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, data]) => ({
      mes: mes.split('-')[1] + '/' + mes.split('-')[0].slice(2),
      abertas: data.abertas,
      corrigidas: data.corrigidas,
    }))

  // SLA Corporativo por criticidade (dias) - agora vem do hook useSlaConfig

  // Tempo médio de correção por squad com comparação SLA
  const squadTempoMap: Record<string, { total: number; count: number; slaTotal: number }> = {}
  for (const v of corrigidas) {
    const squad = v.squad || 'Sem Squad'
    const criacao = v.dataCriacao ? new Date(v.dataCriacao) : null
    const update = v.ultimaAtualizacao ? new Date(v.ultimaAtualizacao) : null
    if (criacao && update && !isNaN(criacao.getTime()) && !isNaN(update.getTime())) {
      const dias = Math.max(1, Math.ceil((update.getTime() - criacao.getTime()) / (1000 * 60 * 60 * 24)))
      const slaEsperado = getSlaForSeverity(v.criticidade)
      if (!squadTempoMap[squad]) squadTempoMap[squad] = { total: 0, count: 0, slaTotal: 0 }
      squadTempoMap[squad].total += dias
      squadTempoMap[squad].slaTotal += slaEsperado
      squadTempoMap[squad].count++
    }
  }
  const tempoCorrecaoData = Object.entries(squadTempoMap)
    .map(([squad, data]) => ({
      squad,
      media: Math.round(data.total / data.count),
      slaEsperado: Math.round(data.slaTotal / data.count),
    }))
    .sort((a, b) => b.media - a.media)
    .slice(0, 8)

  const squadFailuresMap: Record<string, Record<string, number>> = {}
  for (const v of vulnerabilidades) {
    const s = v.squad || 'Sem Squad'
    const f = classifyOwasp(v)
    if (!squadFailuresMap[s]) squadFailuresMap[s] = {}
    squadFailuresMap[s][f] = (squadFailuresMap[s][f] || 0) + 1
  }
  const squadTopFailures = Object.entries(squadFailuresMap).map(([nome, falhas]) => {
    const sorted = Object.entries(falhas).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return { nome, falha: 'Sem dados', quantidade: 0 }
    return { nome, falha: sorted[0][0], quantidade: sorted[0][1] }
  }).filter(s => s.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade).slice(0, 6)

  const handleSync = async () => { setSyncing(true); try { await syncRtc(); toast.success("Sincronização com IBM RTC concluída", { description: "Todas as vulnerabilidades foram atualizadas." }) } catch (e: any) { toast.error("Erro na sincronização", { description: e.message }) } finally { setSyncing(false) } }
  const handleExport = () => {
    const headers = ['ID', 'Titulo', 'Criticidade', 'Status', 'Squad', 'Alvo', 'Responsavel', 'Data Criacao', 'Dias Aberto', 'SLA']
    const rows = vulnerabilidades.map(v => [
      v.id,
      `"${(v.titulo || '').replace(/"/g, '""')}"`,
      v.criticidade,
      v.status,
      v.squad,
      v.sistema || v.ativo || '',
      v.responsavel || '',
      v.dataCriacao || '',
      v.diasEmAberto,
      v.sla || '',
    ].join(';'))
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `epicvuln_dashboard_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportado!', { description: `${vulnerabilidades.length} vulnerabilidades exportadas para CSV.` })
  }
  const handleClearAll = async () => { setClearing(true); try { await clearAll(); toast.success("Dados limpos com sucesso", { description: "Todas as vulnerabilidades foram removidas do sistema." }) } catch (e: any) { toast.error("Erro ao limpar dados", { description: e.message }) } finally { setClearing(false) } }

  if (!isLoading && vulnerabilidades.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Vulnerabilidades</h1>
            <p className="mt-1 text-sm text-muted-foreground">Visão centralizada das falhas, criticidade e acompanhamento por squad.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />Sincronizar RTC</Button>
            <Link href="/vulnerabilidades/nova"><Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Vulnerabilidade</Button></Link>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted"><Database className="h-12 w-12 text-muted-foreground" /></div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Nenhuma vulnerabilidade encontrada</h2>
          <p className="mb-8 max-w-md text-sm text-muted-foreground">O banco de dados está vazio. Sincronize com o IBM RTC para importar vulnerabilidades, ou adicione manualmente.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSync} disabled={syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />Sincronizar RTC</Button>
            <Link href="/vulnerabilidades/nova"><Button><Plus className="mr-2 h-4 w-4" />Adicionar Vulnerabilidade</Button></Link>
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">EpicVuln <span className="text-emerald-600">Intelligence</span></h1>
          <p className="text-sm font-medium text-muted-foreground max-w-2xl leading-relaxed">Plataforma corporativa de gestão de vulnerabilidades. Análise preditiva, status de remediação e conformidade em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="bg-card border-border hover:bg-muted text-muted-foreground shadow-sm"><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />Sincronizar RTC</Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="bg-card border-border hover:bg-muted text-muted-foreground shadow-sm"><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
          <Link href="/vulnerabilidades/nova"><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"><Plus className="mr-2 h-4 w-4" />Nova Vulnerabilidade</Button></Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={clearing} className="bg-card border-red-500/20 text-red-500 hover:bg-red-500/10 shadow-sm"><Trash2 className="mr-2 h-4 w-4" />{clearing ? 'Limpando...' : 'Limpar Dados'}</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle><AlertDialogDescription>Esta ação irá remover <strong>permanentemente</strong> todas as vulnerabilidades, comentários, histórico e evidências do banco de dados. Esta operação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, limpar tudo</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Não Corrigidas" value={naoCorrigidas} icon={XCircle} variant="warning" />
        <StatCard title="Corrigidas" value={totalCorrigidas} icon={CheckCircle2} variant="success" />
        <StatCard title="Críticas" value={criticas} icon={AlertTriangle} variant="critical" />
        <StatCard title="SLA Vencidos" value={vencidas} icon={Clock} variant="warning" />
      </div>

      {/* Alertas Urgentes */}
      {(vencidas > 0 || criticas > 0) && (
        <div className="mb-6">
          <Card className="bg-card border-red-500/20 shadow-red-500/5 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                <div className="flex items-center gap-3 bg-red-500/10 px-6 py-4 lg:w-56 shrink-0"><Flame className="h-6 w-6 text-red-500 animate-pulse" /><div><h3 className="text-sm font-bold text-red-500">Alertas Urgentes</h3><p className="text-[10px] text-muted-foreground">Requer ação imediata</p></div></div>
                <div className="flex-1 flex items-center gap-6 px-6 py-4 flex-wrap">
                  {criticas > 0 && (<div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600/20"><span className="text-sm font-black text-red-500">{criticas}</span></div><div><p className="text-xs font-semibold text-red-500">Crítica{criticas > 1 ? 's' : ''}</p><p className="text-[10px] text-muted-foreground">SLA: Imediato</p></div></div>)}
                  {vencidas > 0 && (<div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/20"><span className="text-sm font-black text-amber-500">{vencidas}</span></div><div><p className="text-xs font-semibold text-amber-500">SLA{vencidas > 1 ? 's' : ''} Vencido{vencidas > 1 ? 's' : ''}</p><p className="text-[10px] text-muted-foreground">Prazo expirado</p></div></div>)}
                </div>
                <div className="flex items-center px-6 py-4 shrink-0"><Link href="/notificacoes"><Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10">Ver Painel<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - 2 colunas */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader><CardTitle className="text-base">Vulnerabilidades por Criticidade</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={criticidadeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">{criticidadeData.map((_, i) => (<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-card-foreground)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }} /><Legend /></PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader><CardTitle className="text-base">Vulnerabilidades por Squad</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {squadsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={squadsData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} /><YAxis dataKey="nome" type="category" stroke="var(--color-muted-foreground)" fontSize={12} width={90} /><Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-card-foreground)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }} labelStyle={{ color: 'var(--color-muted-foreground)' }} cursor={{ fill: 'var(--color-muted)' }} /><Bar dataKey="vulnerabilidades" fill="#3b82f6" radius={[0, 4, 4, 0]} /></BarChart>
                </ResponsiveContainer>
              ) : (<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados</div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OWASP Distribution */}
      {owaspData.length > 0 && (
        <div className="mb-6">
          <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
            <CardHeader><CardTitle className="text-base">Distribuição por OWASP 2025</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={owaspData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} /><YAxis dataKey="categoria" type="category" stroke="var(--color-muted-foreground)" fontSize={10} width={200} tickFormatter={(v) => v.split('-')[1]?.substring(0, 22) || v} /><Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-card-foreground)', borderRadius: '8px' }} itemStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }} labelStyle={{ color: 'var(--color-muted-foreground)' }} cursor={{ fill: 'var(--color-muted)' }} /><Bar dataKey="quantidade" fill="#f97316" radius={[0, 4, 4, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Falhas OWASP */}
      <div className="mb-6">
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><CardTitle className="text-base">Top 5 Falhas OWASP</CardTitle></div><CardDescription>Categorias OWASP mais reportadas globalmente</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-5">
              {topGlobalFailures.length === 0 ? (<p className="text-sm text-muted-foreground">Sem dados suficientes.</p>) : topGlobalFailures.map((item, idx) => (
                <div key={item.nome} className="space-y-2">
                  <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">{idx + 1}</span><span className="font-medium text-foreground">{item.nome}</span></div><span className="font-bold text-primary">{item.quantidade}</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${(item.quantidade / maxGlobalCount) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Correção por Squad + Status do SLA */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /><CardTitle className="text-base">Correção por Squad</CardTitle></div><CardDescription>Quanto cada squad ja corrigiu do total de falhas</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const squadCorrecao = Object.entries(squadMap).map(([nome, stats]) => {
                  const total = stats.vulnerabilidades
                  const corr = vulnerabilidades.filter(v => (v.squad || 'Sem Squad') === nome && (v.status === 'Concluída' || v.status === 'Fechada' || v.status === 'Mitigada')).length
                  const pct = total > 0 ? Math.round((corr / total) * 100) : 0
                  return { nome, total, corr, aberta: total - corr, pct }
                }).sort((a, b) => b.pct - a.pct)

                return squadCorrecao.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                ) : squadCorrecao.map(sq => (
                  <div key={sq.nome} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground truncate max-w-[180px]">{sq.nome}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{sq.corr}/{sq.total}</span>
                        <span className={`text-sm font-black ${sq.pct >= 80 ? 'text-green-500' : sq.pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{sq.pct}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
                      <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${sq.pct}%` }} />
                      <div className="h-full bg-red-500/40 transition-all duration-700" style={{ width: `${100 - sq.pct}%` }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /><CardTitle className="text-base">Status do SLA</CardTitle></div><CardDescription>Falhas abertas: dentro do prazo vs vencidas</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {/* Donut simples */}
              <div className="relative flex h-40 w-40 items-center justify-center mb-4">
                {(() => {
                  const dentroSla = ativas.filter(v => !v.sla || new Date(v.sla) >= hoje).length
                  const foraDoSla = vencidas
                  const total = dentroSla + foraDoSla
                  const pctOk = total > 0 ? (dentroSla / total) * 100 : 100
                  const circumference = 2 * Math.PI * 62
                  return (
                    <>
                      <svg className="h-full w-full rotate-[-90deg]">
                        <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="12" className="text-red-500/30" />
                        <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="12"
                          strokeDasharray={`${(pctOk / 100) * circumference} ${circumference}`}
                          strokeLinecap="round" className="text-green-500 transition-all duration-1000" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className={`text-3xl font-black ${pctOk >= 80 ? 'text-green-500' : pctOk >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{Math.round(pctOk)}%</span>
                        <span className="text-[10px] text-muted-foreground">dentro do SLA</span>
                      </div>
                    </>
                  )
                })()}
              </div>
              {/* Resumo */}
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">No prazo</p>
                    <p className="text-lg font-bold text-green-500">{ativas.filter(v => !v.sla || new Date(v.sla) >= hoje).length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">SLA vencido</p>
                    <p className="text-lg font-bold text-red-500">{vencidas}</p>
                  </div>
                </div>
              </div>
              {/* Por criticidade */}
              <div className="w-full mt-4 space-y-2">
                {['Crítica', 'Alta', 'Média', 'Baixa'].map(crit => {
                  const vencidasCrit = ativas.filter(v => v.criticidade === crit && v.sla && new Date(v.sla) < hoje).length
                  if (vencidasCrit === 0) return null
                  const colors: Record<string, string> = { 'Crítica': 'text-red-500', 'Alta': 'text-orange-500', 'Média': 'text-amber-500', 'Baixa': 'text-green-500' }
                  return (
                    <div key={crit} className="flex items-center justify-between text-sm px-1">
                      <span className="text-muted-foreground">{crit}</span>
                      <span className={`font-bold ${colors[crit]}`}>{vencidasCrit} vencida{vencidasCrit > 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Corrigidas Recentes */}
      <div className="mb-6">
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><CardTitle className="text-base">Vulnerabilidades Corrigidas Recentes</CardTitle></div><CardDescription>Últimas vulnerabilidades corrigidas pelas squads</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFixed.length === 0 ? (<p className="text-sm text-muted-foreground">Nenhuma vulnerabilidade corrigida ainda.</p>) : recentFixed.map((vuln) => (
                <Link key={vuln.id} href={`/vulnerabilidades/${vuln.id}`} className="flex items-center justify-between rounded-lg border border-green-500/20 p-3 transition-colors hover:bg-accent bg-green-500/5">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{vuln.titulo}</p><p className="text-xs text-muted-foreground">{vuln.squad}</p></div>
                  <div className="ml-3 flex items-center gap-2"><SeverityBadge severity={vuln.criticidade} /><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Principais Falhas OWASP por Squad */}
      <div className="mb-6">
        <Card className="bg-card border-border shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bug className="h-5 w-5 text-red-500" /><CardTitle className="text-base">Principais Falhas OWASP por Squad</CardTitle></div><Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Alerta Crítico</Badge></div>
            <CardDescription>Categoria OWASP mais recorrente por squad — foco de remediação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {squadTopFailures.length === 0 ? (<p className="text-sm text-muted-foreground">Sem dados.</p>) : squadTopFailures.map((item) => (
                <div key={item.nome} className="group relative flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4 transition-all hover:bg-muted">
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-bold text-foreground">{item.nome}</p><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /></div><div className="mt-1 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><p className="truncate text-xs text-muted-foreground" title={item.falha}>{item.falha}</p></div></div>
                  <div className="ml-4"><div className="flex flex-col items-center"><span className="text-xl font-black text-foreground">{item.quantidade}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Falhas</span></div></div>
                  <div className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-red-500 transition-transform group-hover:scale-x-100" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
