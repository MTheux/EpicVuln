"use client"

import { useState, useEffect } from "react"
import { Smartphone, Shield, ShieldCheck, Loader2, Copy, CheckCircle2, AlertTriangle } from "lucide-react"
import { authHeaders } from "@/lib/auth"

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

export function MfaSetup() {
  const [status, setStatus] = useState<{ enabled: boolean; configured: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<"idle" | "setup" | "verify" | "done">("idle")
  const [setupData, setSetupData] = useState<{ qrPngDataUrl: string; secret: string; otpauthUri: string } | null>(null)
  const [code, setCode] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadStatus() }, [])

  const loadStatus = async () => {
    try {
      const r = await fetch(`${apiUrl()}/api/mfa/status`, { credentials: "include", headers: authHeaders() })
      if (r.ok) setStatus(await r.json())
    } catch {}
  }

  const startSetup = async () => {
    setLoading(true); setErr(null); setMsg(null)
    try {
      const r = await fetch(`${apiUrl()}/api/mfa/setup`, { method: "POST", credentials: "include", headers: authHeaders() })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setSetupData(data)
      setStage("verify")
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setErr("Código de 6 dígitos"); return }
    setLoading(true); setErr(null)
    try {
      const r = await fetch(`${apiUrl()}/api/mfa/verify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) throw new Error(data.error || "Código inválido")
      setStage("done"); setMsg("MFA ativado com sucesso! 🎉"); loadStatus()
      setCode(""); setSetupData(null)
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  const disable = async () => {
    if (!/^\d{6}$/.test(code)) { setErr("Confirme com seu código TOTP atual"); return }
    setLoading(true); setErr(null)
    try {
      const r = await fetch(`${apiUrl()}/api/mfa/disable`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) throw new Error(data.error || "Falha")
      setStage("idle"); setMsg("MFA desativado"); setCode(""); loadStatus()
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  const copySecret = () => {
    if (!setupData) return
    navigator.clipboard.writeText(setupData.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${status?.enabled ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-amber-500/15 border-amber-500/30 text-amber-400"}`}>
          {status?.enabled ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-sm">Autenticação em Dois Fatores (MFA)</h3>
          <p className="text-[11px] text-muted-foreground">
            {status?.enabled ? "✓ MFA ativo via TOTP (Google Authenticator, Authy, 1Password)" : "Adicione uma camada extra de segurança ao seu login"}
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2 mb-3 text-xs flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {err}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-2 mb-3 text-xs flex items-start gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {msg}
        </div>
      )}

      {!status?.enabled && stage === "idle" && (
        <button onClick={startSetup} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          Ativar MFA
        </button>
      )}

      {stage === "verify" && setupData && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold mb-3">1. Escaneie o QR Code no seu app autenticador:</p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <img src={setupData.qrPngDataUrl} alt="QR Code MFA" className="rounded-lg border bg-white" width={180} height={180} />
              <div className="flex-1 text-xs space-y-2">
                <p className="text-muted-foreground">Apps recomendados:</p>
                <ul className="list-disc list-inside space-y-0.5 text-foreground/80">
                  <li>Google Authenticator</li>
                  <li>Microsoft Authenticator</li>
                  <li>Authy</li>
                  <li>1Password</li>
                </ul>
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-[10px] mb-1">Chave manual (se não puder escanear):</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono bg-muted px-2 py-1 rounded break-all flex-1">{setupData.secret}</code>
                    <button onClick={copySecret} className="text-muted-foreground hover:text-foreground">
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold mb-2">2. Digite o código de 6 dígitos do app:</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123 456"
                inputMode="numeric"
                maxLength={6}
                className="flex-1 px-4 py-2 rounded-lg border bg-background text-lg font-mono tracking-[0.4em] text-center"
              />
              <button onClick={verify} disabled={loading || code.length !== 6} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar"}
              </button>
            </div>
          </div>

          <button onClick={() => { setStage("idle"); setSetupData(null); setCode(""); setErr(null) }} className="text-xs text-muted-foreground hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {status?.enabled && stage === "idle" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-300 mb-0.5">MFA TOTP ativo</div>
              <p className="text-emerald-200/80">Em cada login, você precisa do código do seu app autenticador.</p>
            </div>
          </div>
          <details className="rounded-lg border bg-background overflow-hidden">
            <summary className="px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:bg-muted/30">Desativar MFA (não recomendado)</summary>
            <div className="p-3 border-t space-y-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Código atual do app"
                inputMode="numeric"
                maxLength={6}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono"
              />
              <button onClick={disable} disabled={loading || code.length !== 6} className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition disabled:opacity-50">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Desativar MFA"}
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
