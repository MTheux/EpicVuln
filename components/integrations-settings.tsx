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
function JiraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M11.53 2c0 4.97-4.03 9-9 9h-.03c4.97 0 9 4.03 9 9v.03c0-4.97 4.03-9 9-9h.03c-4.97 0-9-4.03-9-9V2z" fill="#2684FF"/>
    </svg>
  )
}

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

const mapeamentoCampos = [
  { jira: 'Summary', vulnControl: 'Título', icon: '📝' },
  { jira: 'Description', vulnControl: 'Descrição', icon: '📄' },
  { jira: 'Priority', vulnControl: 'Criticidade', icon: '🔴' },
  { jira: 'Assignee', vulnControl: 'Responsável', icon: '👤' },
  { jira: 'Team', vulnControl: 'Squad', icon: '👥' },
  { jira: 'Due Date', vulnControl: 'SLA', icon: '📅' },
  { jira: 'Issue Key', vulnControl: 'Jira Key', icon: '🔑' },
  { jira: 'CVSS (Custom)', vulnControl: 'Score', icon: '📊' },
  { jira: 'Asset (Custom)', vulnControl: 'Ativo/Alvo', icon: '🎯' },
  { jira: 'Attachment', vulnControl: 'Evidência', icon: '📎' },
]

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

const integrations: IntegrationDef[] = [
  // Chat & Alerts
  { id: 'slack', name: 'Slack', description: 'Receba alertas de SLA, novas vulns e resumos semanais via webhook', icon: <SlackIcon className="h-6 w-6" />, category: 'chat', status: 'available', configurable: true },
  { id: 'teams', name: 'Microsoft Teams', description: 'Notificações no Teams via webhook de canal', icon: <TeamsIcon className="h-6 w-6" />, category: 'chat', status: 'available', configurable: true },
  { id: 'email', name: 'E-mail (SMTP)', description: 'Alertas e resumos diretamente no e-mail corporativo', icon: <Mail className="h-6 w-6 text-slate-600" />, category: 'email', status: 'coming_soon' },

  // Issue Trackers
  { id: 'jira', name: 'Atlassian Jira', description: 'Importação de vulnerabilidades via XML/JSON do Jira Cloud e Data Center', icon: <JiraIcon className="h-6 w-6" />, category: 'tracker', status: 'available', configurable: true },
  { id: 'github', name: 'GitHub Issues', description: 'Crie issues no GitHub para acompanhar correções de vulnerabilidades', icon: <GitHubIcon className="h-6 w-6" />, category: 'tracker', status: 'coming_soon' },
  { id: 'azure', name: 'Azure DevOps', description: 'Crie work items no Azure Boards para rastreamento de correções', icon: <div className="h-6 w-6 bg-[#0078D4] rounded text-white flex items-center justify-center text-[10px] font-bold">Az</div>, category: 'tracker', status: 'coming_soon' },

  // Scanners
  { id: 'defectdojo', name: 'DefectDojo', description: 'Importe findings diretamente do DefectDojo via API', icon: <DefectDojoIcon className="h-6 w-6" />, category: 'scanner', status: 'coming_soon' },
  { id: 'burp', name: 'Burp Suite', description: 'Importe resultados de scan do Burp Suite Professional', icon: <Bug className="h-6 w-6 text-orange-500" />, category: 'scanner', status: 'coming_soon' },
]

