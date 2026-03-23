"use client"

interface RiskGaugeProps {
  score: number
  size?: number
  label?: string
}

function getRiskColor(score: number): string {
  if (score <= 25) return '#22c55e'
  if (score <= 50) return '#eab308'
  if (score <= 75) return '#f97316'
  return '#ef4444'
}

function getRiskLabel(score: number): string {
  if (score <= 25) return 'Baixo'
  if (score <= 50) return 'Médio'
  if (score <= 75) return 'Alto'
  return 'Crítico'
}

export function RiskGauge({ score, size = 120, label }: RiskGaugeProps) {
  const color = getRiskColor(score)
  const riskLabel = label || getRiskLabel(score)

  const strokeWidth = size * 0.08
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100) / 100
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black leading-none"
          style={{ fontSize: size * 0.28, color }}
        >
          {Math.round(score)}
        </span>
        <span
          className="font-medium text-muted-foreground mt-0.5"
          style={{ fontSize: size * 0.11 }}
        >
          {riskLabel}
        </span>
      </div>
    </div>
  )
}
