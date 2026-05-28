"use client"

import { Network, Plus, ListChecks, Brain } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"
import Link from "next/link"

const modelos = [
  { nome: "Caixa Internet Banking — Auth Flow", produto: "Caixa Internet Banking", ameacas: 23, mitigadas: 18, status: "Em revisão" },
  { nome: "PIX Core — Transação E2E", produto: "PIX Caixa Core", ameacas: 31, mitigadas: 27, status: "Aprovado" },
  { nome: "API Pagamentos — Auth Flow", produto: "WSO2 Pagamentos", ameacas: 19, mitigadas: 12, status: "Em revisão" },
  { nome: "Backoffice SIACI — Originação", produto: "Backoffice SIACI", ameacas: 15, mitigadas: 14, status: "Aprovado" },
]

export default function ThreatModelingPage() {
  return (
    <div>
      <PageHeader
        icon={Network}
        title="Threat Modeling"
        subtitle="Modelagem de ameaças com base de conhecimento por produto"
        description="STRIDE / PASTA / LINDDUN aplicado aos sistemas críticos da Caixa. RAG por produto garante recomendações alinhadas ao contexto técnico."
        actions={
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
            <Plus className="h-4 w-4" /> Novo Modelo
          </button>
        }
      />

      <StatGrid
        stats={[
          { label: "Modelos Ativos", value: modelos.length, icon: Network, tone: "success" },
          { label: "Ameaças Identificadas", value: modelos.reduce((a, m) => a + m.ameacas, 0), icon: Brain, tone: "warning" },
          { label: "Mitigadas", value: modelos.reduce((a, m) => a + m.mitigadas, 0), icon: ListChecks, tone: "info" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/threat-modeling/produtos" className="rounded-xl border bg-card p-5 hover:border-emerald-500/50 transition group">
          <Network className="h-6 w-6 text-emerald-400 mb-3" />
          <div className="font-semibold mb-1">Produtos TM</div>
          <div className="text-xs text-muted-foreground">Lista de produtos com modelos ativos</div>
        </Link>
        <Link href="/threat-modeling/requisitos" className="rounded-xl border bg-card p-5 hover:border-emerald-500/50 transition group">
          <ListChecks className="h-6 w-6 text-emerald-400 mb-3" />
          <div className="font-semibold mb-1">Requisitos de Segurança</div>
          <div className="text-xs text-muted-foreground">Backlog de controles derivados das ameaças</div>
        </Link>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Modelos Ativos</h3>
        </div>
        <div className="divide-y">
          {modelos.map((m) => (
            <div key={m.nome} className="p-4 flex items-center justify-between hover:bg-muted/30 transition cursor-pointer">
              <div>
                <div className="font-semibold text-sm">{m.nome}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{m.produto}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                  <div className="font-semibold text-sm">{Math.round((m.mitigadas / m.ameacas) * 100)}%</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                  m.status === "Aprovado" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                }`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
