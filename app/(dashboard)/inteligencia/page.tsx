"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { useVulnStore } from "@/lib/vuln-store"
import { authHeaders } from "@/lib/auth"
import { Brain, Shield, AlertTriangle, Users, Server, RefreshCw, Loader2, Sparkles, Target, ChevronDown } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export default function InteligenciaPage() {
  const { vulnerabilidades } = useVulnStore()
  
  const [isGenerating, setIsGenerating] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)

  const totalAnalisadas = vulnerabilidades.length
  const criticasReincidentes = vulnerabilidades.filter(v =>
    (v.criticidade === 'Extrema' || v.criticidade === 'Crítica' || v.criticidade === 'EXTREMA' || v.criticidade === 'CRITICA') && v.reincidencia > 0
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

  useEffect(() => {
    const fetchLlmInsights = async () => {
      setIsGenerating(true)
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'
        const res = await fetch(`${API_URL}/api/llm/analyze`, { headers: authHeaders() })
        const json = await res.json()
        if (json.success && json.data) {
          setAiAnalysis(json.data)
        } else {
          setAiAnalysis({
            resumoExecutivo: "Configuração Pendente: Cérebro da Mytchi AI Desconectado.",
            fortaleza: "A sua chave GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do backend.",
            fraqueza: "Sem ela, o relatório C-Level gerativo fica desligado.",
            acao: "Acesse o arquivo .env do backend, declare a sua 'GEMINI_API_KEY=AI...', e reinicie a aplicação.",
            evolucao: [],
            attackPath: []
          })
        }
      } catch (err) {
        setAiAnalysis({
          resumoExecutivo: "Ocorreu um erro catastrófico ao contactar o servidor LLM.",
          fortaleza: "Verifique se a porta 3001 está escutando na rede local.",
          fraqueza: "Nenhum insight disponível devido à falha de comunicação.",
          acao: "Levante os containers do backend novamente com npm run dev.",
          evolucao: [],
          attackPath: []
        })
      } finally {
        setIsGenerating(false)
      }
    }
    
    fetchLlmInsights()
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inteligência Estratégica</h1>
            <p className="text-sm text-muted-foreground">
              Relatório em tempo real pelo CISO Virtual (Mytchi AI) focado no negócio CredSystem
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Analisadas" value={totalAnalisadas} icon={Shield} />
        <StatCard title="Principal OWASP" value="A01" icon={AlertTriangle} variant="critical" />
        <StatCard title="Principal CWE" value="CWE-79" icon={AlertTriangle} variant="warning" />
        <StatCard title="Squad Maior Risco" value={getTopCardSquad()} icon={Users} variant="critical" />
        <StatCard title="Ativo Maior Risco" value={getTopCardAtivo()} icon={Server} variant="extreme" />
        <StatCard title="Críticas Reincidentes" value={criticasReincidentes} icon={RefreshCw} variant="warning" />
      </div>

      <Card className="mb-6 relative overflow-hidden bg-card border-purple-500/30 bg-gradient-to-br from-card to-purple-500/5 hover:border-purple-500/50 transition-all duration-500">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <CardHeader className="relative z-10 border-b border-border/40 pb-6 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <CardTitle className="text-xl text-purple-500 font-bold">Assistente Mytchi AI - Parecer Executivo (C-Level)</CardTitle>
          </div>
          <CardDescription className="text-base mt-2">
            Insights processados diretamente do Google Gemini pelas regras de Negócio CredSystem, NIST e OWASP.
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
              
              <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm mb-2">
                <div className="mb-3 flex items-center gap-2 font-black text-lg text-foreground">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Executive Summary
                </div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {aiAnalysis?.resumoExecutivo || 'Nenhuma resenha obtida.'}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border-l-4 border-l-green-500 bg-background/80 p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 font-black text-lg text-green-500">
                    <Shield className="h-5 w-5" />
                    Fortaleza e Resiliência
                  </div>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {aiAnalysis?.fortaleza || 'Aguardando diagnóstico positivo.'}
                  </p>
                </div>

                <div className="rounded-xl border-l-4 border-l-red-500 bg-background/80 p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 font-black text-lg text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                    Ponto Crítico (Calcanhar de Aquiles)
                  </div>
                  <p className="text-base leading-relaxed text-muted-foreground">
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
                <div className="rounded-xl border border-border bg-background/80 p-6 shadow-sm flex flex-col items-center">
                  <div className="mb-6 flex items-center justify-start w-full gap-2 font-black text-lg text-foreground">
                    Cadeia de Exploração (Attack Path Mytchi)
                  </div>
                  
                  {aiAnalysis?.attackPath && aiAnalysis.attackPath.length > 0 ? (
                    <div className="flex flex-col items-center w-full justify-center flex-1 space-y-2">
                      {aiAnalysis.attackPath.map((step: any, idx: number) => (
                        <div key={idx} className="flex flex-col items-center w-full">
                          {/* Node Básico */}
                          <div className="px-6 py-3 bg-red-500/10 border border-red-500/40 rounded-lg text-center font-semibold text-red-500 shadow-sm w-[80%]">
                            {step.node}
                          </div>
                          
                          {/* Seta ligando ao proximo Node (Se o escalatesTo for o Node do proximo index, a gente desenha seta normal) */}
                          <ChevronDown className="h-6 w-6 text-muted-foreground my-1 animate-pulse" />
                          
                          {/* Se for o último passo, o escalatesTo é o Impacto Final. Mostrar Impacto. */}
                          {idx === aiAnalysis.attackPath.length - 1 && (
                            <div className="px-6 py-4 bg-red-600 border border-red-800 rounded-lg text-center font-black text-white shadow-xl w-[90%] uppercase tracking-widest ring-4 ring-red-500/30">
                              {step.escalatesTo}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center italic text-muted-foreground text-sm">
                      Sem cadeia de ataque delineada.
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
