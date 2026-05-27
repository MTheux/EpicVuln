"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Settings, LogOut, User, ChevronDown, Search, Building2, Bell, Sun, Moon, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getUser, logout } from "@/lib/auth"
import { navGroups } from "@/components/app-sidebar"

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  SEGURANCA: 'AppSec',
  GESTOR: 'Gestor',
  SQUAD: 'Squad',
  LEITURA: 'Leitura',
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-500 border-red-500/20',
  SEGURANCA: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  GESTOR: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  SQUAD: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  LEITURA: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
}

const TENANTS = [
  { id: 'caixa-siaci', name: 'Caixa SIACI', tag: 'Caixa Econômica · SIACI · Produção' },
  { id: 'caixa-evolucao', name: 'Caixa Evolução', tag: 'Caixa · Lab evolução · HML' },
  { id: 'unisys-internal', name: 'Unisys Internal', tag: 'Tenant Unisys interno' },
]

export function AppTopbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [tenantOpen, setTenantOpen] = useState(false)
  const [tenantId, setTenantId] = useState('caixa-siaci')
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [cmdkQuery, setCmdkQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const tenantRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const cmdkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUser(getUser())
    try {
      const saved = localStorage.getItem('aisec_tenant')
      if (saved) setTenantId(saved)
    } catch {}
  }, [])

  // ===== Cmd+K shortcut =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
      } else if (e.key === 'Escape' && cmdkOpen) {
        setCmdkOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdkOpen])

  useEffect(() => {
    if (cmdkOpen) {
      setTimeout(() => cmdkInputRef.current?.focus(), 50)
      setCmdkQuery('')
    }
  }, [cmdkOpen])

  // Close popups on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) setTenantOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'VC'
  const currentTenant = TENANTS.find((t) => t.id === tenantId) || TENANTS[0]

  // Flatten nav items for search
  const allItems = navGroups.flatMap((g) =>
    g.items.map((i) => ({ ...i, group: g.label }))
  )
  const filtered = cmdkQuery
    ? allItems.filter((i) =>
        (i.label + ' ' + i.group).toLowerCase().includes(cmdkQuery.toLowerCase())
      )
    : allItems

  // Mock notifications — pode vir do backend depois
  const notifications = [
    { id: 1, title: 'VUL-CXA-0604 · JWT alg=none crítica', desc: 'Nova vulnerabilidade detectada em HML', time: '2min', sev: 'CRITICA' },
    { id: 2, title: 'Burp Zekrom · upload recebido', desc: '1284 requests sincronizados', time: '12min', sev: 'INFO' },
    { id: 3, title: '8 vulns CRITICA fora do SLA', desc: 'Squad NM177 + NM182', time: '1h', sev: 'ALTA' },
  ]

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
        {/* Breadcrumb / page hint (esquerda) */}
        <div className="hidden lg:flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider opacity-70">AISEC</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium">{pathname.replace(/^\//, '') || 'Dashboard'}</span>
        </div>

        {/* Cmd+K search trigger (centro) */}
        <button
          onClick={() => setCmdkOpen(true)}
          className="flex-1 mx-auto max-w-md flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition text-muted-foreground text-sm"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Pesquisar...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/60">Ctrl+K</kbd>
        </button>

        {/* Tenant selector */}
        <div className="relative" ref={tenantRef}>
          <button
            onClick={() => setTenantOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 transition text-sm",
              tenantOpen ? "bg-muted" : "bg-muted/30 hover:bg-muted/60"
            )}
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium hidden md:inline">{currentTenant.name}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", tenantOpen && "rotate-180")} />
          </button>
          {tenantOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b">
                Tenants disponíveis
              </div>
              <div className="p-1">
                {TENANTS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTenantId(t.id)
                      try { localStorage.setItem('aisec_tenant', t.id) } catch {}
                      setTenantOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-sm transition",
                      t.id === tenantId ? "bg-emerald-500/10 text-emerald-300" : "hover:bg-muted/50"
                    )}
                  >
                    <Building2 className={cn("h-4 w-4 flex-shrink-0", t.id === tenantId ? "text-emerald-400" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{t.tag}</div>
                    </div>
                    {t.id === tenantId && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition"
            title="Notificações"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Notificações</span>
                <span className="text-[10px] text-emerald-400 cursor-pointer hover:underline">Marcar lidas</span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-muted/30 transition cursor-pointer">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0",
                        n.sev === 'CRITICA' ? "bg-red-500" : n.sev === 'ALTA' ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{n.title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2">{n.desc}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2 py-1 transition-colors border border-border/60",
              dropdownOpen ? "bg-muted" : "bg-muted/30 hover:bg-muted/60"
            )}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-[10px] font-bold text-white">
              {initials}
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-xs font-medium text-foreground leading-tight">{user?.name || 'Usuário'}</span>
              {user?.role && (
                <Badge variant="outline" className={cn("text-[8px] px-1 py-0 font-medium h-3 mt-0.5", roleColors[user.role])}>
                  {roleLabels[user.role] || user.role}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="px-4 py-3.5 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <Link
                  href="/configuracoes?tab=users"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" /> Meu Perfil
                </Link>
                <Link
                  href="/configuracoes"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" /> Configurações
                </Link>
              </div>
              <div className="border-t border-border/50 p-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); logout() }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Desconectar
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Cmd+K modal */}
      {cmdkOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => setCmdkOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={cmdkInputRef}
                value={cmdkQuery}
                onChange={(e) => setCmdkQuery(e.target.value)}
                placeholder="Buscar página, skill, vulnerabilidade..."
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered[0]) {
                    setCmdkOpen(false)
                    router.push(filtered[0].href)
                  }
                }}
              />
              <button onClick={() => setCmdkOpen(false)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Nada encontrado para "{cmdkQuery}"</div>
              ) : (
                filtered.slice(0, 12).map((item, i) => (
                  <button
                    key={item.href}
                    onClick={() => { setCmdkOpen(false); router.push(item.href) }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.group} · {item.href}</div>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t text-[10px] text-muted-foreground flex items-center gap-3">
              <span><kbd className="font-mono px-1 py-0.5 rounded bg-muted">↵</kbd> ir</span>
              <span><kbd className="font-mono px-1 py-0.5 rounded bg-muted">esc</kbd> fechar</span>
              <span className="ml-auto">{filtered.length} resultados</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
