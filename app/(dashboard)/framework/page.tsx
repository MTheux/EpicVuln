"use client"

import {
  Layers,
  Zap,
  Hammer,
  Glasses,
  ClipboardCheck,
  CheckCircle2,
  Sparkles,
  GitBranch,
  BookOpen,
  ShieldCheck,
  Bot,
  ArrowRight,
  ExternalLink,
  Award,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"

type SkillStatus = "shipped" | "next" | "planned"

interface Skill {
  name: string
  icon: any
  tagline: string
  description: string
  owasp?: string
  href?: string
  status: SkillStatus
  color: string
  inputs: string[]
  outputs: string[]
}

const skills: Skill[] = [
  {
    name: "Zekrom",
    icon: Zap,
    tagline: "DAST Copilot Orchestrator",
    description:
      "Ingere OpenAPI/Swagger (WSO2, URL, upload) e gera checklist OWASP por endpoint + payloads de exploração + prompt pack pronto pro GitHub Copilot.",
    owasp: "OWASP API 2023 + Web 2021",
    href: "/pentest/zekrom",
    status: "shipped",
    color: "from-emerald-500/30 to-purple-500/30 border-emerald-500/40",
    inputs: ["OpenAPI/Swagger", "URL alvo", "Token WSO2 (sessão)"],
    outputs: ["Plano OWASP por endpoint", "Payloads + cURL", "Copilot prompt pack (.md)"],
  },
  {
    name: "Forge",
    icon: Hammer,
    tagline: "Code Modernization Assistant",
    description:
      "Modernização assistida por IA — recebe código legado (COBOL, ASP.NET Framework, VB.NET, WebForms, Classic ASP) e gera versão equivalente em ASP.NET Core 8 com testes xUnit + diff de segurança SDL CIWEB. Eco direto do framework Unisys entregue à NI.",
    owasp: "SDL CIWEB · Refatoração segura",
    href: "/pentest/forge",
    status: "shipped",
    color: "from-orange-500/30 to-red-500/30 border-orange-500/40",
    inputs: ["Arquivo COBOL/legado", "Spec funcional", "Estilo Caixa"],
    outputs: ["Código C# equivalente", "Testes xUnit", "Diff de segurança + checklist review"],
  },
  {
    name: "Mirror",
    icon: Glasses,
    tagline: "Threat Modeling com RAG",
    description:
      "Threat modeling automatizado usando a Base de Conhecimento (docs Caixa, regulatórios BACEN/LGPD, padrões OWASP) via RAG real (pgvector). Aplica STRIDE / PASTA / LINDDUN com contexto de produto.",
    owasp: "ASVS V1 + ISO/IEC 27034",
    href: "/threat-modeling/mirror",
    status: "shipped",
    color: "from-purple-500/30 to-pink-500/30 border-purple-500/40",
    inputs: ["Diagrama de arquitetura", "Produto + contexto", "Docs RAG"],
    outputs: ["Ameaças por componente", "Attack tree", "Conformidade regulatória"],
  },
  {
    name: "Audit",
    icon: ClipboardCheck,
    tagline: "Compliance & LGPD/BACEN",
    description:
      "Audita aderência a LGPD, BACEN Res. 4658, PCI-DSS, OWASP ASVS e os 52 controles SDL CIWEB Caixa/Unisys. Aponta gaps com evidências e gera plano de remediação priorizado.",
    owasp: "LGPD · BACEN 4658 · SDL CIWEB",
    href: "/admin/audit",
    status: "shipped",
    color: "from-sky-500/30 to-blue-500/30 border-sky-500/40",
    inputs: ["Inventário de assets", "Findings ativos", "Controles esperados"],
    outputs: ["Matriz compliance", "Gaps + plano de ação", "Evidências auditáveis"],
  },
]

const statusBadge: Record<SkillStatus, { label: string; cls: string }> = {
  shipped: { label: "Entregue", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  next: { label: "Próxima", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  planned: { label: "Roadmap", cls: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
}

const principles = [
  {
    icon: Bot,
    title: "Skills agênticas especializadas",
    text: "Cada skill é um assistente focado num domínio (DAST, modernização, threat modeling). Eco do framework Unisys entregue à NI: assistentes generativos automatizando processos manuais.",
  },
  {
    icon: BookOpen,
    title: "Base de Conhecimento (RAG)",
    text: "Docs da Caixa, regulatórios BACEN/LGPD, padrões OWASP e código-fonte alimentam as skills via Retrieval-Augmented Generation. Equivalente ao 'trained on NI's existing code repository'.",
  },
  {
    icon: ShieldCheck,
    title: "Providers Unisys-Approved",
    text: "GitHub Copilot/Models como provider preferencial. Ollama local pra dados confidenciais. Conformidade Unisys AI P1.0 + NIST AI RMF.",
  },
  {
    icon: Wrench,
    title: "Developer-installable (roadmap)",
    text: "Extensão VSCode/Copilot Chat planejada — paralelo do plugin Eclipse entregue à NI. Permite self-service por todas as squads Caixa diretamente do IDE.",
  },
]

export default function FrameworkPage() {
  const skillsShipped = skills.filter((s) => s.status === "shipped").length
  const skillsRoadmap = skills.length - skillsShipped

  return (
    <div>
      <PageHeader
        icon={Layers}
        title="AISEC Framework"
        subtitle="Framework agêntico de IA para AppSec & ASPM — alinhado à prática Unisys reconhecida"
        badge="Arquitetura"
        description="Coleção de skills de IA especializadas, RAG sobre conhecimento Caixa, providers governados pela política Unisys AI P1.0 e integração de IDE. Mesma filosofia de framework agêntico que a Unisys já entregou em modernização de aplicações (case NI · award Avasant)."
      />

      {/* Hero / NI parallel */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-purple-500/5 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Award className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Alinhado à prática Unisys já reconhecida pelo mercado</h2>
            <p className="text-sm text-muted-foreground mb-3">
              A Unisys foi <a href="https://www.unisys.com/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">reconhecida pela Avasant <ExternalLink className="h-3 w-3" /></a> como Innovator em Application Modernization Services. O case público da NI mostra um <b>framework agêntico de IA</b> construído pela Unisys que modernizou 90+ aplicações em 11 meses, com OpenAI Assistants/GPT-4o, treinado no repositório de código do cliente e empacotado como plugin Eclipse self-service.
            </p>
            <p className="text-sm text-muted-foreground">
              O <b>AISEC</b> adota a mesma filosofia, mas aplicada à <b>AppSec & ASPM</b> da Caixa: framework agêntico, RAG sobre conhecimento do cliente, providers governados, integração de IDE.
            </p>
          </div>
        </div>

        {/* Parallel table */}
        <div className="mt-6 rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
            <div className="p-3 border-r">NI Framework (modernização)</div>
            <div className="p-3">AISEC Framework (AppSec/ASPM)</div>
          </div>
          {[
            ["Assistentes generativos automatizando processos manuais", "Skills agênticas (Zekrom, Forge, Mirror, Audit) por domínio"],
            ["OpenAI Assistants + GPT-4o", "Multi-provider: GitHub Models (approved), Ollama (local), demo, externos"],
            ["Treinado no repositório de código existente da NI", "RAG sobre Base de Conhecimento Caixa (docs, regulatórios, código)"],
            ["Plugin Eclipse developer-installable, self-service", "Extensão VSCode/Copilot (roadmap) — squads instalam direto"],
            ["Privacy & security protocols rigorosos da NI", "Unisys AI P1.0 · NIST AI RMF · Provider posture (approved/local/external)"],
            ["Isolated modernization approach", "Tenant isolation + token apenas em sessão + zero data egress (Ollama default)"],
            ["90+ apps modernizadas em 11 meses", "20+ findings ativos · 5 squads SIACI · 52 controles SDL CIWEB"],
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-t text-sm">
              <div className="p-3 border-r text-muted-foreground">{row[0]}</div>
              <div className="p-3 text-foreground">{row[1]}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-[10px] text-muted-foreground italic">
          Conteúdo derivado de informações públicas do client story Unisys/NI. Não expõe IP confidencial.
        </div>
      </div>

      {/* Principles */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          Princípios do Framework
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {principles.map((p) => (
            <div key={p.title} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <p.icon className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm">{p.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills roadmap */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            Roadmap de Skills
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-semibold">{skillsShipped} entregue</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-amber-400 font-semibold">{skillsRoadmap} em roadmap</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.map((s) => {
            const Inner = (
              <div className={`rounded-xl border-2 bg-gradient-to-br ${s.color} p-5 h-full flex flex-col ${s.status === "shipped" ? "cursor-pointer hover:scale-[1.02] transition" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-background/40 border flex items-center justify-center">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${statusBadge[s.status].cls}`}>
                    {statusBadge[s.status].label}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-0.5">{s.name}</h3>
                <p className="text-xs font-medium text-emerald-300 mb-2">{s.tagline}</p>
                <p className="text-xs text-foreground/80 leading-relaxed mb-3 flex-1">{s.description}</p>

                {s.owasp && (
                  <p className="text-[10px] font-mono bg-sky-500/15 text-sky-300 px-2 py-1 rounded mb-2 self-start">
                    {s.owasp}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] mt-2 pt-2 border-t border-foreground/10">
                  <div>
                    <div className="font-bold uppercase tracking-wider opacity-60 mb-1">Inputs</div>
                    <ul className="space-y-0.5">
                      {s.inputs.map((i) => (
                        <li key={i} className="opacity-90">· {i}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wider opacity-60 mb-1">Outputs</div>
                    <ul className="space-y-0.5">
                      {s.outputs.map((o) => (
                        <li key={o} className="opacity-90">· {o}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {s.href && (
                  <div className="mt-3 pt-2 border-t border-foreground/10 flex items-center justify-end text-xs font-semibold text-emerald-300">
                    Abrir skill <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                )}
              </div>
            )
            return s.href ? (
              <Link key={s.name} href={s.href} className="block h-full">{Inner}</Link>
            ) : (
              <div key={s.name} className="h-full">{Inner}</div>
            )
          })}
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-emerald-400" />
          Arquitetura
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Fluxo de uma chamada típica do framework</p>

        <div className="space-y-3">
          <FlowStep n="1" title="Pentester invoca skill" desc="Ex: Zekrom recebe Swagger → pede plano OWASP" />
          <FlowStep n="2" title="AISEC injeta core context" desc="Sistema unificado prepend em todas chamadas: cliente Caixa, stack ASP.NET/COBOL/WSO2, squads SIACI, frameworks (OWASP, NIST, BACEN, LGPD), guardrails Unisys AI P1.0" />
          <FlowStep n="3" title="Skill enriquece com RAG" desc="Recupera trechos relevantes da Base de Conhecimento (docs Caixa, padrões SDL CIWEB, código produto)" />
          <FlowStep n="4" title="Provider executa" desc="Roteia pro provider configurado: GitHub Models (approved), Ollama (local), demo (mocks), externos com restrição" />
          <FlowStep n="5" title="Output rotulado + logged" desc="Resposta marcada 'Content Created By/With Use of AI'. Chain-of-thought + decisões logados em /admin/logs-ia. Pentester aprova/descarta." />
        </div>
      </div>
    </div>
  )
}

function FlowStep({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
        {n}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  )
}
