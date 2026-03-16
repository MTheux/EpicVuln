import { cn } from "@/lib/utils"
import type { Status } from "@/lib/types"

const statusConfig: Record<Status, { bg: string; text: string; dot: string }> = {
  'Nova': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  'Aberta': { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  'Em Backlog': { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  'Em Correção': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  'Em Reteste': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  'Mitigada': { bg: 'bg-teal-500/10', text: 'text-teal-400', dot: 'bg-teal-400' },
  'Concluída': { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  'Risco Aceito': { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
  'Fechada': { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
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
