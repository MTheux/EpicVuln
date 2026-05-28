"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Shield,
  FileText,
  Users,
  ChevronRight,
  Settings,
  Activity,
  Network,
  ListChecks,
  ScrollText,
  Sparkles,
  Zap,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { authHeaders, getUser } from "@/lib/auth"
import { UnisysLogo } from "@/components/unisys-logo"

type NavItem = {
  href: string
  label: string
  icon: any
  badge?: string
  adminOnly?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
  adminOnly?: boolean
}

export const navGroups: NavGroup[] = [
  {
    label: "AppSec",
    items: [
      { href: "/", label: "Dashboard ASPM", icon: LayoutDashboard },
      { href: "/vulnerabilidades", label: "Vulnerabilidades", icon: Shield },
      { href: "/squads", label: "Squads", icon: Users },
      { href: "/inteligencia", label: "Motor IA", icon: Sparkles, badge: "IA" },
      { href: "/pentest/epicos", label: "Gerador de Épicos", icon: ScrollText, badge: "IA" },
    ],
  },
  {
    label: "Threat Modeling",
    items: [
      { href: "/threat-modeling/sdlss", label: "SDLSS · Champions", icon: Users, badge: "Novo" },
      { href: "/pentest/arquitetura", label: "Análise de Arquitetura", icon: Network, badge: "IA" },
    ],
  },
  {
    label: "Pentest",
    items: [
      { href: "/pentest/jwt-inspector", label: "JWT Inspector", icon: ListChecks, badge: "Novo" },
      { href: "/pentest/wso2", label: "WSO2 Hub", icon: Globe, badge: "Novo" },
      { href: "/pentest/unisystem", label: "Burp Zekrom", icon: Shield, badge: "Beta" },
    ],
  },
  {
    label: "Skills AISEC",
    items: [
      { href: "/pentest/zekrom", label: "Zekrom · DAST", icon: Zap, badge: "Skill" },
    ],
  },
  {
    label: "Administração",
    adminOnly: true,
    items: [
      { href: "/admin/motor-ia", label: "Motor IA & Skills", icon: Sparkles, badge: "IA" },
      { href: "/admin/activity-graph", label: "Activity Graph", icon: Activity, badge: "Live" },
      { href: "/admin/auditoria", label: "Auditoria & Logs IA", icon: ScrollText },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/relatorios", label: "Relatórios & Compliance", icon: FileText },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const u = getUser()
    setIsAdmin(u?.role === "ADMIN")
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
      if (typeof window !== "undefined") return `http://${window.location.hostname}:9001`
      return "http://localhost:9001"
    }
    fetch(`${getApiUrl()}/api/settings/company-profile`, {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => {})
  }, [pathname])

  return (
    <aside
      className="group/sidebar fixed left-0 top-0 z-40 flex h-screen w-14 hover:w-64 flex-col bg-gradient-to-b from-gray-950 via-gray-950 to-black border-r border-white/[0.04] transition-[width] duration-300 ease-out overflow-hidden"
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-3 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center flex-shrink-0">
          <UnisysLogo size={28} />
        </div>
        <div className="flex items-baseline opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <span className="text-[18px] font-extrabold tracking-tighter text-emerald-400" style={{ letterSpacing: "-0.04em" }}>AI</span>
          <span className="text-[18px] font-bold tracking-tighter text-white" style={{ letterSpacing: "-0.04em" }}>SEC</span>
          <span className="ml-2 text-[9px] uppercase tracking-[0.18em] text-emerald-300/60 font-medium">AppSec · ASPM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden pb-4 scrollbar-thin">
        {navGroups
          .filter((g) => !g.adminOnly || isAdmin)
          .map((group) => (
            <div key={group.label} className="mb-2">
              <div className="px-2 mb-1.5 mt-3 h-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold whitespace-nowrap">
                  {group.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "group/item relative flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/10"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md transition-colors flex-shrink-0",
                          isActive
                            ? "bg-emerald-500/25 text-emerald-300"
                            : "bg-white/[0.04] text-slate-500 group-hover/item:bg-white/10 group-hover/item:text-slate-300"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 truncate opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200",
                            item.badge === "Novo"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.badge === "Beta"
                              ? "bg-amber-500/20 text-amber-300"
                              : item.badge === "Skill"
                              ? "bg-purple-500/20 text-purple-300"
                              : item.badge === "Live"
                              ? "bg-rose-500/20 text-rose-300"
                              : item.badge === "SAST"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-sky-500/20 text-sky-300"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-emerald-400" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/[0.06] flex-shrink-0">
        <Link
          href="/configuracoes"
          className={cn(
            "group/item flex items-center gap-3 rounded-lg px-2 py-2 transition-all duration-200",
            pathname === "/configuracoes"
              ? "bg-emerald-500/15 text-emerald-300"
              : "text-slate-500 hover:bg-white/5 hover:text-white"
          )}
          title="Configurações"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] flex-shrink-0">
            <Settings className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            Configurações
          </span>
        </Link>
        <div className="flex items-center gap-2 px-2 mt-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-500">Online</span>
        </div>
      </div>
    </aside>
  )
}
