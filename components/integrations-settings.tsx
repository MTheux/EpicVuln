"use client"

import { useState, useEffect } from "react"
import {
  Link2,
  Settings2,
  Upload,
  ArrowRight,
  FileText,
  FileCode,
  ClipboardPaste,
  Loader2,
  Info,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Send,
  Zap,
  MessageSquare,
  Mail,
  GitBranch,
  Bug,
  Shield,
  Webhook,
  RefreshCw,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { authHeaders } from "@/lib/auth"
import { cn } from "@/lib/utils"

// ============ SVG Icons for integrations ============
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
    </svg>
  )
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M20.625 8.5h-3.75c-.207 0-.375.168-.375.375v3.75c0 1.864-1.511 3.375-3.375 3.375H9.75a.375.375 0 0 0-.375.375v3.75c0 .207.168.375.375.375h10.875c.207 0 .375-.168.375-.375V8.875a.375.375 0 0 0-.375-.375z" fill="#5059C9"/>
      <circle cx="18.5" cy="5" r="2.5" fill="#5059C9"/>
      <path d="M13.125 3H3.375C3.168 3 3 3.168 3 3.375v10.25c0 .207.168.375.375.375h4.25v4.625c0 .207.168.375.375.375h4.25c.207 0 .375-.168.375-.375V13.5h.5c1.864 0 3.375-1.511 3.375-3.375V3.375A.375.375 0 0 0 13.125 3z" fill="#7B83EB"/>
      <circle cx="10" cy="1.5" r="3" fill="#7B83EB"/>
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

function DefectDojoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#E53935" strokeWidth="2"/>
      <path d="M12 6v12M6 12h12" stroke="#E53935" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ============ Config ============
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}

const API_URL = getApiUrl()

// ============ Integration Card ============
interface IntegrationDef {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'chat' | 'tracker' | 'scanner' | 'email'
  status: 'connected' | 'available' | 'coming_soon'
  configurable?: boolean
}

const integrations: IntegrationDef[] = []

