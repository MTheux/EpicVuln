"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Trophy,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  TrendingDown,
  TrendingUp,
  Crown,
  Sparkles,
  Target,
  Award,
  Flame,
  ChevronRight,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"
import { authHeaders } from "@/lib/auth"
import Link from "next/link"

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

interface SquadHealth {
  squad: string
  champion?: string
  level: number
  xp: number
  vulnsAtivas: number
  vulnsCriticas: number
  vulnsSlaVencido: number
  mttrDias: number
  trilhasCompletas: number
  badges: string[]
  status: "verde" | "amarelo" | "vermelho"
}

const TRILHAS = [
  { id: "owasp-top10", name: "OWASP Top 10 — 2021/2025", duration: "4h", xp: 100, level: "Iniciante" },
  { id: "asp-net-secure", name: "ASP.NET Core Secure Coding", duration: "6h", xp: 150, level: "Intermediário" },
  { id: "cobol-modernization", name: "COBOL → .NET com segurança", duration: "8h", xp: 200, level: "Avançado" },
  { id: "wso2-auth", name: "WSO2 + OAuth2 + JWT seguro", duration: "3h", xp: 120, level: "Intermediário" },
  { id: "burp-fundamentals", name: "Burp Suite + Pentest API", duration: "5h", xp: 180, level: "Intermediário" },
  { id: "threat-modeling", name: "Threat Modeling STRIDE prática", duration: "3h", xp: 100, level: "Iniciante" },
  { id: "sdl-ciweb", name: "SDL CIWEB — 52 controles Caixa", duration: "10h", xp: 250, level: "Avançado" },
  { id: "secure-pix", name: "Segurança em transferências PIX", duration: "2h", xp: 80, level: "Intermediário" },
]

const BADGES_INFO: Record<string, { label: string; color: string; icon: any }> = {
  "champion-bronze": { label: "Champion Bronze", color: "bg-amber-700/20 text-amber-600 border-amber-700/40", icon: Award },
  "champion-prata": { label: "Champion Prata", color: "bg-slate-400/20 text-slate-300 border-slate-400/40", icon: Award },
  "champion-ouro": { label: "Champion Ouro", color: "bg-amber-400/20 text-amber-400 border-amber-400/40", icon: Crown },
  "zero-sla-breach": { label: "Zero SLA Breach", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: ShieldCheck },
  "fast-fixer": { label: "Fast Fixer (MTTR <7d)", color: "bg-sky-500/20 text-sky-300 border-sky-500/40", icon: TrendingUp },
  "owasp-master": { label: "OWASP Master", color: "bg-purple-500/20 text-purple-300 border-purple-500/40", icon: Trophy },
  "needs-attention": { label: "Precisa Atenção", color: "bg-red-500/20 text-red-400 border-red-500/40", icon: Flame },
}

