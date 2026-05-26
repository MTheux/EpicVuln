import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  description?: string
  badge?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4 fade-in-up", className)}>
      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400/10 to-transparent blur-md" />
          <Icon className="h-6 w-6 relative" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight gradient-text-emerald">{title}</h1>
            {badge && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-emerald-400/80 font-medium">{subtitle}</p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
