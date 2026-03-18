import { cn } from "@/lib/utils"
import type { Criticidade } from "@/lib/types"

const severityConfig: Record<Criticidade, { bg: string; text: string; border: string }> = {
  'Extrema': { 
    bg: 'bg-red-50', 
    text: 'text-red-700', 
    border: 'border-red-200 animate-pulse' 
  },
  'Crítica': { 
    bg: 'bg-orange-50', 
    text: 'text-orange-700', 
    border: 'border-orange-200' 
  },
  'Alta': { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    border: 'border-amber-200' 
  },
  'Média': { 
    bg: 'bg-yellow-50', 
    text: 'text-yellow-700', 
    border: 'border-yellow-200' 
  },
  'Baixa': { 
    bg: 'bg-green-50', 
    text: 'text-green-700', 
    border: 'border-green-200' 
  },
  'Informativa': { 
    bg: 'bg-blue-50', 
    text: 'text-blue-700', 
    border: 'border-blue-200' 
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