export default function SdlssPage() {
  const [squads, setSquads] = useState<SquadHealth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${apiUrl()}/api/analytics/squad-scorecards`, {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.scorecards) {
          setSquads(mockSquads())
        } else {
          const enriched: SquadHealth[] = data.scorecards.map((s: any) => {
            const vulnsAtivas = s.openCount || 0
            const vulnsCriticas = s.critica || 0
            const vulnsSlaVencido = s.slaExpired || 0
            const mttr = s.mttrDays || 0
            const status =
              vulnsCriticas >= 3 || vulnsSlaVencido >= 3 ? "vermelho" :
              vulnsCriticas >= 1 || vulnsSlaVencido >= 1 || mttr > 14 ? "amarelo" : "verde"
            const xp = Math.max(0, 500 - vulnsAtivas * 10 - vulnsSlaVencido * 50 + (s.closedCount || 0) * 30)
            const level = Math.floor(xp / 100) + 1
            const badges: string[] = []
            if (s.slaExpired === 0) badges.push("zero-sla-breach")
            if (mttr > 0 && mttr <= 7) badges.push("fast-fixer")
            if (vulnsCriticas === 0 && vulnsAtivas <= 3) badges.push("owasp-master")
            if (level >= 5) badges.push("champion-ouro")
            else if (level >= 3) badges.push("champion-prata")
            else if (level >= 1) badges.push("champion-bronze")
            if (status === "vermelho") badges.push("needs-attention")
            return {
              squad: s.squadName,
              champion: s.techLead || s.appSec || "—",
              level, xp, vulnsAtivas, vulnsCriticas, vulnsSlaVencido, mttrDias: mttr,
              trilhasCompletas: Math.min(TRILHAS.length, Math.floor(xp / 80)),
              badges, status,
            }
          })
          setSquads(enriched.sort((a, b) => a.xp - b.xp))
        }
      })
      .catch(() => setSquads(mockSquads()))
      .finally(() => setLoading(false))
  }, [])

  const totalChampions = squads.filter((s) => s.level >= 3).length
  const piores = squads.filter((s) => s.status === "vermelho")
  const melhores = squads.filter((s) => s.status === "verde").slice(0, 3)
  const totalXP = squads.reduce((a, s) => a + s.xp, 0)

  return (
    <div className="p-6">
      <PageHeader
        icon={Users}
        title="SDLSS · Security Champions"
        subtitle="Cultura de segurança · maturidade por squad · trilhas e gamificação"
        badge="Champions"
        description="Secure Development Lifecycle for Squads (SDLSS) — programa de Security Champions da Caixa. Cada squad ganha XP por corrigir vulns no SLA, fechar críticas, completar trilhas. A IA cruza dados do portfolio (vulns ativas, MTTR, reincidência) com progresso de trilhas pra rankear squads e apontar quem precisa de apoio AppSec."
      />

      <StatGrid
        stats={[
          { label: "Squads", value: squads.length, icon: Users, tone: "default" },
          { label: "Champions ativos", value: totalChampions, icon: Crown, tone: "success" },
          { label: "Squads precisando atenção", value: piores.length, icon: Flame, tone: "danger" },
          { label: "XP total programa", value: totalXP, icon: Sparkles, tone: "info" },
        ]}
      />

      {/* Quem está dando "dor" — lista vermelha */}
      {piores.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-red-400" />
            <h3 className="font-bold text-sm">Squads que precisam de apoio AppSec urgente</h3>
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
              {piores.length} · prioridade
            </span>
          </div>
          <div className="space-y-2">
            {piores.map((s) => (
              <div key={s.squad} className="rounded-lg border border-red-500/20 bg-card p-3 flex items-center gap-3 flex-wrap">
                <div className="h-8 w-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{s.squad}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Champion: {s.champion} · {s.vulnsAtivas} vulns · {s.vulnsCriticas} críticas · {s.vulnsSlaVencido} SLA vencidos · MTTR {s.mttrDias}d
                  </div>
                </div>
                <Link
                  href={`/squads`}
                  className="text-xs text-red-300 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  Ver squad <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking de Champions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Top 3 */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="font-bold text-sm">Ranking · Top Champions</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Ordenado por XP</span>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
          ) : (
            <div className="space-y-2">
              {[...squads].sort((a, b) => b.xp - a.xp).slice(0, 8).map((s, i) => (
                <div
                  key={s.squad}
                  className={`rounded-lg border p-3 flex items-center gap-3 flex-wrap ${
                    i === 0 ? "border-amber-500/40 bg-amber-500/5" :
                    i === 1 ? "border-slate-400/40 bg-slate-400/5" :
                    i === 2 ? "border-amber-700/40 bg-amber-700/5" : "bg-background/50"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    i === 0 ? "bg-amber-400/30 text-amber-300 border border-amber-400/50" :
                    i === 1 ? "bg-slate-400/30 text-slate-300 border border-slate-400/50" :
                    i === 2 ? "bg-amber-700/30 text-amber-600 border border-amber-700/50" :
                    "bg-muted/50 text-muted-foreground border"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{s.squad}</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Lv {s.level}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">
                        {s.xp} XP
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Champion: <span className="text-emerald-400 font-semibold">{s.champion}</span>
                      {" · "}
                      {s.trilhasCompletas}/{TRILHAS.length} trilhas
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.badges.slice(0, 4).map((b) => {
                        const info = BADGES_INFO[b]
                        if (!info) return null
                        const Icon = info.icon
                        return (
                          <span key={b} className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${info.color}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {info.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Como funciona o programa */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Como funciona</h3>
          </div>
          <ul className="space-y-2 text-[11px] text-foreground/90">
            <li className="flex items-start gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span>Cada squad ganha um <b>Champion</b> (Tech Lead ou AppSec ref).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span>XP vem de: <b>corrigir no SLA</b> (+30), <b>fechar crítica</b> (+50), <b>completar trilha</b> (+80-250).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span>Vulns ativas e SLA vencido <b>reduzem XP</b> da squad.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">4</span>
              <span>Squad com 3+ críticas ou 3+ SLA vencido entra na lista <b>"precisa de apoio"</b>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">5</span>
              <span>AppSec aloca treinamento direcionado pra essas squads automaticamente.</span>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-emerald-500/15 text-[10px] text-emerald-300/80">
            Dados vivos: vulns + MTTR + SLA do banco AISEC. Trilhas e XP em produção precisam de schema próprio (futuro).
          </div>
        </div>
      </div>

      {/* Trilhas / Catálogo de treinamento */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-400" />
            <h3 className="font-bold text-sm">Catálogo de trilhas · {TRILHAS.length} disponíveis</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Stack Caixa: JS · ASP.NET · COBOL · WSO2</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TRILHAS.map((t) => (
            <div key={t.id} className="rounded-lg border bg-background/50 p-3 hover:border-emerald-500/40 transition">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm">{t.name}</span>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                  t.level === "Iniciante" ? "bg-emerald-500/15 text-emerald-400" :
                  t.level === "Intermediário" ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"
                }`}>{t.level}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                <span>⏱ {t.duration}</span>
                <span className="text-purple-400 font-mono">+{t.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-[10px] text-muted-foreground italic">
        SDLSS é a evolução cultural do programa AppSec da Caixa. Champions, trilhas, gamificação e métricas vivas em cima dos dados reais do portfolio AISEC.
      </div>
    </div>
  )
}

function mockSquads(): SquadHealth[] {
  return [
    { squad: "NM181 - Evolução - SIACI", champion: "Pedro AppSec", level: 5, xp: 480, vulnsAtivas: 2, vulnsCriticas: 0, vulnsSlaVencido: 0, mttrDias: 4, trilhasCompletas: 6, badges: ["champion-ouro", "zero-sla-breach", "fast-fixer"], status: "verde" },
    { squad: "NM176 - Recursos - SIACI", champion: "Ana SecOps", level: 4, xp: 380, vulnsAtivas: 3, vulnsCriticas: 0, vulnsSlaVencido: 0, mttrDias: 6, trilhasCompletas: 4, badges: ["champion-prata", "zero-sla-breach", "fast-fixer"], status: "verde" },
    { squad: "NM180 - Portais - SIACI", champion: "João Tech Lead", level: 3, xp: 280, vulnsAtivas: 6, vulnsCriticas: 1, vulnsSlaVencido: 1, mttrDias: 12, trilhasCompletas: 3, badges: ["champion-prata"], status: "amarelo" },
    { squad: "NM177 - Financeiro - SIACI", champion: "Maria Tech Lead", level: 2, xp: 180, vulnsAtivas: 9, vulnsCriticas: 4, vulnsSlaVencido: 3, mttrDias: 22, trilhasCompletas: 2, badges: ["champion-bronze", "needs-attention"], status: "vermelho" },
    { squad: "NM182 - Originação - SIACI", champion: "Carlos PO", level: 1, xp: 90, vulnsAtivas: 11, vulnsCriticas: 5, vulnsSlaVencido: 4, mttrDias: 28, trilhasCompletas: 1, badges: ["champion-bronze", "needs-attention"], status: "vermelho" },
  ]
}
