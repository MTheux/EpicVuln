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
  Package,
  GitBranch,
  BookOpen,
  Activity,
  RefreshCw,
  Network,
  ListChecks,
  Database,
  Building2,
  ScrollText,
  Sparkles,
  Bot,
  Zap,
  Layers,
  Hammer,
  Glasses,
  ClipboardCheck,
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

const navGroups: NavGroup[] = [
  {
    label: "AppSec",
    items: [
      { href: "/", label: "Dashboard ASPM", icon: LayoutDashboard },
      { href: "/repositorios", label: "Repositórios", icon: GitBranch },
      { href: "/vulnerabilidades", label: "Vulnerabilidades", icon: Shield },
      { href: "/squads", label: "Squads", icon: Users },
      { href: "/inteligencia", label: "Motor IA", icon: Sparkles, badge: "IA" },
      { href: "/relatorios", label: "Relatórios", icon: FileText },
    ],
  },
  {
    label: "Skills AISEC",
    items: [
      { href: "/pentest/zekrom", label: "Zekrom · DAST", icon: Zap, badge: "Skill" },
      { href: "/pentest/forge", label: "Forge · Modernization", icon: Hammer, badge: "Skill" },
      { href: "/threat-modeling/mirror", label: "Mirror · Threat Model", icon: Glasses, badge: "Skill" },
      { href: "/admin/audit", label: "Audit · Compliance", icon: ClipboardCheck, badge: "Skill" },
    ],
  },
  {
    label: "Threat Modeling",
    items: [
      { href: "/threat-modeling/requisitos", label: "Requisitos", icon: ListChecks },
      { href: "/pentest/arquitetura", label: "Análise de Arquitetura", icon: Network, badge: "IA" },
    ],
  },
  {
    label: "Pentest",
    items: [
      { href: "/pentest/checklist", label: "Checklist OWASP", icon: ListChecks, badge: "WSTG" },
      { href: "/pentest/jwt-inspector", label: "JWT Inspector", icon: ListChecks, badge: "Novo" },
      { href: "/pentest/epicos", label: "Gerador de Épicos", icon: ScrollText, badge: "Novo" },
      { href: "/pentest/jshunter", label: "JSHunter", icon: Bot, badge: "Novo" },
      { href: "/pentest/code-analyzer", label: "Code Analyzer", icon: FileText, badge: "SAST" },
      { href: "/pentest/unisystem", label: "Burp Zekrom", icon: Shield, badge: "Beta" },
    ],
  },
  {
    label: "Administração",
    adminOnly: true,
    items: [
      { href: "/admin/motor-ia", label: "Motor IA & Skills", icon: Sparkles, badge: "IA" },
      { href: "/admin/activity-graph", label: "Activity Graph", icon: Activity, badge: "Live" },
      { href: "/threat-modeling/base", label: "Base de Conhecimento", icon: BookOpen },
      { href: "/admin/auditoria", label: "Auditoria & Logs IA", icon: ScrollText },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [, setCompany] = useState<{ name?: string; sector?: string } | null>(null)
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
      .then((data) => {
        if (data?.name) setCompany(data)
      })
      .catch(() => {})
  }, [pathname])

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-white/[0.04]">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5">
        <UnisysLogo size={32} />
        <div className="flex items-baseline">
          <span className="text-[18px] font-extrabold tracking-tighter text-emerald-400" style={{ letterSpacing: "-0.04em" }}>AI</span>
          <span className="text-[18px] font-bold tracking-tighter text-white" style={{ letterSpacing: "-0.04em" }}>SEC</span>
          <span className="ml-2 text-[9px] uppercase tracking-[0.18em] text-emerald-300/60 font-medium">AppSec · ASPM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto pb-4">
        {navGroups
          .filter((g) => !g.adminOnly || isAdmin)
          .map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-2 mb-1.5 mt-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
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
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/10"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                          isActive
                            ? "bg-emerald-500/25 text-emerald-300"
                            : "bg-white/[0.04] text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded",
                            item.badge === "Novo"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.badge === "Beta"
                              ? "bg-amber-500/20 text-amber-300"
                              : item.badge === "Skill"
                              ? "bg-purple-500/20 text-purple-300"
                              : item.badge === "Skills"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.badge === "Hub"
                              ? "bg-violet-500/20 text-violet-300"
                              : item.badge === "WSTG"
                              ? "bg-sky-500/20 text-sky-300"
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
                      {isActive && !item.badge && (
                        <ChevronRight className="h-3 w-3 text-emerald-400/60" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </div>
          <Link
            href="/configuracoes"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
              pathname === "/configuracoes"
                ? "bg-emerald-500/20 text-emerald-300"
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
