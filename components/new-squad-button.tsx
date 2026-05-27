"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authHeaders } from "@/lib/auth"
import { toast } from "sonner"

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

const STORAGE_KEY = "aisec_custom_squads"

interface CustomSquad {
  name: string
  tribo?: string
  po?: string
  techLead?: string
  appSec?: string
  sre?: string
  createdAt: string
}

/** Lista todas squads cadastradas — usado pelo Nova Vulnerabilidade dropdown */
export function loadAllSquads(): string[] {
  const fromVulns: string[] = []
  // Lista hardcoded base (vinda das vulns seed)
  const baseList = [
    "NM182 - Originação e Entrada de Dados - SIACI",
    "NM177 - Financeiro e Garantias - SIACI",
    "NM180 - Portais e Serviços - SIACI",
    "NM181 - Evolução - SIACI",
    "NM176 - Recursos e Componentes - SIACI",
  ]
  let custom: CustomSquad[] = []
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) custom = JSON.parse(raw)
    } catch {}
  }
  return Array.from(new Set([...baseList, ...fromVulns, ...custom.map((c) => c.name)]))
}

export function NewSquadButton({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CustomSquad>({
    name: "",
    tribo: "",
    po: "",
    techLead: "",
    appSec: "",
    sre: "",
    createdAt: "",
  })

  const reset = () => setForm({ name: "", tribo: "", po: "", techLead: "", appSec: "", sre: "", createdAt: "" })

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Nome da squad é obrigatório")
      return
    }
    setLoading(true)
    try {
      // Persiste localmente (não há endpoint dedicado pra squad cadastro hoje — squads emergem das vulns)
      const all = loadAllSquads()
      if (all.includes(form.name)) {
        toast.error("Já existe squad com esse nome")
        setLoading(false)
        return
      }
      const list: CustomSquad[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
      list.push({ ...form, createdAt: new Date().toISOString() })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
      toast.success(`Squad "${form.name}" cadastrada`)
      reset()
      setOpen(false)
      onCreated?.()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
      >
        <Plus className="mr-2 h-4 w-4" /> Nova Squad
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-base">Cadastrar nova squad</h3>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nome da squad *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: NM183 - Nova Squad - SIACI"
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tribo</label>
                  <input
                    value={form.tribo}
                    onChange={(e) => setForm({ ...form, tribo: e.target.value })}
                    placeholder="Ex: SIACI"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PO</label>
                  <input
                    value={form.po}
                    onChange={(e) => setForm({ ...form, po: e.target.value })}
                    placeholder="Nome do PO"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tech Lead</label>
                  <input
                    value={form.techLead}
                    onChange={(e) => setForm({ ...form, techLead: e.target.value })}
                    placeholder="Nome do Tech Lead"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AppSec</label>
                  <input
                    value={form.appSec}
                    onChange={(e) => setForm({ ...form, appSec: e.target.value })}
                    placeholder="Nome do AppSec"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SRE</label>
                  <input
                    value={form.sre}
                    onChange={(e) => setForm({ ...form, sre: e.target.value })}
                    placeholder="Nome do SRE"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground italic">
                Squad fica disponível imediatamente no dropdown de "Nova Vulnerabilidade".
                Cadastro local (browser) — para persistir em DB use rota /api/squads.
              </p>
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={loading || !form.name.trim()}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Check className="mr-2 h-3 w-3" />}
                Cadastrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
