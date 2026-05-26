"use client"

import { useState } from "react"
import {
  FileText,
  TrendingUp,
  Trophy,
  CreditCard,
  Lock,
  Globe,
  ClipboardList,
  Search,
  FileSpreadsheet,
  FileDown,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}
const API_URL = getApiUrl()

interface HubCard {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  title: string
  description: string
  action: "navigate" | "export-pdf" | "export-excel" | "export-csv"
  href?: string
  comingSoon?: boolean
}

const sections: { title: string; cards: HubCard[] }[] = [
  {
    title: "Relatorios Executivos",
    cards: [
      {
        icon: FileText,
        iconColor: "text-red-400",
        iconBg: "bg-red-500/15",
        title: "Relatorio Executivo PDF",
        description: "Gera PDF para apresentacao ao board com Risk Score, tendencias e recomendacoes",
        action: "export-pdf",
      },
      {
        icon: Trophy,
        iconColor: "text-yellow-400",
        iconBg: "bg-yellow-500/15",
        title: "Comparacao por Squad",
        description: "Ranking de performance entre squads com MTTR, taxa de correcao e SLA",
        action: "navigate",
        href: "/relatorios/squads",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Compliance",
    cards: [
      {
        icon: CreditCard,
        iconColor: "text-purple-400",
        iconBg: "bg-purple-500/15",
        title: "PCI-DSS",
        description: "Mapeamento de vulnerabilidades que impactam requisitos PCI para operacoes com cartao",
        action: "navigate",
        href: "/relatorios/pci-dss",
        comingSoon: true,
      },
      {
        icon: Lock,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-500/15",
        title: "LGPD",
        description: "Vulnerabilidades relacionadas a dados pessoais e conformidade com a Lei Geral de Protecao de Dados",
        action: "navigate",
        href: "/relatorios/lgpd",
        comingSoon: true,
      },
      {
        icon: Globe,
        iconColor: "text-cyan-400",
        iconBg: "bg-cyan-500/15",
        title: "OWASP Top 10",
        description: "Distribuicao de vulnerabilidades por categoria OWASP Top 10",
        action: "navigate",
        href: "/relatorios/owasp",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Metricas & Operacional",
    cards: [
      {
        icon: ClipboardList,
        iconColor: "text-indigo-400",
        iconBg: "bg-indigo-500/15",
        title: "SLA Insights",
        description: "Vulnerabilidades vencidas, proximas do vencimento e compliance por squad",
        action: "navigate",
        href: "/relatorios/sla",
        comingSoon: true,
      },
      {
        icon: Search,
        iconColor: "text-slate-400",
        iconBg: "bg-slate-500/15",
        title: "Activity Log",
        description: "Historico de acoes realizadas no sistema por todos os usuarios",
        action: "navigate",
        href: "/relatorios/activity",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Exportacoes",
    cards: [
      {
        icon: FileSpreadsheet,
        iconColor: "text-green-400",
        iconBg: "bg-green-500/15",
        title: "Exportar Excel",
        description: "Planilha completa com todas as vulnerabilidades e metricas",
        action: "export-excel",
      },
      {
        icon: FileDown,
        iconColor: "text-teal-400",
        iconBg: "bg-teal-500/15",
        title: "Exportar CSV",
        description: "Export rapido para integracao com outras ferramentas",
        action: "export-csv",
      },
    ],
  },
]

export default function RelatoriosPage() {
  const [loadingCard, setLoadingCard] = useState<string | null>(null)
  const router = useRouter()

  const handleExport = async (format: "pdf" | "excel") => {
    const key = `export-${format}`
    setLoadingCard(key)
    try {
      const res = await fetch(`${API_URL}/api/reports/export/${format}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error("Falha ao gerar relatorio")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `epicvuln-relatorio-${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Relatorio ${format.toUpperCase()} baixado com sucesso!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingCard(null)
    }
  }

  const handleExportCSV = async () => {
    setLoadingCard("export-csv")
    try {
      const res = await fetch(`${API_URL}/api/reports/insights`, {
        headers: authHeaders(),
        credentials: 'include',
      })
      if (!res.ok) throw new Error("Falha ao carregar dados")
      const data = await res.json()

      const rows: string[][] = []
      rows.push(["Metrica", "Valor"])
      rows.push(["Total Abertas", String(data.resumo?.totalAberto ?? "")])
      rows.push(["Criticas", String(data.resumo?.totalExtremaCritica ?? "")])
      rows.push(["SLA Vencido", String(data.resumo?.totalSlaVencido ?? "")])
      rows.push(["Novas (30d)", String(data.resumo?.novasUltimos30d ?? "")])
      rows.push(["Fechadas (30d)", String(data.resumo?.fechadasUltimos30d ?? "")])
      rows.push(["Sem Responsavel", String(data.resumo?.semResponsavel ?? "")])
      rows.push(["Total Squads", String(data.resumo?.totalSquads ?? "")])

      if (data.topFalhas?.length) {
        rows.push([])
        rows.push(["Top Falhas", "Quantidade"])
        data.topFalhas.forEach((f: { label: string; count: number }) => {
          rows.push([f.label, String(f.count)])
        })
      }

      if (data.slowestSquads?.length) {
        rows.push([])
        rows.push(["Squad", "MTTR (dias)", "Resolvidas"])
        data.slowestSquads.forEach((s: { squad: string; mttrDays: number; resolved: number }) => {
          rows.push([s.squad, String(s.mttrDays), String(s.resolved)])
        })
      }

      const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `epicvuln-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("CSV exportado com sucesso!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingCard(null)
    }
  }

  const handleCardClick = (card: HubCard) => {
    if (card.action === "export-pdf") {
      handleExport("pdf")
    } else if (card.action === "export-excel") {
      handleExport("excel")
    } else if (card.action === "export-csv") {
      handleExportCSV()
    } else if (card.action === "navigate") {
      if (card.comingSoon) {
        toast.info("Em breve", {
          description: `A pagina "${card.title}" esta em desenvolvimento.`,
        })
      } else {
        router.push(card.href!)
      }
    }
  }

  const getCardLoadingKey = (card: HubCard): string | null => {
    if (card.action === "export-pdf") return "export-pdf"
    if (card.action === "export-excel") return "export-excel"
    if (card.action === "export-csv") return "export-csv"
    return null
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Relatorios & Compliance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Central de relatorios, metricas e conformidade regulatoria
        </p>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          {/* Section Header */}
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h2>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.cards.map((card) => {
              const Icon = card.icon
              const cardKey = getCardLoadingKey(card)
              const isLoading = cardKey !== null && loadingCard === cardKey

              return (
                <Card
                  key={card.title}
                  className="bg-card border-border cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 group"
                  onClick={() => !isLoading && handleCardClick(card)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                        {isLoading ? (
                          <Loader2 className={`h-5 w-5 animate-spin ${card.iconColor}`} />
                        ) : (
                          <Icon className={`h-5 w-5 ${card.iconColor}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