function IntegrationCard({ integration, onConfigure }: { integration: IntegrationDef, onConfigure: (id: string) => void }) {
  const statusConfig = {
    connected: { label: 'Conectado', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    available: { label: 'Disponível', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    coming_soon: { label: 'Em breve', class: 'bg-slate-500/10 text-slate-500 border-slate-500/20', dot: 'bg-slate-400' },
  }

  const s = statusConfig[integration.status]
  const isComingSoon = integration.status === 'coming_soon'

  return (
    <div className={cn(
      "group relative rounded-xl border bg-card p-5 transition-all duration-200",
      isComingSoon
        ? "border-border/50 opacity-70"
        : "border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/50 shrink-0">
          {integration.icon}
        </div>
        <Badge variant="outline" className={cn("text-[10px] gap-1", s.class)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, integration.status === 'connected' && "animate-pulse")} />
          {s.label}
        </Badge>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-1">{integration.name}</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{integration.description}</p>

      {isComingSoon ? (
        <Button variant="outline" size="sm" className="w-full text-xs" disabled>
          Em breve
        </Button>
      ) : (
        <Button
          variant={integration.status === 'connected' ? 'default' : 'outline'}
          size="sm"
          className="w-full text-xs"
          onClick={() => onConfigure(integration.id)}
        >
          {integration.status === 'connected' ? (
            <>
              <Settings2 className="mr-1.5 h-3 w-3" />
              Configurar
            </>
          ) : (
            <>
              <Zap className="mr-1.5 h-3 w-3" />
              Conectar
            </>
          )}
        </Button>
      )}
    </div>
  )
}

// ============ Main Component ============
export function IntegrationsSettings() {
  const [importing, setImporting] = useState(false)
  const [pastedContent, setPastedContent] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [vulnCount, setVulnCount] = useState<number | null>(null)


  // AI Config
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [zekromOpen, setZekromOpen] = useState(false)
  const [zekromScope, setZekromScope] = useState<'api' | 'web' | 'both'>('both')
  const [zekromWso2, setZekromWso2] = useState('')
  const [aiConfig, setAiConfig] = useState({ provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey: '', baseUrl: '', hasApiKey: false })
  const [aiProviders, setAiProviders] = useState<Record<string, { name: string, models: string[] }>>({})
  const [aiTesting, setAiTesting] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)

  // Load AI config and providers
  useEffect(() => {
    const loadAi = async () => {
      try {
        const [configResp, providersResp] = await Promise.all([
          fetch(`${API_URL}/api/llm/config`, { headers: authHeaders(), credentials: 'include' }),
          fetch(`${API_URL}/api/llm/providers`, { headers: authHeaders(), credentials: 'include' }),
        ])
        if (configResp.ok) {
          const cfg = await configResp.json()
          setAiConfig(prev => ({ ...prev, ...cfg, apiKey: '' }))
        }
        if (providersResp.ok) {
          setAiProviders(await providersResp.json())
        }
      } catch {}
    }
    loadAi()
  }, [])

  const handleSaveAiConfig = async () => {
    setAiSaving(true)
    try {
      const resp = await fetch(`${API_URL}/api/llm/config`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey || undefined,
          model: aiConfig.model,
          baseUrl: aiConfig.provider === 'ollama' ? aiConfig.baseUrl : undefined,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)
      setAiConfig(prev => ({ ...prev, ...data.config, apiKey: '' }))
      toast.success('Configuração de IA salva!', { description: `${aiConfig.provider} / ${aiConfig.model}` })
      setAiDialogOpen(false)
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e.message })
    } finally {
      setAiSaving(false)
    }
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/analytics/dashboard`, { headers: authHeaders(), credentials: 'include' as RequestCredentials })
        if (resp.ok) {
          const data = await resp.json()
          setVulnCount(data.totalVulnerabilities || data.total || 0)
        }
      } catch {}
    }
    fetchStats()
  }, [])

  const importContent = async (text: string, source: string) => {
    if (!text.trim()) { toast.error('Conteúdo vazio'); return }
    setImporting(true)
    try {
      const trimmed = text.trimStart()
      const isXml = trimmed.startsWith('<') || trimmed.startsWith('<!--')
      const isJson = trimmed.startsWith('[') || trimmed.startsWith('{')

      if (isXml) {
        const resp = await fetch(`${API_URL}/api/vulnerabilities/import-xml`, {
          method: 'POST', headers: { ...authHeaders() }, credentials: 'include', body: JSON.stringify({ xml: text })
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Erro ao importar XML')
        toast.success(`XML importado (${source})`, { description: `${data.imported || 0} vulnerabilidades importadas` })
        setPastedContent("")
        setTimeout(() => window.location.reload(), 1500)
      } else if (isJson) {
        let payload = JSON.parse(text)
        if (!Array.isArray(payload)) {
          if (payload.issues) payload = payload.issues
          else if (payload.data) payload = payload.data
          else payload = [payload]
        }
        const resp = await fetch(`${API_URL}/api/vulnerabilities/import`, {
          method: 'POST', headers: { ...authHeaders() }, credentials: 'include', body: JSON.stringify(payload)
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Erro ao importar JSON')
        toast.success(`JSON importado (${source})`, { description: `${data.imported || 0} vulnerabilidades importadas` })
        setPastedContent("")
        setTimeout(() => window.location.reload(), 1500)
      } else {
        throw new Error('Formato não reconhecido. Use XML ou JSON.')
      }
    } catch (err: any) {
      toast.error('Erro na importação', { description: err.message })
    } finally {
      setImporting(false)
    }
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    importContent(await file.text(), `arquivo ${file.name}`)
  }

  const handleFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.xml,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) importContent(await file.text(), `arquivo ${file.name}`)
    }
    input.click()
  }

  const handleConfigure = (id: string) => {
    if (id === 'ai-config') {
      setAiDialogOpen(true)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Integrações</h2>
          <p className="text-sm text-muted-foreground">Conecte ferramentas externas para automatizar seu fluxo de segurança</p>
        </div>
        <div className="flex gap-2">
          <a href="/sincronizacao" className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-xs font-semibold hover:bg-muted transition whitespace-nowrap">
            <RefreshCw className="h-3.5 w-3.5" /> Sincronização
          </a>
          <a href="/integracoes" className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-xs font-semibold hover:bg-muted transition whitespace-nowrap">
            <Webhook className="h-3.5 w-3.5" /> Hub Completo
          </a>
        </div>
      </div>

      {/* Skills Ativas — Pentest Agents */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-foreground">Skills Ativas (Pentest Agents)</h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Zekrom — default skill */}
          <div className="group relative rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-purple-500/5 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 shrink-0">
                <Zap className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Default · Ativa
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Zekrom · DAST</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Skill agêntica para validar mudanças DAST em <b>Web</b> ou <b>APIs WSO2</b>.
              Ingere OpenAPI/Swagger, gera checklist OWASP e contexto Copilot. Pré-configurada.
            </p>
            <Button variant="default" size="sm" className="w-full text-xs bg-emerald-500 hover:bg-emerald-600" onClick={() => setZekromOpen(true)}>
              <Settings2 className="mr-1.5 h-3 w-3" />
              Configurar Skill
            </Button>
          </div>
        </div>
      </div>

      {/* Zekrom config dialog */}
      <Dialog open={zekromOpen} onOpenChange={setZekromOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              Zekrom · Configuração da Skill
            </DialogTitle>
            <DialogDescription>
              Defaults aplicados em toda execução do Zekrom. Pentester pode sobrescrever por sessão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Escopo padrão</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['api','web','both'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setZekromScope(s)}
                    className={cn("rounded-lg border p-2 text-xs font-semibold uppercase tracking-wider",
                      zekromScope === s ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground")}
                  >
                    {s === 'api' ? 'API Top 10' : s === 'web' ? 'Web Top 10' : 'API + Web'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">WSO2 Devportal URL (opcional)</Label>
              <Input
                placeholder="https://wso2.caixa.gov.br/api/am/devportal/v3"
                value={zekromWso2}
                onChange={(e) => setZekromWso2(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Atalho — pré-preenchido no campo URL do Zekrom</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Modelo de IA preferido pra Skill</Label>
              <Input
                value={aiProviders[aiConfig.provider]?.name || aiConfig.provider}
                disabled
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Skill usa o provider configurado em Motor de IA abaixo.</p>
            </div>

            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-[11px] text-emerald-700 dark:text-emerald-400">
              <div className="font-semibold mb-1">Compliance Unisys AI P1.0</div>
              <ul className="space-y-0.5 list-disc list-inside opacity-90">
                <li>Skill nunca executa requests — só gera dicas + cURL para o pentester</li>
                <li>Todo output rotulado como "Content Created By/With Use of AI"</li>
                <li>Tokens WSO2 ficam só na sessão (não persistido)</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setZekromOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setZekromOpen(false); toast.success('Skill Zekrom configurada', { description: `Escopo: ${zekromScope}` }) }}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Salvar
            </Button>
            <Button variant="default" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => window.location.href = '/pentest/zekrom'}>
              <ArrowRight className="mr-2 h-4 w-4" /> Abrir agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inteligência Artificial */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Motor de IA — AISEC</h3>
          <Separator className="flex-1" />
        </div>
        <p className="text-xs text-muted-foreground mb-4 -mt-2">
          Providers categorizados conforme <b>Unisys AI Acceptable Use Guidelines</b>. Use Unisys-approved ou Local para dados confidenciais.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* AI Provider Card - Dynamic (current selection) */}
          <div className="group relative rounded-xl border bg-card p-5 transition-all duration-200 border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20 border border-purple-500/20 shrink-0">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <Badge variant="outline" className={cn("text-[10px] gap-1",
                aiConfig.hasApiKey
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", aiConfig.hasApiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                {aiConfig.hasApiKey ? 'Configurado' : 'Não configurado'}
              </Badge>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-0.5">
              Provider atual — {aiProviders[aiConfig.provider]?.name || aiConfig.provider}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-1">
              Modelo: <span className="font-mono text-foreground">{aiConfig.model}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Gera relatórios C-Level, análises de risco, Attack Graphs e alimenta as Skills (Zekrom).
            </p>

            <Button variant="default" size="sm" className="w-full text-xs" onClick={() => handleConfigure('ai-config')}>
              <Settings2 className="mr-1.5 h-3 w-3" />
              Configurar IA
            </Button>
          </div>

          {/* GitHub Copilot / Models — Unisys-approved (RECOMMENDED) */}
          <div className={cn("group relative rounded-xl border-2 p-5 transition-all duration-200",
            aiConfig.provider === 'github' ? "border-emerald-500/50 bg-emerald-500/5" : "border-emerald-500/30 bg-emerald-500/[0.03]"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-50 border border-slate-700 shrink-0">
                <GitHubIcon className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[9px] gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  Unisys-Approved
                </Badge>
                {aiConfig.provider === 'github' && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo
                  </Badge>
                )}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">GitHub Copilot / Models</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Modelos via GitHub Models (mesma infra Copilot): GPT-4o, Phi-3.5, Llama 3.3, Mistral. Compatível com a política Unisys AI P1.0.
            </p>
            <Button variant={aiConfig.provider === 'github' ? 'default' : 'outline'} size="sm" className={cn("w-full text-xs", aiConfig.provider === 'github' && "bg-emerald-500 hover:bg-emerald-600")} onClick={() => { setAiConfig(p => ({ ...p, provider: 'github' as any, model: 'gpt-4o-mini' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'github' ? 'Configurado' : 'Selecionar (Recomendado)'}
            </Button>
          </div>

          {/* Groq card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'groq' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0 text-lg font-bold text-orange-500">G</div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[9px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  External · Restrito
                </Badge>
                {aiConfig.provider === 'groq' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Groq</h3>
            <p className="text-xs text-muted-foreground mb-4">LPU Inference — LLaMA, Mixtral, Gemma. Tier gratuito. Não submeter dados confidenciais sem aprovação CISO.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'groq', model: 'llama-3.3-70b-versatile' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'groq' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>

          {/* OpenAI card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'openai' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 shrink-0">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="#10a37f"/></svg>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[9px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  External · Restrito
                </Badge>
                {aiConfig.provider === 'openai' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">OpenAI</h3>
            <p className="text-xs text-muted-foreground mb-4">GPT-4o, GPT-4 Turbo, GPT-3.5. Não submeter Confidential Info sem aprovação CISO.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'openai', model: 'gpt-4o-mini' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'openai' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>

          {/* Anthropic card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'anthropic' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M17.304 3h-3.613L20.087 21h3.613L17.304 3zM6.696 3L.3 21h3.613l1.36-3.838h6.874L13.505 21h3.612L10.72 3H6.696zm.862 11.162L9.708 8.4l2.15 5.762H7.558z" fill="#D97706"/></svg>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[9px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  External · Restrito
                </Badge>
                {aiConfig.provider === 'anthropic' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Anthropic</h3>
            <p className="text-xs text-muted-foreground mb-4">Claude Sonnet, Haiku, Opus. Não submeter Confidential Info sem aprovação CISO.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'anthropic', model: 'claude-sonnet-4-20250514' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'anthropic' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>

          {/* Google card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'google' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 text-lg font-bold text-emerald-500">G</div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[9px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  External · Restrito
                </Badge>
                {aiConfig.provider === 'google' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Google Gemini</h3>
            <p className="text-xs text-muted-foreground mb-4">Gemini 2.0 Flash e Pro — multimodal. Não submeter Confidential Info sem aprovação CISO.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'google', model: 'gemini-2.0-flash' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'google' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>

          {/* Ollama card — Local / Safe */}
          <div className={cn("group relative rounded-xl border-2 p-5 transition-all duration-200",
            aiConfig.provider === 'ollama' ? "border-sky-500/50 bg-sky-500/5" : "border-sky-500/30 bg-sky-500/[0.03]"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500/10 border border-slate-500/20 shrink-0 text-lg">🦙</div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[9px] gap-1 bg-sky-500/15 text-sky-600 border-sky-500/30">
                  Local · Zero Egress
                </Badge>
                {aiConfig.provider === 'ollama' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Ollama (Local)</h3>
            <p className="text-xs text-muted-foreground mb-4">Execute modelos 100% on-prem (Llama 3.2 vision, Mistral, Phi). Nenhum dado sai do ambiente Unisys.</p>
            <Button variant={aiConfig.provider === 'ollama' ? 'default' : 'outline'} size="sm" className={cn("w-full text-xs", aiConfig.provider === 'ollama' && "bg-sky-500 hover:bg-sky-600")} onClick={() => { setAiConfig(p => ({ ...p, provider: 'ollama', model: 'llama3.2-vision' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'ollama' ? 'Configurado' : 'Selecionar (Safe)'}
            </Button>
          </div>
        </div>
      </div>

      {/* ============ IBM RTC ============ */}
      <RtcIntegrationSection />

      {/* ============ AI CONFIG DIALOG ============ */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              Configurar Inteligência Artificial
            </DialogTitle>
            <DialogDescription>
              Escolha o provider e modelo que o motor de IA vai usar para gerar análises
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Provider</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(aiProviders).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setAiConfig(prev => ({ ...prev, provider: key as any, model: p.models[0] }))}
                    className={cn(
                      "rounded-lg border p-2 text-center transition-all text-[11px] font-medium",
                      aiConfig.provider === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Modelo</Label>
              <div className="grid grid-cols-2 gap-2">
                {(aiProviders[aiConfig.provider]?.models || []).map(m => (
                  <button
                    key={m}
                    onClick={() => setAiConfig(prev => ({ ...prev, model: m }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-all",
                      aiConfig.model === m
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/30"
                    )}
                  >
                    <span className="text-xs font-mono font-medium text-foreground">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            {aiConfig.provider !== 'ollama' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  API Key
                  {aiConfig.hasApiKey && (
                    <span className="ml-2 text-emerald-600 font-normal">(já configurada)</span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={aiConfig.hasApiKey ? '••••••••••••••••' : 'Cole sua API key aqui'}
                  value={aiConfig.apiKey}
                  onChange={e => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">
                  {aiConfig.provider === 'groq' && 'Pegue em console.groq.com/keys (tier gratuito disponível)'}
                  {aiConfig.provider === 'openai' && 'Pegue em platform.openai.com/api-keys'}
                  {aiConfig.provider === 'anthropic' && 'Pegue em console.anthropic.com/settings/keys'}
                  {aiConfig.provider === 'google' && 'Pegue em aistudio.google.com/apikey'}
                </p>
              </div>
            )}

            {/* Ollama URL */}
            {aiConfig.provider === 'ollama' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">URL do Ollama</Label>
                <Input
                  placeholder="http://localhost:11434"
                  value={aiConfig.baseUrl}
                  onChange={e => setAiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Instale o Ollama em ollama.com e rode o modelo desejado</p>
              </div>
            )}

            {/* Current status */}
            {aiConfig.hasApiKey && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">
                  IA configurada: {aiProviders[aiConfig.provider]?.name} / {aiConfig.model}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAiConfig} disabled={aiSaving}>
              {aiSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {aiSaving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ IBM RTC Integration Section ============
function RtcIntegrationSection() {
  const [uploading, setUploading] = useState(false)
  const [pdfResult, setPdfResult] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)

  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Apenas arquivos PDF sao aceitos')
      return
    }
    setUploading(true)
    setPdfResult(null)
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const resp = await fetch(`${API_URL}/api/rtc/import-pdf`, {
        method: 'POST',
        headers: { ...Object.fromEntries(Object.entries(authHeaders()).filter(([k]) => k !== 'Content-Type')) },
        credentials: 'include',
        body: formData,
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erro ao importar PDF')

      setPdfResult(data)
      toast.success(`PDF importado!`, {
        description: `${data.created} vulnerabilidades criadas, ${data.skipped} ja existentes`,
      })

      if (data.created > 0) {
        setTimeout(() => window.location.reload(), 2500)
      }
    } catch (err: any) {
      toast.error('Erro ao importar PDF', { description: err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handlePdfUpload(file)
  }

  const handleFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handlePdfUpload(file)
    }
    input.click()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">IBM RTC — Importar Vulnerabilidades</h3>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleFileSelect}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
            dragOver
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-border hover:border-emerald-500/50 hover:bg-muted/30"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-medium text-foreground">Processando PDF...</p>
              <p className="text-xs text-muted-foreground">Extraindo vulnerabilidades do Epic</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <FileText className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Arraste o PDF do RTC aqui</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar arquivo</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Aceita PDF de Epics do IBM RTC/EWM
              </Badge>
            </div>
          )}
        </div>

        {/* Info + Results */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-500" />
              Como funciona
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>1. Abra o Epic no IBM RTC (EWM)</li>
              <li>2. Imprima como PDF (Ctrl+P)</li>
              <li>3. Arraste o PDF aqui</li>
              <li>4. O sistema extrai automaticamente:</li>
              <li className="ml-4">- Nome da vulnerabilidade</li>
              <li className="ml-4">- Criticidade (Gravidade)</li>
              <li className="ml-4">- Squad responsavel</li>
              <li className="ml-4">- Data de criacao</li>
              <li className="ml-4">- Criado por (responsavel)</li>
              <li className="ml-4">- Descricao tecnica</li>
            </ul>
          </div>

          {/* Results */}
          {pdfResult && (
            <div className={cn(
              "rounded-xl border p-4",
              pdfResult.created > 0
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            )}>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                {pdfResult.created > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Info className="h-4 w-4 text-amber-500" />
                )}
                Resultado da Importacao
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="rounded-lg bg-background p-2">
                  <p className="text-lg font-bold text-emerald-500">{pdfResult.created}</p>
                  <p className="text-[10px] text-muted-foreground">Criadas</p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="text-lg font-bold text-amber-500">{pdfResult.skipped}</p>
                  <p className="text-[10px] text-muted-foreground">Duplicadas</p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="text-lg font-bold text-red-500">{pdfResult.errors?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Erros</p>
                </div>
              </div>
              {pdfResult.parsed?.length > 0 && (
                <div className="space-y-1">
                  {pdfResult.parsed.map((v: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs rounded-lg bg-background px-2 py-1.5">
                      <span className="font-medium text-foreground truncate flex-1">{v.titulo}</span>
                      <Badge variant="outline" className="text-[9px] ml-2">{v.criticidade}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
