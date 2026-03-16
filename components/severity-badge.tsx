import { cn } from "@/lib/utils"
import type { Criticidade } from "@/lib/types"

const severityConfig: Record<Criticidade, { bg: string; text: string; border: string }> = {
  'Extrema': { 
    bg: 'bg-red-500/20', 
    text: 'text-red-400', 
    border: 'border-red-500/50 animate-pulse' 
  },
  'Crítica': { 
    bg: 'bg-orange-500/20', 
    text: 'text-orange-400', 
    border: 'border-orange-500/40' 
  },
  'Alta': { 
    bg: 'bg-amber-500/20', 
    text: 'text-amber-400', 
    border: 'border-amber-500/40' 
  },
  'Média': { 
    bg: 'bg-yellow-500/20', 
    text: 'text-yellow-400', 
    border: 'border-yellow-500/40' 
  },
  'Baixa': { 
    bg: 'bg-green-500/20', 
    text: 'text-green-400', 
    border: 'border-green-500/40' 
  },
  'Informativa': { 
    bg: 'bg-blue-500/20', 
    text: 'text-blue-400', 
    border: 'border-blue-500/40' 
  },
}

interface SeverityBadgeProps {
  severity: Criticidade
  className?: string
  showIcon?: boolean
}

export function SeverityBadge({ severity, className, showIcon = false }: SeverityBadgeProps) {
  const config = severityConfig[severity]
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
      config.bg,
      config.text,
      config.border,
      className
    )}>
      {showIcon && severity === 'Extrema' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
      {severity}
    </span>
  )
}
