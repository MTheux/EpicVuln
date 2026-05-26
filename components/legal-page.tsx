import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"

export function LegalPage({
  icon, title, subtitle, updatedAt, children,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  updatedAt: string
  children: React.ReactNode
}) {
  return (
    <div>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        description={`Última atualização: ${updatedAt} · AISEC · Caixa Econômica Federal`}
      />

      <div className="rounded-xl border bg-card p-8 max-w-4xl prose prose-sm prose-invert prose-headings:text-emerald-400 prose-headings:font-bold prose-h2:text-base prose-h2:uppercase prose-h2:tracking-wider prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-sm prose-h3:mt-5 prose-p:text-foreground/85 prose-p:leading-relaxed prose-li:text-foreground/85 prose-li:leading-relaxed prose-strong:text-foreground prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline">
        {children}
      </div>

      <div className="mt-4 text-xs text-muted-foreground flex flex-wrap items-center gap-3 max-w-4xl">
        <span>Páginas legais:</span>
        <Link href="/legal/privacidade" className="hover:text-emerald-400 hover:underline">Política de Privacidade</Link>
        <span>·</span>
        <Link href="/legal/termos" className="hover:text-emerald-400 hover:underline">Termos de Serviço</Link>
        <span>·</span>
        <Link href="/legal/sub-processadores" className="hover:text-emerald-400 hover:underline">Sub-processadores</Link>
      </div>
    </div>
  )
}
