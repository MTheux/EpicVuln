import { cn } from "@/lib/utils"
import type { Status } from "@/lib/types"

const statusConfig: Record<Status, { bg: string; text: string; dot: string }> = {
  'Nova': { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Aberta': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-600' },
  'Em Backlog': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-600' },
  'Em Correção': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-600' },
  'Em Reteste': { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-600' },
  'Mitigada': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-600' },
  'Concluída': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-600' },
  'Risco Aceito': { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-muted-foreground' },
  'Fechada': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-600' },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      config.bg,
      config.text,
      className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {status}
    </span>
  )
}
