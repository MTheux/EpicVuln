"use client"

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
  ShieldAlert
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vulnerabilidades", label: "Vulnerabilidades", icon: Shield },
  { href: "/inteligencia", label: "Inteligência", icon: Brain },
  { href: "/integracoes", label: "Integrações", icon: Link2 },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
]

export function AppSidebar() {
  const pathname = usePathname()

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

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            CS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">Credsystem</span>
            <span className="text-xs text-muted-foreground">Security Team</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
