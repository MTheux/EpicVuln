"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Shield,
  Brain,
  AlertTriangle,
  FileText,
  Users,
  ChevronRight,
  Kanban,
  Settings,
  Building2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/auth"

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vulnerabilidades", label: "Vulnerabilidades", icon: Shield },
  { href: "/kanban", label: "Kanban", icon: Kanban },
  { href: "/squads", label: "Squad Scorecard", icon: Users },
  { href: "/inteligencia", label: "Inteligência", icon: Brain },
  { href: "/notificacoes", label: "Alertas", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [company, setCompany] = useState<{ name?: string; sector?: string } | null>(null)

  useEffect(() => {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
      if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
      return 'http://localhost:9001'
    }
    fetch(`${getApiUrl()}/api/settings/company-profile`, {
      headers: authHeaders(),
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.name) setCompany(data) })
      .catch(() => {})
  }, [pathname])

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold tracking-tight text-white">EpicVuln</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Vulnerability Management</span>
        </div>
      </div>

      {/* Section Label */}
      <div className="px-5 mb-2 mt-4">
        <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold">Menu</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-emerald-400/60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
          <Link
            href="/configuracoes"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
              pathname === "/configuracoes"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-500 hover:bg-white/10 hover:text-slate-300"
            )}
            title="Configurações"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
