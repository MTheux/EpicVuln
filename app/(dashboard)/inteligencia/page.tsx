"use client"
import { Brain } from "lucide-react"

export default function InteligenciaPage() {
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <Brain className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Inteligência Artificial</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Motor de IA para análise de vulnerabilidades, geração de relatórios e recomendações inteligentes.
        </p>
        <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5">
          <span className="text-xs font-medium text-emerald-500">Em breve</span>
        </div>
      </div>
    </div>
  )
}
