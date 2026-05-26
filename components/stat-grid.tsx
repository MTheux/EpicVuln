import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Stat {
  label: string
  value: string | number
  trend?: string
  icon: LucideIcon
  tone?: "default" | "success" | "warning" | "danger" | "info"
}

const toneMap = {
  default: "text-foreground border-border",
  success: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
  warning: "text-amber-500 border-amber-500/30 bg-amber-500/5",
  danger: "text-red-500 border-red-500/30 bg-red-500/5",
  info: "text-sky-500 border-sky-500/30 bg-sky-500/5",
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "rounded-xl border bg-card p-5 transition-all hover:shadow-md",
            toneMap[s.tone || "default"]
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {s.label}
            </span>
            <s.icon className="h-4 w-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{s.value}</div>
          {s.trend && (
            <div className="text-[11px] text-muted-foreground mt-1">{s.trend}</div>
          )}
        </div>
      ))}
    </div>
  )
}