function IntegrationCard({ integration, onConfigure }: { integration: IntegrationDef, onConfigure: (id: string) => void }) {
  const statusConfig = {
    connected: { label: 'Conectado', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    available: { label: 'Disponível', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20', dot: 'bg-blue-500' },
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

  // Jira config dialog
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false)
  const [jiraConfig, setJiraConfig] = useState({ url: 'https://credsystem.atlassian.net', projects: 'SEC, VULN, APPSEC' })
  const [jiraTab, setJiraTab] = useState<string>('import')

  // Slack/Teams webhook dialog
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false)
  const [webhookTarget, setWebhookTarget] = useState<'slack' | 'teams'>('slack')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookTesting, setWebhookTesting] = useState(false)

  // Saved webhook configs
  const [savedWebhooks, setSavedWebhooks] = useState<Record<string, { url: string, enabled: boolean }>>({})

  // AI Config
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiConfig, setAiConfig] = useState({ provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey: '', baseUrl: '', hasApiKey: false })
  const [aiProviders, setAiProviders] = useState<Record<string, { name: string, models: string[] }>>({})
  const [aiTesting, setAiTesting] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)

  // Load saved webhooks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vulncontrol_webhooks')
      if (saved) setSavedWebhooks(JSON.parse(saved))
    } catch {}
  }, [])

  const saveWebhook = (target: string, url: string) => {
    const updated = { ...savedWebhooks, [target]: { url, enabled: true } }
    setSavedWebhooks(updated)
    localStorage.setItem('vulncontrol_webhooks', JSON.stringify(updated))
  }

  const removeWebhook = (target: string) => {
    const updated = { ...savedWebhooks }
    delete updated[target]
    setSavedWebhooks(updated)
    localStorage.setItem('vulncontrol_webhooks', JSON.stringify(updated))
  }

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
    if (id === 'jira') {
      setJiraDialogOpen(true)
    } else if (id === 'slack' || id === 'teams') {
      setWebhookTarget(id)
      setWebhookUrl(savedWebhooks[id]?.url || '')
      setWebhookDialogOpen(true)
    } else if (id === 'ai-config') {
      setAiDialogOpen(true)
    }
  }

  const testWebhook = async () => {
    if (!webhookUrl.trim()) { toast.error('Cole a URL do webhook'); return }
    setWebhookTesting(true)
    try {
      const payload = webhookTarget === 'slack'
        ? { text: "✅ *VulnControl* — Teste de conexão com sucesso!\nSeu webhook está configurado corretamente." }
        : { "@type": "MessageCard", "@context": "http://schema.org/extensions", "summary": "VulnControl Test", "themeColor": "0076D7", "title": "✅ VulnControl — Teste de Conexão", "text": "Seu webhook está configurado corretamente!" }

      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (resp.ok || resp.status === 200 || resp.status === 202 || resp.status === 1) {
        saveWebhook(webhookTarget, webhookUrl)
        toast.success(`${webhookTarget === 'slack' ? 'Slack' : 'Teams'} conectado!`, {
          description: 'Mensagem de teste enviada com sucesso. Verifique o canal.'
        })
        setWebhookDialogOpen(false)
      } else {
        throw new Error(`Status ${resp.status}`)
      }
    } catch (err: any) {
      // Some webhooks return opaque responses due to CORS but still work
      if (err.message?.includes('opaque') || err.name === 'TypeError') {
        saveWebhook(webhookTarget, webhookUrl)
        toast.success(`Webhook salvo!`, {
          description: 'URL salva. Verifique se a mensagem de teste chegou no canal.'
        })
        setWebhookDialogOpen(false)
      } else {
        toast.error('Erro ao testar webhook', { description: err.message })
      }
    } finally {
      setWebhookTesting(false)
    }
  }

  // Update integration statuses based on saved webhooks
  const getIntegrationStatus = (integration: IntegrationDef): IntegrationDef['status'] => {
    if (integration.id === 'slack' && savedWebhooks.slack?.enabled) return 'connected'
    if (integration.id === 'teams' && savedWebhooks.teams?.enabled) return 'connected'
    return integration.status
  }

  const chatIntegrations = integrations.filter(i => i.category === 'chat' || i.category === 'email')
  const trackerIntegrations = integrations.filter(i => i.category === 'tracker')
  const scannerIntegrations = integrations.filter(i => i.category === 'scanner')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrações</h2>
        <p className="text-sm text-muted-foreground">Conecte ferramentas externas para automatizar seu fluxo de segurança</p>
      </div>

      {/* Chat & Alertas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Chat & Alertas</h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chatIntegrations.map(i => (
            <IntegrationCard
              key={i.id}
              integration={{ ...i, status: getIntegrationStatus(i) }}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      </div>

      {/* Rastreadores de Issues */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Rastreadores de Issues</h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackerIntegrations.map(i => (
            <IntegrationCard
              key={i.id}
              integration={{ ...i, status: getIntegrationStatus(i) }}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      </div>

      {/* Scanners de Segurança */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Scanners de Segurança</h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scannerIntegrations.map(i => (
            <IntegrationCard
              key={i.id}
              integration={{ ...i, status: getIntegrationStatus(i) }}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      </div>

      {/* Inteligência Artificial */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Inteligência Artificial</h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* AI Provider Card - Dynamic */}
          <div className="group relative rounded-xl border bg-card p-5 transition-all duration-200 border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 shrink-0">
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
              Motor de IA — {aiProviders[aiConfig.provider]?.name || aiConfig.provider}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-1">
              Modelo: <span className="font-mono text-foreground">{aiConfig.model}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Gera relatórios C-Level, análises de risco e Attack Graphs automaticamente
            </p>

            <Button variant="default" size="sm" className="w-full text-xs" onClick={() => handleConfigure('ai-config')}>
              <Settings2 className="mr-1.5 h-3 w-3" />
              Configurar IA
            </Button>
          </div>

          {/* Groq card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'groq' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0 text-lg font-bold text-orange-500">G</div>
              {aiConfig.provider === 'groq' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Groq</h3>
            <p className="text-xs text-muted-foreground mb-4">LPU Inference — LLaMA, Mixtral, Gemma com latência ultra-baixa. Tier gratuito disponível.</p>
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
              {aiConfig.provider === 'openai' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">OpenAI</h3>
            <p className="text-xs text-muted-foreground mb-4">GPT-4o, GPT-4 Turbo e GPT-3.5 — alta qualidade de análise e geração de texto.</p>
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
              {aiConfig.provider === 'anthropic' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Anthropic</h3>
            <p className="text-xs text-muted-foreground mb-4">Claude Sonnet, Haiku e Opus — excelente em análise de segurança e raciocínio.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'anthropic', model: 'claude-sonnet-4-20250514' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'anthropic' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>

          {/* Google card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'google' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0 text-lg font-bold text-blue-500">G</div>
              {aiConfig.provider === 'google' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Google Gemini</h3>
            <p className="text-xs text-muted-foreground mb-4">Gemini 2.0 Flash e Pro — multimodal com contexto longo e boa performance.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'google', model: 'gemini-2.0-flash' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'google' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>

          {/* Ollama card */}
          <div className={cn("group relative rounded-xl border bg-card p-5 transition-all duration-200",
            aiConfig.provider === 'ollama' ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-70"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500/10 border border-slate-500/20 shrink-0 text-lg">🦙</div>
              {aiConfig.provider === 'ollama' && <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Ativo</Badge>}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Ollama (Local)</h3>
            <p className="text-xs text-muted-foreground mb-4">Execute modelos localmente sem API key. LLaMA, Mistral, Phi, CodeLlama.</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setAiConfig(p => ({ ...p, provider: 'ollama', model: 'llama3' })); handleConfigure('ai-config') }}>
              {aiConfig.provider === 'ollama' ? 'Configurado' : 'Selecionar'}
            </Button>
          </div>
        </div>
      </div>

      {/* ============ JIRA DIALOG ============ */}
      <Dialog open={jiraDialogOpen} onOpenChange={setJiraDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <JiraIcon className="h-5 w-5" />
              </div>
              Atlassian Jira
            </DialogTitle>
            <DialogDescription>
              Configure a importação manual de vulnerabilidades do Jira
            </DialogDescription>
          </DialogHeader>

          <Tabs value={jiraTab} onValueChange={setJiraTab}>
            <TabsList className="w-full bg-muted/50">
              <TabsTrigger value="import" className="flex-1 text-xs gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Importar
              </TabsTrigger>
              <TabsTrigger value="config" className="flex-1 text-xs gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Configuração
              </TabsTrigger>
              <TabsTrigger value="mapping" className="flex-1 text-xs gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Mapeamento
              </TabsTrigger>
            </TabsList>

            {/* Import Tab */}
            <TabsContent value="import" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Instância</p>
                  <p className="text-sm font-semibold text-foreground">credsystem</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Importadas</p>
                  <p className="text-lg font-bold text-primary">{vulnCount ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Método</p>
                  <p className="text-sm font-semibold text-foreground">Manual</p>
                </div>
              </div>

              {/* How-to */}
              <div className="flex items-start gap-3 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3.5">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Como exportar do Jira:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-1">
                    <li>Acesse o Jira → Filtro do projeto (SEC, VULN ou APPSEC)</li>
                    <li>Clique em <strong>Exportar</strong> → <strong>XML (RSS)</strong></li>
                    <li>Arraste o arquivo abaixo ou cole o conteúdo</li>
                  </ol>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
                  dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40",
                  importing && "opacity-50 pointer-events-none"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={handleFileSelect}
              >
                {importing ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                )}
                <p className="text-sm font-medium text-foreground mb-1">
                  {importing ? 'Processando...' : 'Arraste o arquivo aqui'}
                </p>
                <p className="text-xs text-muted-foreground">XML (Jira RSS) ou JSON</p>
              </div>

              {/* Paste area */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Ou cole o conteúdo:</Label>
                <Textarea
                  placeholder="Cole aqui o XML ou JSON exportado do Jira..."
                  className="min-h-[120px] font-mono text-xs bg-muted/20"
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  disabled={importing}
                />
                <Button className="w-full" onClick={() => importContent(pastedContent, 'colado')} disabled={importing || !pastedContent.trim()}>
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {importing ? 'Processando...' : 'Importar Dados'}
                </Button>
              </div>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">URL da instância Jira</Label>
                  <Input value={jiraConfig.url} onChange={e => setJiraConfig(p => ({ ...p, url: e.target.value }))} placeholder="https://sua-empresa.atlassian.net" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Projetos monitorados (separados por vírgula)</Label>
                  <Input value={jiraConfig.projects} onChange={e => setJiraConfig(p => ({ ...p, projects: e.target.value }))} placeholder="SEC, VULN, APPSEC" />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-foreground mb-2">Observação sobre SSO:</p>
                <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3.5">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>A integração via <strong>API token</strong> não é suportada quando o Jira usa SSO corporativo (SAML/OIDC). Por isso, o VulnControl usa <strong>importação manual</strong> via XML/JSON.</p>
                    <p>Para integração automática, solicite um <strong>Service Account</strong> ao time de IAM da sua empresa.</p>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={() => { toast.success("Configuração salva"); setJiraDialogOpen(false) }}>
                Salvar Configuração
              </Button>
            </TabsContent>

            {/* Mapping Tab */}
            <TabsContent value="mapping" className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">Correspondência entre campos do Jira e do VulnControl</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {mapeamentoCampos.map((m) => (
                  <div key={m.jira} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                    <span className="text-sm">{m.icon}</span>
                    <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                      <span className="text-muted-foreground truncate">{m.jira}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground truncate">{m.vulnControl}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ============ WEBHOOK DIALOG (Slack/Teams) ============ */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 border border-border/50">
                {webhookTarget === 'slack' ? <SlackIcon className="h-5 w-5" /> : <TeamsIcon className="h-5 w-5" />}
              </div>
              {webhookTarget === 'slack' ? 'Slack' : 'Microsoft Teams'}
            </DialogTitle>
            <DialogDescription>
              Configure um webhook para receber alertas no {webhookTarget === 'slack' ? 'Slack' : 'Teams'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Instructions */}
            <div className="flex items-start gap-3 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3.5">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                {webhookTarget === 'slack' ? (
                  <>
                    <p className="font-medium text-foreground">Como criar o Webhook no Slack:</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-1">
                      <li>Acesse <strong>api.slack.com/apps</strong> → Criar novo App</li>
                      <li>Ative <strong>Incoming Webhooks</strong></li>
                      <li>Selecione o canal desejado e copie a URL</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Como criar o Webhook no Teams:</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-1">
                      <li>No canal desejado, clique em <strong>...</strong> → <strong>Conectores</strong></li>
                      <li>Busque <strong>Incoming Webhook</strong> → Configurar</li>
                      <li>Nomeie e copie a URL gerada</li>
                    </ol>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">URL do Webhook</Label>
              <Input
                placeholder={webhookTarget === 'slack' ? 'https://hooks.slack.com/services/T.../B.../...' : 'https://outlook.office.com/webhook/...'}
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
            </div>

            {/* Notification types */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Alertas que serão enviados:</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'SLA vencendo', desc: '7 dias antes' },
                  { label: 'SLA vencido', desc: 'Alerta imediato' },
                  { label: 'Nova vulnerabilidade', desc: 'Crítica/Extrema' },
                  { label: 'Resumo semanal', desc: 'Segunda-feira' },
                ].map(a => (
                  <div key={a.label} className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium text-foreground">{a.label}</p>
                      <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current status */}
            {savedWebhooks[webhookTarget] && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">Webhook ativo</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => {
                  removeWebhook(webhookTarget)
                  setWebhookUrl('')
                  toast.success('Webhook removido')
                }}>
                  Desconectar
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWebhookDialogOpen(false)}>Cancelar</Button>
            <Button onClick={testWebhook} disabled={webhookTesting || !webhookUrl.trim()}>
              {webhookTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {webhookTesting ? 'Testando...' : 'Testar e Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ AI CONFIG DIALOG ============ */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
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
