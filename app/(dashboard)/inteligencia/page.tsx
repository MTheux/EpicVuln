"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { useVulnStore } from "@/lib/vuln-store"
import { authHeaders } from "@/lib/auth"
import { Brain, Shield, AlertTriangle, Users, Server, RefreshCw, Loader2, Sparkles, Target, ChevronDown, TrendingDown, Activity, Crosshair, Skull, ArrowDownRight, Zap, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import AttackGraphTab from './attack-graph-tab'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { DollarSign } from "lucide-react"

export default function InteligenciaPage() {
  const { vulnerabilidades } = useVulnStore()

  const [isGenerating, setIsGenerating] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'executive' | 'attackGraph'>('executive')

  const totalAnalisadas = vulnerabilidades.length
  const criticasReincidentes = vulnerabilidades.filter(v =>
    (v.criticidade.toUpperCase() === 'EXTREMA' || v.criticidade.toUpperCase() === 'CRITICA') && v.reincidencia > 0
  ).length

  const getTopCardSquad = () => {
    const freq: Record<string, number> = {}
    vulnerabilidades.forEach(v => {
      if (v.squad) freq[v.squad] = (freq[v.squad] || 0) + 1
    })
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1])
    return entries.length > 0 ? entries[0][0] : 'N/A'
  }

  const getTopCardAtivo = () => {
    const freq: Record<string, number> = {}
    vulnerabilidades.forEach(v => {
      if (v.ativo) freq[v.ativo] = (freq[v.ativo] || 0) + 1
    })
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1])
    return entries.length > 0 ? entries[0][0] : 'N/A'
  }

  const fetchLlmInsights = async () => {
    setIsGenerating(true)
    try {
      const getDynamicApiUrl = () => {
        if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
        if (typeof window !== 'undefined') {
          return `http://${window.location.hostname}:9001`
        }
        return 'http://localhost:9001'
      }
      const CURRENT_API = getDynamicApiUrl()
      const res = await fetch(`${CURRENT_API}/api/llm/analyze`, { headers: authHeaders(), credentials: 'include' })
      const json = await res.json()
      if (json.success && json.data) {
        setAiAnalysis(json.data)
      } else {
        setAiAnalysis({
          resumoExecutivo: "Configuração Pendente: Motor de IA desconectado.",
          fortaleza: "A chave da API de IA não foi encontrada nas variáveis de ambiente do backend.",
          fraqueza: "Sem ela, a análise estratégica fica desativada.",
          acao: "Acesse Configurações → Integrações → IA e configure o provider desejado.",
          topVulnerabilities: [],
          maturidadeGaps: [],
          culturaInsights: "Verifique as configurações.",
          projecaoRisco: null,
          evolucao: [],
          attackPath: []
        })
      }
    } catch (err) {
      setAiAnalysis({
        resumoExecutivo: "Ocorreu um erro ao contactar o servidor de IA.",
        fortaleza: "Verifique se a porta 9001 está ativa.",
        fraqueza: "Nenhum insight disponível devido à falha de comunicação.",
        acao: "Levante os containers do backend novamente.",
        topVulnerabilities: [],
        maturidadeGaps: [],
        culturaInsights: "Erro de conexão.",
        projecaoRisco: null,
        evolucao: [],
        attackPath: []
      })
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    fetchLlmInsights()
  }, [])

  // Kill chain step styling
  const killChainColors = [
    { bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', icon: 'text-yellow-500', label: 'RECONHECIMENTO' },
    { bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30', icon: 'text-orange-500', label: 'WEAPONIZATION' },
    { bg: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30', icon: 'text-red-500', label: 'EXPLOITATION' },
    { bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', icon: 'text-purple-500', label: 'ESCALATION' },
    { bg: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30', icon: 'text-pink-500', label: 'LATERAL MOVEMENT' },
  ]

  const killChainIcons = [Crosshair, Zap, Skull, ArrowDownRight, Activity]

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Inteligência Estratégica</h1>
              <p className="text-sm text-muted-foreground">
                Análise de risco em tempo real com IA focada no contexto do seu negócio
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => fetchLlmInsights()}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Gerar Novos Insights
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
        <button
          onClick={() => setActiveTab('executive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'executive'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="h-4 w-4" />
          Análise Executiva
        </button>
        <button
          onClick={() => setActiveTab('attackGraph')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'attackGraph'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="h-4 w-4" />
          Attack Graph
        </button>
      </div>

      {activeTab === 'executive' && (
        <>
          {/* Quick Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Total Analisadas" value={totalAnalisadas} icon={Shield} />
            <StatCard title="Risco Financeiro" value={`R$ ${(vulnerabilidades.filter(v => v.criticidade.toUpperCase() === 'EXTREMA' || v.criticidade.toUpperCase() === 'CRITICA').length * 45000).toLocaleString()}`} icon={DollarSign} variant="extreme" />
            <StatCard title="Resiliência" value="84%" icon={Shield} variant="success" />
            <StatCard title="Squad Maior Risco" value={getTopCardSquad()} icon={Users} variant="critical" />
            <StatCard title="Ativo Maior Risco" value={getTopCardAtivo()} icon={Server} variant="extreme" />
            <StatCard title="Reincidentes" value={criticasReincidentes} icon={RefreshCw} variant="warning" />
          </div>

          {/* AI Analysis Content */}
          {isGenerating ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-24 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-white animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground mb-1">Analisando vetores de ataque...</p>
                  <p className="text-sm text-muted-foreground">Gerando insights estratégicos com base nas vulnerabilidades reais</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-700">

              {/* Executive Summary */}
              <Card className="bg-card border-border overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-bold text-foreground">Parecer Executivo</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">IA</span>
                  </div>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {aiAnalysis?.resumoExecutivo || 'Nenhuma análise disponível.'}
                  </p>
                </CardContent>
              </Card>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card border-emerald-500/20 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-400" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-emerald-500" />
                      </div>
                      <h3 className="font-bold text-foreground">Fortaleza Operacional</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {aiAnalysis?.fortaleza || 'Aguardando diagnóstico.'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-red-500/20 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-red-500 to-orange-400" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                      <h3 className="font-bold text-foreground">Vetor de Exposição Crítica</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {aiAnalysis?.fraqueza || 'Aguardando diagnóstico.'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Action Plan */}
              <Card className="bg-card border-purple-500/20 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Target className="h-4 w-4 text-purple-500" />
                    </div>
                    <h3 className="font-bold text-foreground">Plano de Ação Prioritário</h3>
                  </div>
                  <p className="text-base leading-relaxed font-medium text-foreground">
                    {aiAnalysis?.acao || 'Nenhum plano traçado.'}
                  </p>
                </CardContent>
              </Card>

              {/* Risk Projection */}
              {aiAnalysis?.projecaoRisco && (
                <Card className="bg-card border-amber-500/20 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                      </div>
                      <h3 className="font-bold text-foreground">Projeção de Risco</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">Se nada mudar</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">30 Dias</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{aiAnalysis.projecaoRisco.dias30}</p>
                      </div>
                      <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">90 Dias</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{aiAnalysis.projecaoRisco.dias90}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Deep Insight Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Priority Vulnerabilities */}
                <Card className="bg-card border-border overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <h3 className="font-bold text-foreground">Correção Imediata</h3>
                    </div>
                    <div className="space-y-3">
                      {aiAnalysis?.topVulnerabilities?.map((vuln: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border hover:border-red-500/20 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-bold text-red-500">{vuln.codigo}</span>
                            {vuln.diasAberto && (
                              <span className="text-[10px] text-muted-foreground">{vuln.diasAberto}d aberto</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-snug">{vuln.motivo}</p>
                          {vuln.ativoAfetado && (
                            <span className="text-[10px] text-muted-foreground mt-1 block">Ativo: {vuln.ativoAfetado}</span>
                          )}
                        </div>
                      )) || <p className="text-sm text-muted-foreground italic">Identificando alvos críticos...</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Maturity Gaps */}
                <Card className="bg-card border-border overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-amber-500" />
                      <h3 className="font-bold text-foreground">Gaps de Maturidade S-SDLC</h3>
                    </div>
                    <div className="space-y-3">
                      {aiAnalysis?.maturidadeGaps?.map((gap: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border hover:border-amber-500/20 transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-amber-600">{gap.squad}</span>
                            <div className="flex items-center gap-2">
                              {gap.mttr && <span className="text-[10px] text-muted-foreground">MTTR: {gap.mttr}d</span>}
                              {gap.slaCompliance && <span className="text-[10px] text-muted-foreground">SLA: {gap.slaCompliance}%</span>}
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-snug">{gap.gap}</p>
                        </div>
                      )) || <p className="text-sm text-muted-foreground italic">Analisando squads...</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Security Culture */}
              <Card className="bg-card border-emerald-500/20 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-bold text-foreground">Radar de Cultura DevSecOps</h3>
                  </div>
                  <p className="text-sm text-foreground italic leading-relaxed">
                    {aiAnalysis?.culturaInsights || 'Analisando cultura de segurança...'}
                  </p>
                </CardContent>
              </Card>

              {/* Charts + Kill Chain Row */}
              <div className="grid gap-6 lg:grid-cols-2">

                {/* Evolution Chart */}
                <Card className="bg-card border-border overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      <h3 className="font-bold text-foreground">Eficácia de Correção (Tendência IA)</h3>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={aiAnalysis?.evolucao || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                          />
                          <Line type="monotone" dataKey="abertas" name="Falhas Abertas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="fechadas" name="Falhas Mitigadas" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Cyber Kill Chain - Redesigned */}
                <Card className="bg-card border-border overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-red-500 via-purple-500 to-orange-500" />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <Skull className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Cyber Kill Chain</h3>
                          <p className="text-[10px] text-muted-foreground">Simulação baseada em vetores reais</p>
                        </div>
                      </div>
                      {aiAnalysis?.attackPath?.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Ativo</span>
                        </div>
                      )}
                    </div>

                    {aiAnalysis?.attackPath && aiAnalysis.attackPath.length > 0 ? (
                      <div className="space-y-2">
                        {aiAnalysis.attackPath.map((step: any, idx: number) => {
                          const style = killChainColors[idx % killChainColors.length]
                          const IconComp = killChainIcons[idx % killChainIcons.length]
                          const isLast = idx === aiAnalysis.attackPath.length - 1

                          return (
                            <div key={idx}>
                              {/* Step Node */}
                              <div className={`group relative rounded-xl border ${style.border} bg-gradient-to-r ${style.bg} p-3 hover:scale-[1.01] transition-all duration-200`}>
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border ${style.icon}`}>
                                    <IconComp className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${style.icon}`}>
                                        {style.label}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground font-mono">0{idx + 1}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground leading-snug truncate">
                                      {step.node}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Connector */}
                              {!isLast && (
                                <div className="flex justify-center py-0.5">
                                  <div className="flex flex-col items-center">
                                    <div className="w-px h-3 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10" />
                                    <ChevronDown className="h-3 w-3 text-muted-foreground/40 -mt-0.5" />
                                  </div>
                                </div>
                              )}

                              {/* Final Impact */}
                              {isLast && (
                                <>
                                  <div className="flex justify-center py-1">
                                    <div className="flex flex-col items-center">
                                      <div className="w-px h-4 bg-gradient-to-b from-red-500/50 to-red-500/20" />
                                      <ChevronDown className="h-4 w-4 text-red-500 -mt-1 animate-bounce" />
                                    </div>
                                  </div>
                                  <div className="relative rounded-xl border-2 border-red-500/40 bg-gradient-to-r from-red-500/10 via-red-500/5 to-orange-500/10 p-4 text-center overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
                                    <div className="relative">
                                      <div className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-[9px] font-bold uppercase tracking-[0.2em]">
                                        <AlertTriangle className="h-3 w-3" /> Impacto Crítico
                                      </div>
                                      <div className="font-black text-foreground text-lg uppercase tracking-tight leading-tight">
                                        {step.escalatesTo}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 opacity-10 mb-3" />
                        <span className="text-sm italic">Gerando cadeia de impacto...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
        </>
      )}

      {activeTab === 'attackGraph' && <AttackGraphTab />}
    </div>
  )
}
