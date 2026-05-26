"use client"
import { Building2, Plus } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const empresas = [
  { nome: "Caixa Econômica Federal", slug: "caixa", users: 47, vulns: 384, plan: "Enterprise", status: "Ativo" },
  { nome: "Unisys Brasil (interna)", slug: "unisys", users: 12, vulns: 27, plan: "Internal", status: "Ativo" },
]

export default function AdminEmpresasPage() {
  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Empresas (Multi-tenant)"
        subtitle="Governança de tenants e licenciamento"
        description="Gestão multi-tenant com isolamento, escopo de integração, escopo de IA e ciclo de vida de licença."
        actions={
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
            <Plus className="h-4 w-4" /> Nova Empresa
          </button>
        }
      />
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Empresa</th>
              <th className="text-left p-3 font-medium">Slug</th>
              <th className="text-center p-3 font-medium">Usuários</th>
              <th className="text-center p-3 font-medium">Vulns</th>
              <th className="text-left p-3 font-medium">Plano</th>
              <th className="text-right p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.slug} className="border-t hover:bg-muted/30 transition cursor-pointer">
                <td className="p-3 font-semibold">{e.nome}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{e.slug}</td>
                <td className="p-3 text-center tabular-nums">{e.users}</td>
                <td className="p-3 text-center tabular-nums">{e.vulns}</td>
                <td className="p-3 text-xs">{e.plan}</td>
                <td className="p-3 text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
