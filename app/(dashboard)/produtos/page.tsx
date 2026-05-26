"use client"

import { Package, Plus, Search, GitBranch, ShieldAlert, Activity } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"

const produtos = [
  { nome: "SIACI — Originação", squad: "NM182 - Originação e Entrada de Dados - SIACI", repos: 8, vulns: 15, criticas: 3, status: "Ativo", criticidade: "CRITICAL" },
  { nome: "SIACI — Financeiro", squad: "NM177 - Financeiro e Garantias - SIACI", repos: 6, vulns: 11, criticas: 2, status: "Ativo", criticidade: "CRITICAL" },
  { nome: "SIACI — Portais e Serviços", squad: "NM180 - Portais e Serviços - SIACI", repos: 5, vulns: 9, criticas: 1, status: "Ativo", criticidade: "HIGH" },
  { nome: "SIACI — Evolução", squad: "NM181 - Evolução - SIACI", repos: 4, vulns: 1, criticas: 0, status: "Ativo", criticidade: "MEDIUM" },
  { nome: "SIACI — Recursos e Componentes", squad: "NM176 - Recursos e Componentes - SIACI", repos: 7, vulns: 1, criticas: 0, status: "Ativo", criticidade: "MEDIUM" },
]

const criticidadeBadge: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

export default function ProdutosPage() {
  return (
    <div>
      <PageHeader
        icon={Package}
        title="Produtos"
        subtitle="Contexto de negócio que agrupa repositórios"
        description="Cada produto representa um sistema da Caixa (ex: Internet Banking, PIX Core). Repositórios e findings são associados ao produto para visão de portfólio."
        actions={
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
            <Plus className="h-4 w-4" /> Novo Produto
          </button>
        }
      />

      <StatGrid
        stats={[
          { label: "Produtos Ativos", value: produtos.length, icon: Package, tone: "default" },
          { label: "Repositórios", value: produtos.reduce((a, p) => a + p.repos, 0), icon: GitBranch, tone: "info" },
          { label: "Vulnerabilidades", value: produtos.reduce((a, p) => a + p.vulns, 0), icon: ShieldAlert, tone: "warning" },
          { label: "Críticas Abertas", value: produtos.reduce((a, p) => a + p.criticas, 0), icon: Activity, tone: "danger" },
        ]}
      />

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Portfólio de Produtos</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar produto..."
              className="pl-9 pr-3 py-1.5 rounded-lg border bg-background text-sm w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Produto</th>
                <th className="text-left p-3 font-medium">Squad</th>
                <th className="text-center p-3 font-medium">Repos</th>
                <th className="text-center p-3 font-medium">Vulns</th>
                <th className="text-center p-3 font-medium">Críticas</th>
                <th className="text-center p-3 font-medium">Criticidade</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.nome} className="border-t hover:bg-muted/30 transition cursor-pointer">
                  <td className="p-3 font-medium">{p.nome}</td>
                  <td className="p-3 text-muted-foreground text-xs">{p.squad}</td>
                  <td className="p-3 text-center tabular-nums">{p.repos}</td>
                  <td className="p-3 text-center tabular-nums">{p.vulns}</td>
                  <td className="p-3 text-center">
                    {p.criticas > 0 ? (
                      <span className="text-red-500 font-semibold">{p.criticas}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${criticidadeBadge[p.criticidade]}`}>
                      {p.criticidade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
