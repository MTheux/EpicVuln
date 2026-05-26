"use client"
import { Server, ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"

interface SubProcessor {
  categoria: string
  fornecedor: string
  finalidade: string
  localizacao: string
  certificacoes: string[]
  dpa: boolean
}

const SUB_PROCESSADORES: SubProcessor[] = [
  {
    categoria: "Provedor de Cloud",
    fornecedor: "AWS / Azure (multi-cloud, infra-as-code)",
    finalidade: "Hospedagem da plataforma, computação, armazenamento e backups. Bancos de dados PostgreSQL gerenciados.",
    localizacao: "Brasil (São Paulo) — primário · Estados Unidos (us-east-1) — DR",
    certificacoes: ["ISO 27001", "ISO 27017", "ISO 27018", "SOC 2 Type II", "PCI-DSS"],
    dpa: true,
  },
  {
    categoria: "Provedor de IA / LLM (Unisys-Approved)",
    fornecedor: "GitHub Models / Microsoft Copilot Infrastructure",
    finalidade: "Motor IA do AISEC — geração de épicos, análises STRIDE, plano OWASP, HackBot. Retenção 0 dias (no-data-retention agreement).",
    localizacao: "Estados Unidos (multi-region)",
    certificacoes: ["SOC 2 Type II", "ISO 27001", "ISO 27018"],
    dpa: true,
  },
  {
    categoria: "Provedor de IA / LLM (Local)",
    fornecedor: "Ollama (self-hosted, on-prem)",
    finalidade: "Motor IA local com zero data egress. Modelos llama3.2-vision, nomic-embed-text para RAG.",
    localizacao: "On-premise — Datacenter Caixa / Unisys",
    certificacoes: ["N/A — self-hosted"],
    dpa: false,
  },
  {
    categoria: "CDN / WAF",
    fornecedor: "Cloudflare Enterprise",
    finalidade: "Distribuição de conteúdo, proteção DDoS, Web Application Firewall, bot management.",
    localizacao: "Global (300+ PoPs)",
    certificacoes: ["ISO 27001", "SOC 2 Type II", "PCI-DSS L1"],
    dpa: true,
  },
  {
    categoria: "Processamento de Pagamentos",
    fornecedor: "N/A — AISEC não processa pagamentos",
    finalidade: "Não aplicável. Plataforma é interna Unisys/Caixa, não cobra usuário final.",
    localizacao: "—",
    certificacoes: [],
    dpa: false,
  },
  {
    categoria: "Email Transacional",
    fornecedor: "Amazon SES (us-east-1)",
    finalidade: "Notificações operacionais (SLA, escalation, alertas), comunicação com usuários administradores.",
    localizacao: "Estados Unidos",
    certificacoes: ["ISO 27001", "SOC 2 Type II"],
    dpa: true,
  },
  {
    categoria: "Tracker (Issue Management)",
    fornecedor: "IBM RTC (Rational Team Concert)",
    finalidade: "Sincronização bidirecional de findings de pentest → épicos RTC da Caixa. Único tracker aprovado.",
    localizacao: "On-premise Caixa",
    certificacoes: ["Auditoria interna Caixa"],
    dpa: true,
  },
  {
    categoria: "Tracker (Issue Management) — Opcional",
    fornecedor: "Atlassian Jira (Cloud)",
    finalidade: "Sincronização opcional pra equipes que usam Jira além do RTC. Configuração via Hub de Integrações.",
    localizacao: "Estados Unidos (Atlassian Cloud)",
    certificacoes: ["ISO 27001", "SOC 2 Type II", "FedRAMP Moderate"],
    dpa: true,
  },
  {
    categoria: "Notificação",
    fornecedor: "Microsoft Teams (Incoming Webhook)",
    finalidade: "Notificação de findings críticos, mudanças de SLA, alertas operacionais em canais Teams configurados.",
    localizacao: "Estados Unidos / União Europeia (M365 tenant)",
    certificacoes: ["ISO 27001", "SOC 2 Type II", "EU Data Boundary"],
    dpa: true,
  },
  {
    categoria: "SAST (Source Code Analysis)",
    fornecedor: "SonarQube Enterprise",
    finalidade: "Análise estática de código-fonte das aplicações Caixa (ASP.NET, COBOL). Ingestão de findings via API.",
    localizacao: "On-premise Caixa",
    certificacoes: ["Auditoria interna Caixa"],
    dpa: true,
  },
  {
    categoria: "Threat Intelligence",
    fornecedor: "NVD API 2.0 (NIST)",
    finalidade: "Enriquecimento de CVEs com dados de severidade, exploit availability e KEV (Known Exploited Vulnerabilities).",
    localizacao: "Estados Unidos (gov)",
    certificacoes: ["FedRAMP"],
    dpa: false,
  },
]

const localizacaoColor: Record<string, string> = {
  brasil: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "on-premise": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "estados unidos": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "união europeia": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  global: "bg-violet-500/15 text-violet-400 border-violet-500/30",
}

function locColor(loc: string) {
  const lower = loc.toLowerCase()
  for (const [key, cls] of Object.entries(localizacaoColor)) {
    if (lower.includes(key)) return cls
  }
  return "bg-slate-500/15 text-slate-400 border-slate-500/30"
}

export default function SubProcessadoresPage() {
  return (
    <div>
      <PageHeader
        icon={Server}
        title="Sub-processadores"
        subtitle="Categorias, finalidades e localização de processamento"
        description={`Lista de operadores subcontratados que processam dados em nome da Unisys/Caixa. Última revisão: 24 de Maio de 2026. Total: ${SUB_PROCESSADORES.length} sub-processadores.`}
      />

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4 text-xs leading-relaxed">
        <p>
          <strong className="text-emerald-300">Conformidade LGPD Art. 39 + GDPR Art. 28:</strong> Todos os sub-processadores listados possuem Acordo de Processamento de Dados (DPA) com cláusulas contratuais padrão, e operam sob obrigação de notificar incidentes no prazo legal.
        </p>
        <p className="mt-2 text-emerald-200/80">
          Alterações nesta lista são notificadas com 30 dias de antecedência conforme cláusula 5.3 do contrato Unisys ↔ Caixa.
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-left p-3 font-medium">Fornecedor</th>
                <th className="text-left p-3 font-medium">Finalidade</th>
                <th className="text-left p-3 font-medium">Localização</th>
                <th className="text-center p-3 font-medium">DPA</th>
              </tr>
            </thead>
            <tbody>
              {SUB_PROCESSADORES.map((s, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition">
                  <td className="p-3 align-top">
                    <div className="font-semibold text-foreground text-xs">{s.categoria}</div>
                  </td>
                  <td className="p-3 align-top">
                    <div className="font-mono text-xs">{s.fornecedor}</div>
                    {s.certificacoes.length > 0 && s.certificacoes[0] !== "N/A — self-hosted" && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.certificacoes.slice(0, 3).map((c) => (
                          <span key={c} className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3 align-top text-xs text-muted-foreground leading-relaxed max-w-md">{s.finalidade}</td>
                  <td className="p-3 align-top">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${locColor(s.localizacao)}`}>
                      {s.localizacao.split('—')[0].trim()}
                    </span>
                    {s.localizacao.includes("—") && (
                      <div className="text-[10px] text-muted-foreground mt-1">{s.localizacao.split('—').slice(1).join('—').trim()}</div>
                    )}
                  </td>
                  <td className="p-3 align-top text-center">
                    {s.dpa ? (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">✓</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" /> Princípios aplicados
          </h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>• <strong>Data minimization</strong> — só compartilhamos o estritamente necessário</li>
            <li>• <strong>Purpose limitation</strong> — uso restrito à finalidade contratada</li>
            <li>• <strong>Transparência</strong> — esta lista é pública e versionada</li>
            <li>• <strong>Direito de objeção</strong> — Caixa pode vetar sub-processador novo</li>
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" /> Onde NÃO temos sub-processador
          </h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>• <strong>Análise de IA local</strong> — Ollama on-prem (zero egress)</li>
            <li>• <strong>JWT Inspector</strong> — 100% client-side, token nunca sai do browser</li>
            <li>• <strong>Checklist OWASP</strong> — progresso em localStorage</li>
            <li>• <strong>HackBot demo mode</strong> — respostas mock sem rede</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
        <span>Páginas legais:</span>
        <Link href="/legal/privacidade" className="hover:text-emerald-400 hover:underline">Política de Privacidade</Link>
        <span>·</span>
        <Link href="/legal/termos" className="hover:text-emerald-400 hover:underline">Termos de Serviço</Link>
        <span>·</span>
        <span>Versão 1.2 · 2026-05-24</span>
        <a href="mailto:privacy@unisys.com" className="hover:text-emerald-400 hover:underline ml-auto inline-flex items-center gap-1">
          Reportar inconsistência <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
