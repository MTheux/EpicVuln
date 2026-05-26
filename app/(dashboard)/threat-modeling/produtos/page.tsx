"use client"
import { Package } from "lucide-react"
import { PageHeader } from "@/components/page-header"

export default function TMProdutosPage() {
  return (
    <div>
      <PageHeader
        icon={Package}
        title="Produtos de Threat Modeling"
        subtitle="Produtos com modelagem de ameaças ativa"
        description="Selecione um produto para visualizar modelos, ameaças identificadas e status de mitigação."
      />
      <div className="rounded-xl border bg-card p-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Navegue por produto via <span className="font-semibold text-foreground">Threat Modeling → Painel TM</span></p>
      </div>
    </div>
  )
}
