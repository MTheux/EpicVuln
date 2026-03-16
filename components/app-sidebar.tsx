"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Shield,
  Brain,
  Link2,
  Bell,
  FileText,
  Search,
  ShieldAlert,
  LogOut,
  Users
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
  { href: "/integracoes", label: "Integrações", icon: Link2 },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
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
  ADMIN: 'bg-red-500/20 text-red-400',
  SEGURANCA: 'bg-purple-500/20 text-purple-400',
  GESTOR: 'bg-blue-500/20 text-blue-400',
  SQUAD: 'bg-green-500/20 text-green-400',
  LEITURA: 'bg-zinc-500/20 text-zinc-400',
}

export function AppSidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <ShieldAlert className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground italic">Raio-X CredSystem</span>
          <span className="text-xs text-muted-foreground">(C-Level Insights)</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="h-9 bg-sidebar-accent pl-9 text-sm placeholder:text-muted-foreground"
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
