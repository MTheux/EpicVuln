"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Link2,
  Building2,
  Palette,
  Check,
  Eye,
  Minimize2,
  Bell,
  Shield,
  Users,
  Clock,
  AlertTriangle,
  Mail,
  UserPlus,
  Pencil,
  Trash2,
  Lock,
  KeyRound,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  type LucideIcon
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { IntegrationsSettings } from "@/components/integrations-settings"
import { usePreferences } from "@/components/preferences-provider"
import { authHeaders, getUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSlaConfig } from "@/lib/use-sla"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}
const API_URL = getApiUrl()

// ============ Theme Preview ============
function ThemePreview({ variant }: { variant: "light" | "dark" }) {
  const d = variant === "dark"
  return (
    <div className={cn("w-full aspect-[16/10] rounded-lg overflow-hidden border",
      d ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
    )}>
      <div className="flex h-full">
        <div className={cn("w-[22%] h-full p-1.5 space-y-1", d ? "bg-slate-800" : "bg-slate-100")}>
          <div className={cn("h-1.5 w-3/4 rounded-full", d ? "bg-slate-600" : "bg-slate-300")} />
          <div className={cn("h-1.5 w-full rounded-full", d ? "bg-blue-500/60" : "bg-blue-500/50")} />
          <div className={cn("h-1.5 w-5/6 rounded-full", d ? "bg-slate-600" : "bg-slate-300")} />
          <div className={cn("h-1.5 w-4/5 rounded-full", d ? "bg-slate-600" : "bg-slate-300")} />
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          <div className={cn("h-1.5 w-1/3 rounded-full", d ? "bg-slate-600" : "bg-slate-300")} />
          <div className="grid grid-cols-3 gap-1">
            {[1,2,3].map(i => <div key={i} className={cn("h-6 rounded", d ? "bg-slate-800" : "bg-slate-50")} />)}
          </div>
          <div className={cn("h-8 rounded", d ? "bg-slate-800" : "bg-slate-50")} />
        </div>
      </div>
    </div>
  )
}

// ============ Setting Row ============
function SettingRow({ icon: Icon, label, description, checked, onChange }: {
  icon: LucideIcon; label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// ============ SLA Config ============
const SLA_SEVERITY_META: { key: string; severity: string; color: string }[] = [
  { key: 'EXTREMA', severity: 'Extrema', color: 'bg-red-600' },
  { key: 'CRITICA', severity: 'Crítica', color: 'bg-orange-500' },
  { key: 'ALTA', severity: 'Alta', color: 'bg-amber-500' },
  { key: 'MEDIA', severity: 'Média', color: 'bg-yellow-400' },
  { key: 'BAIXA', severity: 'Baixa', color: 'bg-blue-500' },
  { key: 'INFORMATIVA', severity: 'Informativa', color: 'bg-slate-400' },
]

// ============ Role Config ============
const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  SEGURANCA: 'AppSec',
  GESTOR: 'Gestor',
  SQUAD: 'Squad',
  LEITURA: 'Leitura',
}
const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-600 border-red-500/20',
  SEGURANCA: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  GESTOR: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  SQUAD: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  LEITURA: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
}

