"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Shield,
  Brain,
  Link2,
  Bell,
  AlertTriangle,
  FileText,
  Search,
  ShieldAlert,
  LogOut,
  Users,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getUser, logout } from "@/lib/auth"

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vulnerabilidades", label: "Vulnerabilidades", icon: Shield },
  { href: "/squads", label: "Squad Scorecard", icon: Users },
  { href: "/inteligencia", label: "Inteligência", icon: Brain },
  { href: "/notificacoes", label: "Alertas", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
]

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  SEGURANCA: 'AppSec',
  GESTOR: 'Gestor',
  SQUAD: 'Squad',
  LEITURA: 'Leitura',
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  SEGURANCA: 'bg-purple-100 text-purple-700',
  GESTOR: 'bg-blue-100 text-blue-700',
  SQUAD: 'bg-green-100 text-green-700',
  LEITURA: 'bg-slate-100 text-slate-700',
}

export function AppSidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden border border-border p-1 bg-card">
          <Image 
            src="/logo-credsystem.png" 
            alt="CredSystem Logo" 
            width={40} 
            height={40}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-foreground">VulnControl</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dashboard</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="h-9 bg-muted border-border pl-9 text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-sidebar-primary")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CS'}
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">{user?.name || 'Credsystem'}</span>
            <div className="flex items-center gap-1.5">
              {user?.role && (
                <Badge className={cn("text-[10px] px-1.5 py-0", roleColors[user.role] || 'bg-zinc-500/20 text-zinc-400')}>
                  {roleLabels[user.role] || user.role}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/configuracoes"
              className={cn(
                "rounded-lg p-1.5 text-muted-foreground transition-colors",
                pathname.startsWith("/configuracoes") 
                  ? "bg-sidebar-accent text-sidebar-primary" 
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
