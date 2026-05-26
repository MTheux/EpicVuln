import { cn } from "@/lib/utils"

interface AISECLogoProps {
  className?: string
  size?: number
  variant?: "icon" | "full" | "wordmark"
  tone?: "color" | "white"
}

/**
 * AISEC logo — hexágono moderno com neural pulse e shield embutido.
 * Tipografia: AISEC sans-serif compacto, com "AI" em emerald destacado.
 * Sem letra U / Unisys branding (mas Unisys continua dona via copyright).
 */
export function AISECLogo({ className, size = 36, variant = "icon", tone = "color" }: AISECLogoProps) {
  const primary = tone === "white" ? "#FFFFFF" : "#10b981"
  const secondary = tone === "white" ? "#FFFFFF" : "#06b6d4"
  const accent = tone === "white" ? "#FFFFFF" : "#a855f7"

  if (variant === "icon") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(className)}
        aria-label="AISEC"
      >
        <defs>
          <linearGradient id="aisec-hex" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
          <linearGradient id="aisec-pulse" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={primary} stopOpacity="0.4" />
          </linearGradient>
          <filter id="aisec-glow">
            <feGaussianBlur stdDeviation="1.2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Hexagon shield */}
        <path
          d="M24 3 L42 13 V35 L24 45 L6 35 V13 Z"
          fill="url(#aisec-hex)"
          fillOpacity="0.18"
          stroke="url(#aisec-hex)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Inner neural pulse — concentric */}
        <circle cx="24" cy="24" r="9" stroke={primary} strokeWidth="1.5" fill="none" opacity="0.5" />
        <circle cx="24" cy="24" r="5.5" stroke={primary} strokeWidth="1.5" fill="none" opacity="0.8" />

        {/* Core dot (AI brain) */}
        <circle cx="24" cy="24" r="2.5" fill={primary} filter="url(#aisec-glow)" />

        {/* Diagonal nodes (connections) */}
        <circle cx="14" cy="14" r="1.5" fill={secondary} />
        <circle cx="34" cy="14" r="1.5" fill={secondary} />
        <circle cx="14" cy="34" r="1.5" fill={secondary} />
        <circle cx="34" cy="34" r="1.5" fill={secondary} />

        {/* Connection lines */}
        <line x1="14" y1="14" x2="22" y2="22" stroke={secondary} strokeWidth="0.8" opacity="0.6" />
        <line x1="34" y1="14" x2="26" y2="22" stroke={secondary} strokeWidth="0.8" opacity="0.6" />
        <line x1="14" y1="34" x2="22" y2="26" stroke={secondary} strokeWidth="0.8" opacity="0.6" />
        <line x1="34" y1="34" x2="26" y2="26" stroke={secondary} strokeWidth="0.8" opacity="0.6" />
      </svg>
    )
  }

  if (variant === "wordmark") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <AISECLogo size={size} tone={tone} />
        <div className="flex items-baseline">
          <span
            className="font-extrabold tracking-tight"
            style={{ fontSize: size * 0.7, color: primary, letterSpacing: "-0.04em" }}
          >
            AI
          </span>
          <span
            className="font-bold tracking-tight"
            style={{ fontSize: size * 0.7, color: tone === "white" ? "#FFFFFF" : "#FFFFFF", letterSpacing: "-0.04em" }}
          >
            SEC
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AISECLogo size={size} tone={tone} />
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight text-foreground">AISEC</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          AppSec · ASPM
        </span>
      </div>
    </div>
  )
}

// Backward-compat: re-export como UnisysLogo pra não quebrar imports antigos
export const UnisysLogo = AISECLogo