type TabId = 'appearance' | 'sla' | 'notifications' | 'users' | 'security' | 'integrations'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { preferences, setPreference } = usePreferences()
  const [activeTab, setActiveTab] = useState<TabId>('appearance')
  const [mounted, setMounted] = useState(false)

  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null)
  const isAdmin = currentUser?.role === 'ADMIN'

  // Read tab from URL query param + load user
  useEffect(() => {
    setCurrentUser(getUser())
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab && ['appearance', 'sla', 'notifications', 'users', 'security', 'integrations'].includes(tab)) {
        setActiveTab(tab as TabId)
      }
    }
  }, [])

  // Users state
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'SQUAD', password: '' })

  // Security state
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Company profile state
  const [companyProfile, setCompanyProfile] = useState<{ name?: string; sector?: string; description?: string } | null>(null)

  // SLA state (from API via hook)
  const { slaConfig: slaFromApi, saveSlaConfig, loading: slaLoading } = useSlaConfig()
  const [localSla, setLocalSla] = useState<Record<string, number>>({})
  const [slaEditing, setSlaEditing] = useState(false)

  // Sync local SLA edits from API data
  useEffect(() => {
    if (!slaLoading) {
      setLocalSla(slaFromApi)
    }
  }, [slaFromApi, slaLoading])

  // Build slaItems for display
  const slaItems = SLA_SEVERITY_META.map(meta => ({
    ...meta,
    days: localSla[meta.key] ?? 0,
    label: (localSla[meta.key] ?? 0) === 0 ? 'Imediato' : `${localSla[meta.key]} dias`,
  }))

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    slaWarning: true,
    slaExpired: true,
    newVuln: true,
    weeklyDigest: true,
    escalation: true,
    statusChange: false,
  })

  useEffect(() => {
    setMounted(true)
    // Fetch company profile
    fetch(`${API_URL}/api/settings/company-profile`, {
      headers: authHeaders(),
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCompanyProfile(data) })
      .catch(() => {})
  }, [])

  // Fetch users when tab is active
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const resp = await fetch(`${API_URL}/api/users`, {
        headers: authHeaders(),
        credentials: 'include',
      })
      if (resp.ok) {
        const data = await resp.json()
        setUsers(Array.isArray(data) ? data : data.users || [])
      }
    } catch {}
    setLoadingUsers(false)
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Preencha nome e email')
      return
    }
    try {
      const resp = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify(newUser),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erro ao criar')
      toast.success('Usuário criado', { description: `Senha temporária gerada automaticamente` })
      setUserDialogOpen(false)
      setNewUser({ name: '', email: '', role: 'SQUAD', password: '' })
      fetchUsers()
    } catch (e: any) {
      toast.error('Erro', { description: e.message })
    }
  }

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      const resp = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify({ active: !currentActive }),
      })
      if (!resp.ok) throw new Error('Erro ao atualizar')
      toast.success(currentActive ? 'Usuário desativado' : 'Usuário ativado')
      fetchUsers()
    } catch (e: any) {
      toast.error('Erro', { description: e.message })
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.newPass || passwordForm.newPass.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres')
      return
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setChangingPassword(true)
    try {
      const resp = await fetch(`${API_URL}/api/users/${currentUser?.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify({ password: passwordForm.newPass }),
      })
      if (!resp.ok) throw new Error('Erro ao alterar senha')
      toast.success('Senha alterada com sucesso')
      setPasswordForm({ current: '', newPass: '', confirm: '' })
    } catch (e: any) {
      toast.error('Erro', { description: e.message })
    }
    setChangingPassword(false)
  }

  const handlePreference = (key: keyof typeof preferences, value: boolean) => {
    setPreference(key, value)
    const labels: Record<string, string> = {
      autoContrast: "Auto-contraste",
      compactMode: "Modo compacto",
      alertSounds: "Sons de alerta",
    }
    toast.success(`${labels[key]} ${value ? "ativado" : "desativado"}`)
  }

  const tabs: { id: TabId; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'sla', label: 'SLA & Prazos', icon: Clock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'users', label: 'Usuários', icon: Users, adminOnly: true },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'integrations', label: 'Integrações', icon: Link2 },
  ]

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/10">
            <Settings className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie preferências, SLA, notificações e segurança</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-52 shrink-0">
          <nav className="sticky top-6 space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left",
                  activeTab === tab.id
                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-3xl">

      {/* ===================== APARÊNCIA ===================== */}
      {activeTab === 'appearance' && (
        <div className="space-y-8">
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Tema da Interface</h2>
              <p className="text-sm text-muted-foreground">Escolha como o VulnControl aparece para você</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { value: 'light', label: 'Claro', desc: 'Ideal para ambientes iluminados', icon: Sun },
                { value: 'dark', label: 'Escuro', desc: 'Reduz cansaço visual', icon: Moon },
                { value: 'system', label: 'Sistema', desc: 'Segue a preferência do SO', icon: Monitor },
              ].map((opt) => {
                const isActive = mounted && theme === opt.value
                return (
                  <button key={opt.value} onClick={() => setTheme(opt.value)}
                    className={cn(
                      "group relative flex flex-col rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md",
                      isActive ? "border-blue-500 bg-blue-500/5 shadow-sm shadow-blue-500/10" : "border-border bg-card hover:border-muted-foreground/30"
                    )}>
                    {isActive && (
                      <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/30">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {opt.value !== 'system' ? <ThemePreview variant={opt.value as any} /> : (
                      <div className="w-full aspect-[16/10] rounded-lg overflow-hidden border border-border flex">
                        <div className="w-1/2"><ThemePreview variant="light" /></div>
                        <div className="w-1/2"><ThemePreview variant="dark" /></div>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <opt.icon className={cn("h-4 w-4", isActive ? "text-blue-500" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-semibold", isActive ? "text-blue-500" : "text-foreground")}>{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">{opt.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <Separator />

          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Preferências</h2>
              <p className="text-sm text-muted-foreground">Ajuste o comportamento da plataforma</p>
            </div>
            <Card className="border-border bg-card">
              <CardContent className="p-0 divide-y divide-border">
                <div className="px-5">
                  <SettingRow icon={Eye} label="Auto-contraste" description="Aumenta o contraste de textos e bordas"
                    checked={preferences.autoContrast} onChange={(v) => handlePreference("autoContrast", v)} />
                </div>
                <div className="px-5">
                  <SettingRow icon={Minimize2} label="Modo compacto" description="Reduz espaçamentos para exibir mais informações"
                    checked={preferences.compactMode} onChange={(v) => handlePreference("compactMode", v)} />
                </div>
                <div className="px-5">
                  <SettingRow icon={Bell} label="Sons de alerta" description="Toca um som ao receber notificações críticas"
                    checked={preferences.alertSounds} onChange={(v) => handlePreference("alertSounds", v)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Paleta de Severidades</h2>
              <p className="text-sm text-muted-foreground">Cores usadas para classificação de vulnerabilidades</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Extremo', color: 'bg-red-600', text: 'text-white' },
                { label: 'Crítico', color: 'bg-orange-500', text: 'text-white' },
                { label: 'Alto', color: 'bg-amber-500', text: 'text-white' },
                { label: 'Médio', color: 'bg-yellow-400', text: 'text-yellow-900' },
                { label: 'Baixo', color: 'bg-blue-500', text: 'text-white' },
                { label: 'Info', color: 'bg-slate-400', text: 'text-white' },
              ].map((s) => (
                <div key={s.label} className={cn("h-10 rounded-lg shadow-sm flex items-center justify-center text-xs font-bold", s.color, s.text)}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== SLA & PRAZOS ===================== */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">SLA Corporativo</h2>
            <p className="text-sm text-muted-foreground">Prazos máximos para correção de vulnerabilidades por severidade</p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 divide-y divide-border">
                {slaItems.map((item) => (
                  <div key={item.severity} className="flex items-center gap-4 px-5 py-4">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0", item.color)}>
                      {item.days === 0 ? '!' : item.days}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.severity}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.days === 0 ? 'Correção imediata necessária' : `Até ${item.days} dias para correção`}
                      </p>
                    </div>
                    {slaEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20 h-8 text-sm text-center"
                          value={item.days}
                          min={0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            setLocalSla(prev => ({ ...prev, [item.key]: val }))
                          }}
                        />
                        <span className="text-xs text-muted-foreground">dias</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs font-medium shrink-0">
                        {item.label}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant={slaEditing ? "default" : "outline"} size="sm"
              disabled={slaLoading}
              onClick={async () => {
                if (slaEditing) {
                  try {
                    await saveSlaConfig(localSla)
                    toast.success('SLA salvo com sucesso')
                  } catch (e: any) {
                    toast.error('Erro ao salvar SLA', { description: e.message })
                  }
                }
                setSlaEditing(!slaEditing)
              }}>
              {slaEditing ? (
                <><Check className="mr-2 h-4 w-4" /> Salvar</>
              ) : (
                <><Pencil className="mr-2 h-4 w-4" /> Editar Prazos</>
              )}
            </Button>
            {slaEditing && (
              <Button variant="ghost" size="sm" onClick={() => { setLocalSla(slaFromApi); setSlaEditing(false) }}>
                Cancelar
              </Button>
            )}
          </div>

          <Separator />

          {/* SLA Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Linha do Tempo SLA</h3>
            <div className="relative">
              {/* Base line */}
              <div className="h-1 bg-muted rounded-full" />
              {/* Points */}
              <div className="flex justify-between -mt-3">
                {slaItems.map((item) => (
                  <div key={item.severity} className="flex flex-col items-center">
                    <div className={cn("h-5 w-5 rounded-full border-2 border-background shadow-sm", item.color)} />
                    <span className="text-[10px] font-semibold text-foreground mt-1.5">{item.severity.substring(0, 3)}</span>
                    <span className="text-[10px] text-muted-foreground">{item.days === 0 ? 'Imediato' : `${item.days}d`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== NOTIFICAÇÕES ===================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
            <p className="text-sm text-muted-foreground">Configure quais alertas você deseja receber</p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertas de SLA
              </CardTitle>
              <CardDescription className="text-xs">Avisos relacionados a prazos de correção</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              <div className="px-5">
                <SettingRow icon={Clock} label="Aviso de SLA próximo"
                  description="Notifica quando uma vulnerabilidade está a 7 dias do vencimento"
                  checked={notifPrefs.slaWarning}
                  onChange={(v) => { setNotifPrefs(p => ({ ...p, slaWarning: v })); toast.success(v ? 'Ativado' : 'Desativado') }} />
              </div>
              <div className="px-5">
                <SettingRow icon={AlertTriangle} label="SLA vencido"
                  description="Alerta imediato quando o prazo de correção expira"
                  checked={notifPrefs.slaExpired}
                  onChange={(v) => { setNotifPrefs(p => ({ ...p, slaExpired: v })); toast.success(v ? 'Ativado' : 'Desativado') }} />
              </div>
              <div className="px-5">
                <SettingRow icon={Shield} label="Escalação automática"
                  description="Escala para gestor quando SLA vence sem ação da squad"
                  checked={notifPrefs.escalation}
                  onChange={(v) => { setNotifPrefs(p => ({ ...p, escalation: v })); toast.success(v ? 'Ativado' : 'Desativado') }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                Atividades
              </CardTitle>
              <CardDescription className="text-xs">Atualizações sobre vulnerabilidades e relatórios</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              <div className="px-5">
                <SettingRow icon={Shield} label="Nova vulnerabilidade"
                  description="Quando uma nova vulnerabilidade é importada ou criada"
                  checked={notifPrefs.newVuln}
                  onChange={(v) => { setNotifPrefs(p => ({ ...p, newVuln: v })); toast.success(v ? 'Ativado' : 'Desativado') }} />
              </div>
              <div className="px-5">
                <SettingRow icon={CheckCircle2} label="Mudança de status"
                  description="Quando uma vulnerabilidade é corrigida ou muda de status"
                  checked={notifPrefs.statusChange}
                  onChange={(v) => { setNotifPrefs(p => ({ ...p, statusChange: v })); toast.success(v ? 'Ativado' : 'Desativado') }} />
              </div>
              <div className="px-5">
                <SettingRow icon={Mail} label="Resumo semanal"
                  description="Receba toda segunda-feira um resumo com métricas e pendências"
                  checked={notifPrefs.weeklyDigest}
                  onChange={(v) => { setNotifPrefs(p => ({ ...p, weeklyDigest: v })); toast.success(v ? 'Ativado' : 'Desativado') }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== USUÁRIOS ===================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Minha Conta - visível pra todos */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">Minha Conta</h2>
            <p className="text-sm text-muted-foreground">Gerencie suas credenciais de acesso</p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary shrink-0">
                  {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-semibold text-foreground">{currentUser?.name || '—'}</p>
                    <Badge variant="outline" className={cn("text-[10px] border", roleBadgeColors[currentUser?.role || ''] || '')}>
                      {roleLabels[currentUser?.role || ''] || currentUser?.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{currentUser?.email || '—'}</p>

                  <Separator className="mb-4" />

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-500" />
                      Alterar Senha
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Nova senha</Label>
                        <Input type="password" placeholder="Mínimo 8 caracteres" value={passwordForm.newPass}
                          onChange={e => setPasswordForm(p => ({ ...p, newPass: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Confirmar nova senha</Label>
                        <Input type="password" placeholder="Repita a nova senha" value={passwordForm.confirm}
                          onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} />
                      </div>
                    </div>

                    {/* Password strength indicator */}
                    {passwordForm.newPass && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[1,2,3,4].map(i => {
                            const strength = [
                              passwordForm.newPass.length >= 8,
                              /[A-Z]/.test(passwordForm.newPass),
                              /[0-9]/.test(passwordForm.newPass),
                              /[^A-Za-z0-9]/.test(passwordForm.newPass),
                            ].filter(Boolean).length
                            return <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors",
                              i <= strength
                                ? strength <= 1 ? "bg-red-500" : strength <= 2 ? "bg-amber-500" : strength <= 3 ? "bg-blue-500" : "bg-emerald-500"
                                : "bg-muted"
                            )} />
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { test: passwordForm.newPass.length >= 8, label: '8+ caracteres' },
                            { test: /[A-Z]/.test(passwordForm.newPass), label: 'Maiúscula' },
                            { test: /[0-9]/.test(passwordForm.newPass), label: 'Número' },
                            { test: /[^A-Za-z0-9]/.test(passwordForm.newPass), label: 'Especial' },
                          ].map(r => (
                            <span key={r.label} className={cn("text-[10px] flex items-center gap-1",
                              r.test ? "text-emerald-600" : "text-muted-foreground")}>
                              {r.test ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {r.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button size="sm" onClick={handleChangePassword} disabled={changingPassword || !passwordForm.newPass || passwordForm.newPass !== passwordForm.confirm}>
                      {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                      Alterar Senha
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gestão de Usuários - só pra ADMIN */}
          {isAdmin && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Gestão de Usuários</h2>
                  <p className="text-sm text-muted-foreground">Gerencie acessos e permissões da plataforma</p>
                </div>
                <Button size="sm" onClick={() => setUserDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </div>

              {/* Role legend */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(roleLabels).map(([role, label]) => (
                  <Badge key={role} variant="outline" className={cn("text-xs border", roleBadgeColors[role])}>
                    {label}
                  </Badge>
                ))}
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum usuário encontrado
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {users.map((u) => (
                        <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-muted/30 transition-colors">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                            {u.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                              <Badge variant="outline" className={cn("text-[10px] border shrink-0", roleBadgeColors[u.role] || '')}>
                                {roleLabels[u.role] || u.role}
                              </Badge>
                              {u.email === currentUser?.email && (
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  Você
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={cn("text-[10px]",
                              u.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                              {u.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {u.email !== currentUser?.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-8 px-2 text-xs", u.active ? "hover:text-red-600" : "hover:text-emerald-600")}
                                onClick={() => handleToggleUserActive(u.id, u.active)}
                              >
                                {u.active ? 'Desativar' : 'Ativar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Create User Dialog */}
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Novo Usuário
                    </DialogTitle>
                    <DialogDescription>
                      Uma senha temporária será gerada automaticamente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Nome completo</Label>
                      <Input placeholder="Nome do usuário" value={newUser.name}
                        onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Email</Label>
                      <Input placeholder="email@credsystem.com.br" value={newUser.email}
                        onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Perfil de acesso</Label>
                      <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateUser}>Criar Usuário</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}

      {/* ===================== SEGURANÇA ===================== */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Segurança da Conta</h2>
            <p className="text-sm text-muted-foreground">Gerencie sua sessão e visualize as proteções ativas</p>
          </div>

          {/* Current session info */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-500" />
                Sessão Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-muted/40 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Usuário</p>
                  <p className="text-sm font-semibold text-foreground">{currentUser?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email || '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Perfil</p>
                  <Badge variant="outline" className={cn("text-xs border mt-1", roleBadgeColors[currentUser?.role || ''] || '')}>
                    {roleLabels[currentUser?.role || ''] || currentUser?.role}
                  </Badge>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Token</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">HttpOnly Cookie (8h)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Tips */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                Segurança da Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Autenticação', desc: 'JWT via HttpOnly Cookie', ok: true },
                  { label: 'CORS', desc: 'Apenas origens autorizadas', ok: true },
                  { label: 'Rate Limiting', desc: 'Proteção contra brute-force', ok: true },
                  { label: 'CSP Headers', desc: 'Content Security Policy ativo', ok: true },
                  { label: 'Input Validation', desc: 'Prevenção XXE e injection', ok: true },
                  { label: 'Bcrypt', desc: 'Hash com 12 salt rounds', ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/50 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== INTEGRAÇÕES ===================== */}
      {activeTab === 'integrations' && (
        <div className="-mt-1">
          <IntegrationsSettings />
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
