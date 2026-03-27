"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings, LogOut, User, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getUser, logout } from "@/lib/auth"

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

export function AppTopbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'VC'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b border-border/50 bg-background/80 backdrop-blur-md px-6">
      {/* Settings icon */}
      <Link
        href="/configuracoes"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          pathname.startsWith("/configuracoes")
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title="Configurações"
      >
        <Settings className="h-4.5 w-4.5" />
      </Link>

      {/* User avatar + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors",
            dropdownOpen ? "bg-muted" : "hover:bg-muted/60"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-[11px] font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-foreground leading-tight">{user?.name || 'Usuário'}</span>
            {user?.role && (
              <Badge variant="outline" className={cn("text-[9px] px-1 py-0 font-medium h-4 mt-0.5", roleColors[user.role])}>
                {roleLabels[user.role] || user.role}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            {/* User info header */}
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

            {/* Menu items */}
            <div className="p-1.5">
              <Link
                href="/configuracoes?tab=users"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Meu Perfil
              </Link>
              <Link
                href="/configuracoes"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Configurações
              </Link>
            </div>

            {/* Divider + Logout */}
            <div className="border-t border-border/50 p-1.5">
              <button
                onClick={() => { setDropdownOpen(false); logout() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Desconectar
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
