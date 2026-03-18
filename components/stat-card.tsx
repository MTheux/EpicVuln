import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'extreme' | 'critical' | 'warning' | 'success'
  className?: string
}

const variantStyles = {
  default: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
  },
  extreme: {
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    valueColor: 'text-red-400',
  },
  critical: {
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    valueColor: 'text-orange-400',
  },
  warning: {
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    valueColor: 'text-amber-400',
  },
  success: {
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    valueColor: 'text-green-400',
  },
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = 'default',
  className 
}: StatCardProps) {
  const styles = variantStyles[variant]
  
  return (
    <Card className={cn("bg-card border-border shadow-sm transition-all hover:shadow-md group", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-black tracking-tight", styles.valueColor)}>
              {value}
            </p>
            {trend && (
              <p className={cn(
                "text-xs",
                trend.value >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn("rounded-xl p-3 transition-transform group-hover:scale-110 duration-300 shadow-inner", styles.iconBg)}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
