import { cn } from "@/lib/utils"

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
  'Crítica': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  'Alta': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800'
  },
  'Média': {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800'
  },
  'Baixa': {
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800'
  },
  'Informativa': {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800'
  },
}

const fallbackConfig = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' }

interface SeverityBadgeProps {
  severity: string
  className?: string
  showIcon?: boolean
}

export function SeverityBadge({ severity, className, showIcon = false }: SeverityBadgeProps) {
  const config = severityConfig[severity] || fallbackConfig

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
      config.bg,
      config.text,
      config.border,
      className
    )}>
      {showIcon && severity === 'Crítica' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
      {severity || 'N/A'}
    </span>
  )
}
