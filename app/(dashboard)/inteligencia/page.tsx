"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { useVulnStore } from "@/lib/vuln-store"
import { authHeaders } from "@/lib/auth"
import { Brain, Shield, AlertTriangle, Users, Server, RefreshCw, Loader2, Sparkles, Target, ChevronDown } from "lucide-react"
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
  AreaChart,
  Area,
} from "recharts"
import { Printer, Download, DollarSign, TrendingUp as TrendingUpIcon } from "lucide-react"

export default function InteligenciaPage() {
  const { vulnerabilidades } = useVulnStore()
  
  const [isGenerating, setIsGenerating] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'executive' | 'attackGraph'>('executive')

  const totalAnalisadas = vulnerabilidades.length
  const criticasReincidentes = vulnerabilidades.filter(v =>
    (v.criticidade.toUpperCase() === 'EXTREMA' || v.criticidade.toUpperCase() === 'CRITICA') && v.reincidencia > 0
  ).length

  // Para alimentar os top cards rápidos
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
      const res = await fetch(`${CURRENT_API}/api/llm/analyze`, { headers: authHeaders() })
      const json = await res.json()
      if (json.success && json.data) {
        setAiAnalysis(json.data)
      } else {
        setAiAnalysis({
          resumoExecutivo: "Configuração Pendente: Cérebro da Mytchi AI Desconectado.",
          fortaleza: "A sua chave GROQ_API_KEY não foi encontrada nas variáveis de ambiente do backend.",
          fraqueza: "Sem ela, o relatório C-Level gerativo fica desligado.",
          acao: "Acesse o arquivo .env do backend, declare a sua 'GROQ_API_KEY=gsk_...', e reinicie a aplicação.",
          topVulnerabilities: [],
          maturidadeGaps: [],
          culturaInsights: "Verifique as configurações do Groq.",
          evolucao: [],
          attackPath: []
        })
      }
    } catch (err) {
      setAiAnalysis({
        resumoExecutivo: "Ocorreu um erro catastrófico ao contactar o servidor LLM.",
        fortaleza: "Verifique se a porta 9001 está escutando nela.",
        fraqueza: "Nenhum insight disponível devido à falha de comunicação.",
        acao: "Levante os containers do backend novamente com npm run dev.",
        topVulnerabilities: [],
        maturidadeGaps: [],
        culturaInsights: "Erro de conexão.",
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card border border-border shadow-sm">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inteligência Estratégica</h1>
            <p className="text-sm text-muted-foreground">
              Relatório em tempo real pelo CISO Virtual (Mytchi AI) focado no negócio CredSystem
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex border-border/50 text-muted-foreground">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('executive')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'executive'
              ? 'border-purple-500 text-purple-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="inline-block h-4 w-4 mr-2" />
          Analise Executiva
        </button>
        <button
          onClick={() => setActiveTab('attackGraph')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'attackGraph'
              ? 'border-purple-500 text-purple-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="inline-block h-4 w-4 mr-2" />
          Attack Graph
        </button>
      </div>

      {activeTab === 'executive' && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Analisadas" value={totalAnalisadas} icon={Shield} />
        <StatCard title="Risco Financeiro" value={`R$ ${(vulnerabilidades.filter(v => v.criticidade.toUpperCase() === 'EXTREMA' || v.criticidade.toUpperCase() === 'CRITICA').length * 45000).toLocaleString()}`} icon={DollarSign} variant="extreme" />
        <StatCard title="Resiliência Bancária" value="84%" icon={Shield} variant="success" />
        <StatCard title="Squad Maior Risco" value={getTopCardSquad()} icon={Users} variant="critical" />
        <StatCard title="Ativo Maior Risco" value={getTopCardAtivo()} icon={Server} variant="extreme" />
        <StatCard title="Críticas Reincidentes" value={criticasReincidentes} icon={RefreshCw} variant="warning" />
      </div>

      <Card className="mb-6 relative overflow-hidden bg-card border-border shadow-sm hover:shadow-md transition-all duration-500">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <CardHeader className="relative z-10 border-b border-border pb-6 mb-6 bg-muted/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <CardTitle className="text-xl text-purple-500 font-bold">Assistente Mytchi AI - Parecer Executivo (C-Level)</CardTitle>
          </div>
          <CardDescription className="text-base mt-2">
            Insights processados pela Mytchi AI com base nas regras de Negócio CredSystem, NIST e OWASP.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10 min-h-[400px]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-6">
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
              <p className="text-lg font-medium text-purple-500/80 animate-pulse">Engenharia de Risco: A Mytchi AI está simulando vetores de ataque...</p>
            </div>
          ) : (
            <div className="grid gap-6 animate-in fade-in zoom-in-95 duration-700">
              
              <div className="rounded-xl border border-border bg-muted p-6 shadow-sm mb-2">
                <div className="mb-3 flex items-center gap-2 font-black text-lg text-foreground">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Executive Summary
                </div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {aiAnalysis?.resumoExecutivo || 'Nenhuma resenha obtida.'}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 font-black text-lg text-emerald-700">
                    <Shield className="h-5 w-5" />
                    Maturidade de Squads (Fortaleza Operacional)
                  </div>
                  <p className="text-base leading-relaxed text-emerald-900/70">
                    {aiAnalysis?.fortaleza || 'Aguardando diagnóstico positivo.'}
                  </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 font-black text-lg text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Vetor de Exposição Crítica (Calcanhar de Aquiles)
                  </div>
                  <p className="text-base leading-relaxed text-red-900/70">
                    {aiAnalysis?.fraqueza || 'Aguardando diagnóstico negativo.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-background to-purple-500/10 p-6 shadow-md mt-2">
                <div className="mb-3 flex items-center gap-2 font-black text-lg text-purple-500">
                  <Target className="h-5 w-5" />
                  Plano de Ação Primário (Go-To-Market)
                </div>
                <p className="text-lg leading-relaxed font-medium text-foreground">
                  {aiAnalysis?.acao || 'Nenhum plano traçado.'}
                </p>
              </div>

              {/* Novas Seções de Insight Profundo */}
              <div className="grid gap-6 md:grid-cols-2 mt-4">
                {/* Vulnerabilidades Prioritárias */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-bold text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                    Prioridade de Correção Imediata
                  </div>
                  <div className="space-y-4">
                    {aiAnalysis?.topVulnerabilities?.map((vuln: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-background/50 border border-red-500/10">
                        <span className="text-xs font-black text-red-500 block mb-1">{vuln.codigo}</span>
                        <p className="text-sm text-foreground leading-tight">{vuln.motivo}</p>
                      </div>
                    )) || <p className="text-sm text-muted-foreground italic">Identificando alvos críticos...</p>}
                  </div>
                </div>

                {/* Gaps de Maturidade */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-bold text-amber-500">
                    <Users className="h-5 w-5" />
                    Gaps de Maturidade S-SDLC
                  </div>
                  <div className="space-y-4">
                    {aiAnalysis?.maturidadeGaps?.map((gap: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-background/50 border border-amber-500/10">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-amber-600">{gap.squad}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{gap.lider}</span>
                        </div>
                        <p className="text-sm text-foreground leading-tight">{gap.gap}</p>
                      </div>
                    )) || <p className="text-sm text-muted-foreground italic">Analisando comportamento das squads...</p>}
                  </div>
                </div>
              </div>

              {/* Radar de Cultura */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm mt-2">
                <div className="mb-3 flex items-center gap-2 font-bold text-emerald-500">
                  <Sparkles className="h-5 w-5" />
                  Radar de Cultura de Segurança (Insight DevSecOps)
                </div>
                <p className="text-base text-foreground italic leading-relaxed">
                  "{aiAnalysis?.culturaInsights || 'Cultivando mentalidade de segurança na CredSystem...'}"
                </p>
              </div>

              {/* Data Visualization IA - Row */}
              <div className="grid gap-6 lg:grid-cols-2 mt-4">
                
                {/* Grind Evolution Chart */}
                <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-2 font-black text-lg text-foreground">
                    Eficácia de Correção (Tendência IA)
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
                </div>

                {/* Cyber Kill Chain - Organograma */}
                <div className="rounded-xl border border-border bg-muted p-8 shadow-inner flex flex-col items-center overflow-hidden relative">
                  {/* Fundo Decorativo */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px]" />
                  </div>

                  <div className="mb-8 flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center gap-2 font-black text-lg text-foreground uppercase tracking-wider">
                      <Target className="h-5 w-5 text-red-600" />
                      Cyber Kill Chain <span className="text-muted-foreground">Simulador</span>
                    </div>
                    <div className="px-3 py-1 bg-red-100 border border-red-200 rounded-full text-[10px] font-bold text-red-700 animate-pulse">
                      VETOR DE RISCO ATIVO
                    </div>
                  </div>
                  
                  {aiAnalysis?.attackPath && aiAnalysis.attackPath.length > 0 ? (
                    <div className="flex flex-col items-center w-full justify-center flex-1 space-y-0 relative z-10">
                      {aiAnalysis.attackPath.map((step: any, idx: number) => (
                        <div key={idx} className="flex flex-col items-center w-full relative">
                          {/* Node com Estética Cyber */}
                          <div className="relative group w-full flex justify-center">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative z-10 px-6 py-4 bg-card border border-border rounded-xl text-center shadow-md w-[85%] group-hover:border-red-300 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 font-black text-sm border border-red-100">
                                  0{idx + 1}
                                </div>
                                <div className="text-left">
                                  <div className="text-[10px] uppercase font-bold tracking-widest text-red-400 mb-0.5">ESTÁGIO DE ATAQUE</div>
                                  <div className="font-bold text-foreground text-sm leading-tight group-hover:text-red-600 transition-colors uppercase italic">{step.node}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Conector Animado */}
                          {idx < aiAnalysis.attackPath.length - 1 && (
                            <div className="flex flex-col items-center py-2">
                              <div className="w-[1px] h-10 bg-gradient-to-b from-red-500/50 via-red-500/20 to-transparent" />
                              <div className="h-2 w-2 rounded-full bg-red-500 animate-ping absolute top-[60px]" />
                            </div>
                          )}
                          
                          {/* Impacto Final - Grande Finalle */}
                          {idx === aiAnalysis.attackPath.length - 1 && (
                            <>
                              <div className="flex flex-col items-center py-4">
                                <div className="w-[1px] h-12 border-l border-dashed border-red-500/40" />
                                <ChevronDown className="h-6 w-6 text-red-500 -mt-2 animate-bounce" />
                              </div>

                              <div className="relative w-full px-4 group/impact">
                                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover/impact:opacity-75 transition duration-1000 animate-pulse"></div>
                                <div className="relative px-8 py-8 bg-red-950/40 border border-red-500/50 rounded-2xl text-center shadow-[0_0_30px_rgba(153,27,27,0.4)] backdrop-blur-sm overflow-hidden">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
                                  
                                  <div className="relative z-10">
                                    <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.3em]">
                                      <RefreshCw className="h-3 w-3 animate-spin" /> ALERTA DE IMPACTO CRÍTICO
                                    </div>
                                    <div className="font-black text-white text-2xl uppercase tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] leading-tight">
                                      {step.escalatesTo}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-red-500/20 text-[10px] text-red-200/60 uppercase font-medium tracking-widest leading-relaxed">
                                      Simulação baseada em <span className="text-white">vetores reais</span> detectados nas squads
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center italic text-muted-foreground text-sm space-y-4">
                      <Shield className="h-12 w-12 opacity-10" />
                      <span>Gerando cadeia de impacto em tempo real...</span>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {activeTab === 'attackGraph' && <AttackGraphTab />}
    </div>
  )
}
