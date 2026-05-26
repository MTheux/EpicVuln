"use client"

import { useEffect, useState } from "react"
import {
  Sparkles,
  Settings2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Server,
  Globe,
  Lock,
  Zap,
  Hammer,
  Glasses,
  ClipboardCheck,
  ArrowRight,
  Plug,
  Layers,
  ShieldAlert,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { authHeaders } from "@/lib/auth"

type Posture = "approved" | "local" | "external" | "demo"

const providerCatalog: Array<{
  id: string
  name: string
  posture: Posture
  description: string
  models: string[]
  envKey?: string
}> = [
  {
    id: "github",
    name: "GitHub Copilot / Models",
    posture: "approved",
    description: "Provider preferencial — mesma infra do GitHub Copilot, aprovado pela política Unisys AI P1.0 pra dados confidenciais.",
    models: ["gpt-4o", "gpt-4o-mini", "Phi-3.5-mini-instruct", "Phi-3.5-MoE-instruct", "Llama-3.3-70B-Instruct", "Mistral-large-2407"],
    envKey: "GitHub PAT (scope models:read)",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    posture: "local",
    description: "Modelos rodam 100% on-premise. Zero data egress. Recomendado para dados sensíveis sem dependência externa.",
    models: ["llama3.2-vision", "llava", "llama3", "mistral", "codellama", "phi3"],
    envKey: "URL local: http://host.docker.internal:11434",
  },
  {
    id: "demo",
    name: "Demo (Mocks)",
    posture: "demo",
    description: "Respostas determinísticas pré-fabricadas. Útil pra apresentação, smoke tests e desenvolvimento offline. Não consome rede.",
    models: ["unisysguard-demo"],
  },
  {
    id: "openai",
    name: "OpenAI",
    posture: "external",
    description: "GPT-4o, GPT-4 Turbo, GPT-3.5. Provider externo — não submeter Confidential Info sem aprovação CISO.",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    envKey: "OPENAI_API_KEY",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    posture: "external",
    description: "Claude Sonnet, Haiku, Opus. Provider externo com restrição.",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "google",
    name: "Google Gemini",
    posture: "external",
    description: "Gemini 2.0 Flash + Pro. Multimodal. Externo com restrição.",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    envKey: "GOOGLE_API_KEY",
  },
  {
    id: "groq",
    name: "Groq",
    posture: "external",
    description: "LPU Inference — latência ultra-baixa. Tier gratuito disponível.",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    envKey: "GROQ_API_KEY",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    posture: "external",
    description: "Provider chinês — CISO opt-in obrigatório por estar fora de jurisdição Unisys-approved.",
    models: ["deepseek-chat", "deepseek-reasoner"],
    envKey: "DEEPSEEK_API_KEY",
  },
]

const postureMeta: Record<Posture, { label: string; cls: string; icon: any }> = {
  approved: { label: "Unisys-Approved", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  local: { label: "Local · Zero Egress", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30", icon: Server },
  demo: { label: "Demo Mode", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30", icon: Sparkles },
  external: { label: "External · Restrito", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: AlertCircle },
}

interface Skill {
  name: string
  icon: any
  tagline: string
  status: "shipped" | "next" | "planned"
  description: string
  triggers: string[]
  uses: string
  href: string
}

const skills: Skill[] = [
  {
    name: "Zekrom",
    icon: Zap,
    tagline: "DAST Copilot Orchestrator",
    status: "shipped",
    description: "Recebe OpenAPI/Swagger (incluindo do WSO2) ou HTML de site web. Extrai endpoints, parâmetros e auth. Gera checklist OWASP API Top 10 + Web Top 10 mapeado por endpoint, payloads exemplo (cURL) e prompt pack pronto pra colar no GitHub Copilot.",
    triggers: [
      "Pentester precisa validar mudança DAST (Web ou API)",
      "Dev publicou nova versão de API no WSO2",
      "Antes de subir release pra produção",
    ],
    uses: "Multi-AI · escopo pode ser API, Web ou ambos · não executa requests (human oversight)",
    href: "/pentest/zekrom",
  },
  {
    name: "Forge",
    icon: Hammer,
    tagline: "Code Modernization Assistant",
    status: "shipped",
    description: "Recebe código legado (COBOL, ASP.NET Framework, VB.NET, WebForms, Classic ASP) e gera versão equivalente em ASP.NET Core 8 com testes xUnit. Inclui diff de segurança e mapeamento dos pontos refatorados (SDL CIWEB). Eco direto do framework Unisys já entregue à NI (90+ apps modernizadas).",
    triggers: [
      "Decisão de modernizar app legada",
      "Migrar COBOL batch pra serviço .NET",
      "Refatorar handler ASP.NET 4.x pra Core",
    ],
    uses: "Multi-AI (preferencial: GitHub Models gpt-4o) · gera código + diff + testes · human review obrigatório antes do merge",
    href: "/pentest/forge",
  },
  {
    name: "Mirror",
    icon: Glasses,
    tagline: "Threat Modeling com RAG",
    status: "shipped",
    description: "Aplica STRIDE/PASTA/LINDDUN em diagramas de arquitetura usando a Base de Conhecimento (docs Caixa, regulatórios BACEN/LGPD, padrões OWASP) como contexto via RAG real (pgvector). Gera ameaças por componente, attack tree, mitigações priorizadas e conformidade regulatória.",
    triggers: [
      "Novo produto em design/arquitetura",
      "Mudança significativa em arquitetura existente",
      "Revisão anual de threat model",
    ],
    uses: "Multi-AI · usa Base de Conhecimento via RAG · output rotulado IA",
    href: "/threat-modeling/mirror",
  },
  {
    name: "Audit",
    icon: ClipboardCheck,
    tagline: "Compliance & LGPD/BACEN",
    status: "shipped",
    description: "Audita aderência aos 52 controles SDL CIWEB Caixa + LGPD + BACEN Res. 4658 + PCI-DSS + OWASP ASVS. Cruza findings ativos com controles esperados, aponta gaps com evidências, gera plano de remediação priorizado.",
    triggers: [
      "Auditoria trimestral interna",
      "Pré-auditoria externa",
      "Resposta a questionário regulatório",
    ],
    uses: "Multi-AI · usa requisitos SDL + findings + assets · output auditável",
    href: "/admin/audit",
  },
]

const statusBadge: Record<string, { label: string; cls: string }> = {
  shipped: { label: "Entregue", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  next: { label: "Próxima", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  planned: { label: "Roadmap", cls: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

export default function AdminMotorIaPage() {
  const [active, setActive] = useState<{ provider: string; model: string; hasApiKey: boolean } | null>(null)

  useEffect(() => {
    fetch(`${apiUrl()}/api/llm/config`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setActive)
      .catch(() => {})
  }, [])

  const activePosture = active ? (providerCatalog.find((p) => p.id === active.provider)?.posture || "external") : "demo"
  const activeMeta = postureMeta[activePosture]

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="Motor IA & Skills"
        subtitle="Administração do Multi-AI do AISEC"
        description="Visão operacional dos providers IA configurados e do que cada skill agêntica faz. Toda chamada IA carrega o contexto core AISEC (Caixa, SIACI, OWASP, ASVS, BACEN/LGPD, Unisys AI P1.0)."
        actions={
          <Link href="/configuracoes" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
            <Settings2 className="h-4 w-4" /> Configurar Provider
          </Link>
        }
      />

      {/* Framework link + Política Unisys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Link
          href="/framework"
          className="lg:col-span-1 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-purple-500/10 p-5 hover:shadow-lg transition group"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Layers className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-bold mb-0.5">Visão estratégica</div>
              <h3 className="font-bold">AISEC Framework</h3>
            </div>
          </div>
          <p className="text-xs text-foreground/80 mb-3 leading-relaxed">
            Paralelo com o framework Unisys já entregue à NI (Avasant award), princípios (RAG, providers governados, IDE plugin) e arquitetura completa.
          </p>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition">
            Abrir página estratégica <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <div className="lg:col-span-2 rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-red-500/5 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-amber-300/70 font-bold mb-0.5">Política Unisys AI P1.0 · Agentic AI</div>
              <h3 className="font-bold">Zekrom DAST — o que a política Unisys permite</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Análise baseada em <a href="https://www.unisys.com/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">AI Acceptable Use Guidelines <ExternalLink className="h-2.5 w-2.5" /></a> + Software Development AI Acceptable Use Guidelines (sessão Agentic AI).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            {/* Permitido */}
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-2 text-xs">
                <CheckCircle2 className="h-4 w-4" /> Permitido
              </div>
              <p className="opacity-90 mb-2">Zekrom <b>como está hoje</b> (assistivo) — 100% dentro da política:</p>
              <ul className="space-y-1 opacity-80">
                <li>· Gera payloads + cURL, <b>não executa</b></li>
                <li>· Pentester roda manualmente</li>
                <li>· Human oversight em cada output</li>
                <li>· Logs persistidos (/admin/logs-ia)</li>
                <li>· Token só em sessão, não persistido</li>
                <li>· Rótulo "Content Created By/With Use of AI"</li>
              </ul>
            </div>

            {/* Condicional */}
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-2 text-xs">
                <AlertCircle className="h-4 w-4" /> Condicional
              </div>
              <p className="opacity-90 mb-2">Pentest <b>semi-automatizado</b> (Zekrom executando) — possível com:</p>
              <ul className="space-y-1 opacity-80">
                <li>· Autorização formal do dono do sistema</li>
                <li>· Escopo documentado por escrito</li>
                <li>· Ambiente HML/QA (nunca prod sem CISO+Legal)</li>
                <li>· Allowlist de hosts alvo</li>
                <li>· Bloqueio de payloads destrutivos</li>
                <li>· Rate-limit + audit trail imutável</li>
                <li>· Pré-aprovação CISO da skill</li>
              </ul>
            </div>

            {/* Proibido */}
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <div className="flex items-center gap-1.5 text-red-400 font-bold mb-2 text-xs">
                <XCircle className="h-4 w-4" /> Proibido
              </div>
              <p className="opacity-90 mb-2">Conforme política, <b>nunca</b>:</p>
              <ul className="space-y-1 opacity-80">
                <li>· Ataque ativo sem autorização formal</li>
                <li>· Exploits destrutivos (DROP, rm -rf, DoS)</li>
                <li>· Decisões binding/oficiais sem humano</li>
                <li>· Tool não aprovada pelo CISO</li>
                <li>· Compartilhar IP/PPI/Confidential com provider externo não-approved</li>
                <li>· Bypass de controles do tenant</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-500/20 text-[11px] text-amber-200/80 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <b>Status atual do Zekrom:</b> modo <b>assistivo</b> (Permitido — coluna verde). Roadmap pra modo semi-automatizado depende de aprovação CISO + implementação de gates (allowlist, payload blocklist, rate-limit, kill switch).
              Para discutir mudança de modo, abra ticket pra <span className="font-mono">Information Security – Acceptable Use</span> + <span className="font-mono">Software Application Assessment Request</span>.
            </div>
          </div>
        </div>
      </div>

      {/* Active Provider Card */}
      {active && (
        <div className={`rounded-xl border-2 p-5 mb-6 ${
          activePosture === "approved" ? "border-emerald-500/40 bg-emerald-500/5" :
          activePosture === "local" ? "border-sky-500/40 bg-sky-500/5" :
          activePosture === "demo" ? "border-violet-500/40 bg-violet-500/5" :
          "border-amber-500/40 bg-amber-500/5"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${activeMeta.cls}`}>
                <activeMeta.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Provider ativo agora</div>
                <h2 className="text-xl font-bold">{providerCatalog.find((p) => p.id === active.provider)?.name || active.provider}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">Modelo:</span>
                  <span className="text-xs font-mono bg-background/50 px-2 py-0.5 rounded border">{active.model}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${activeMeta.cls}`}>
                    {activeMeta.label}
                  </span>
                  {active.hasApiKey ? (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 inline-flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> chave configurada
                    </span>
                  ) : activePosture !== "demo" && activePosture !== "local" && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-red-500/15 text-red-400">
                      sem chave
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Providers catalog */}
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Plug className="h-4 w-4" /> Catálogo Multi-AI ({providerCatalog.length} providers suportados)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {providerCatalog.map((p) => {
            const meta = postureMeta[p.posture]
            const isActive = active?.provider === p.id
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${isActive ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg" : "border-border bg-card"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`h-9 w-9 rounded-lg border flex items-center justify-center ${meta.cls}`}>
                    <meta.icon className="h-4 w-4" />
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-0.5">{p.name}</h3>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${meta.cls} inline-block mb-2`}>
                  {meta.label}
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{p.description}</p>
                <div className="text-[10px] text-muted-foreground border-t pt-2 mt-2">
                  <div className="font-semibold uppercase tracking-wider mb-1 opacity-70">Modelos</div>
                  <div className="flex flex-wrap gap-1">
                    {p.models.slice(0, 3).map((m) => (
                      <span key={m} className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">{m}</span>
                    ))}
                    {p.models.length > 3 && <span className="opacity-60">+{p.models.length - 3}</span>}
                  </div>
                  {p.envKey && <div className="mt-1.5 opacity-70">Auth: <span className="font-mono">{p.envKey}</span></div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Skills — what each agent does */}
      <div>
        <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" /> Skills Agênticas — o que cada motor faz
        </h2>
        <div className="space-y-3">
          {skills.map((s) => (
            <div key={s.name} className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/15 to-purple-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-lg">{s.name}</h3>
                    <span className="text-xs text-emerald-400 font-medium">· {s.tagline}</span>
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${statusBadge[s.status].cls}`}>
                      {statusBadge[s.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mb-3">{s.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Quando dispara</div>
                      <ul className="space-y-0.5">
                        {s.triggers.map((t) => (
                          <li key={t} className="flex items-start gap-1.5">
                            <ArrowRight className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Como funciona</div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{s.uses}</p>
                    </div>
                  </div>

                  {s.status === "shipped" && (
                    <Link href={s.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline">
                      Abrir Skill <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300/90">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" /> Como decidir o provider
        </div>
        Para dados confidenciais Caixa, prefira <b>GitHub Copilot/Models</b> (Unisys-approved) ou <b>Ollama Local</b> (zero egress).
        Externos (OpenAI/Anthropic/Google/Groq/DeepSeek) exigem aprovação CISO conforme Unisys AI P1.0.
        Skills usam o provider ativo automaticamente — basta trocar em <Link href="/configuracoes" className="underline">Configurações → Integrações → IA</Link>.
      </div>
    </div>
  )
}
