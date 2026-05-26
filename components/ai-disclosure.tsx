"use client"

import { useState, useEffect } from "react"
import { Shield, ExternalLink, AlertTriangle, CheckCircle2, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/auth"

type Posture = "approved" | "local" | "external" | "unknown"

interface AIDisclosureProps {
  /** Texto curto descrevendo a finalidade da chamada IA na feature atual */
  purpose?: string
  /** Quando true, mostra apenas o badge compacto; quando false, banner completo */
  compact?: boolean
  className?: string
}

const postureMeta: Record<Posture, {
  label: string
  color: string
  icon: typeof Shield
  description: string
}> = {
  approved: {
    label: "Unisys-Approved",
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: CheckCircle2,
    description: "Provider autorizado para dados confidenciais Unisys/Caixa conforme AI P1.0.",
  },
  local: {
    label: "Local · Zero Egress",
    color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    icon: Server,
    description: "Roda 100% on-premise (Ollama). Nenhum dado sai do ambiente Unisys.",
  },
  external: {
    label: "External · Restrito",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: AlertTriangle,
    description: "Provider externo. NÃO inclua IP, PPI ou Confidential Information sem aprovação CISO.",
  },
  unknown: {
    label: "Não configurado",
    color: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    icon: AlertTriangle,
    description: "Configure um provider em Configurações → Integrações → IA.",
  },
}

export function AIDisclosure({ purpose, compact = false, className }: AIDisclosureProps) {
  const [provider, setProvider] = useState<string | null>(null)
  const [posture, setPosture] = useState<Posture>("unknown")

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`
    fetch(`${apiUrl}/api/llm/config`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.provider) return
        setProvider(data.provider)
        const postureMap: Record<string, Posture> = {
          github: "approved",
          ollama: "local",
          groq: "external",
          openai: "external",
          anthropic: "external",
          google: "external",
        }
        setPosture(postureMap[data.provider] || "unknown")
      })
      .catch(() => {})
  }, [])

  const meta = postureMeta[posture]
  const Icon = meta.icon

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded border", meta.color, className)}>
        <Icon className="h-3 w-3" />
        IA · {provider || "—"} · {meta.label}
      </span>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 mb-4 flex items-start gap-3 text-xs",
        meta.color,
        className,
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Content Created By/With Use of AI
          </span>
          <span className="text-[10px] opacity-70">·</span>
          <span className="text-[10px] font-mono opacity-90">
            provider={provider || "none"}
          </span>
          <span className="text-[10px] opacity-70">·</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider">{meta.label}</span>
        </div>
        <p className="mt-1 opacity-90 leading-relaxed">
          {purpose ? `${purpose}. ` : ""}{meta.description}{" "}
          <span className="opacity-70">
            Human oversight obrigatório (Unisys AI Acceptable Use Guidelines §Agentic AI).
          </span>
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] opacity-70">
          <a
            href="https://www.mofo.com/artificial-intelligence"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:opacity-100 underline-offset-2 hover:underline"
          >
            MoFo AI <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href="https://www.nist.gov/itl/ai-risk-management-framework"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:opacity-100 underline-offset-2 hover:underline"
          >
            NIST AI RMF <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <span>Unisys AI P1.0 · GenAI · Agentic AI</span>
        </div>
      </div>
    </div>
  )
}
