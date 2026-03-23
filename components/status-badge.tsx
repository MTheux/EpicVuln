import { cn } from "@/lib/utils"

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Nova': { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Aberta': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-600' },
  'Em Backlog': { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-600' },
  'Em Correção': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-600' },
  'Em Reteste': { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-600' },
  'Mitigada': { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-600' },
  'Concluída': { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-600' },
  'Risco Aceito': { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-muted-foreground' },
  'Fechada': { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-400', dot: 'bg-gray-600' },
}

const fallbackConfig = { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' }

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || fallbackConfig

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      config.bg,
      config.text,
      className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {status || 'N/A'}
    </span>
  )
}
